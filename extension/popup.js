import { postSessionCheck } from "./apiWrapper.js";
import { postConversationUpload } from "./apiWrapper.js";
import { fetchAllSessions } from "./apiWrapper.js";
import { getContextAndDegradation } from "./apiWrapper.js";

// Utility: Extract service name and conversation ID from a URL
function inferServiceAndConversationId(urlString) {
  const url = new URL(urlString);
  const hostname = url.hostname;
  const pathSegments = url.pathname.split("/");

  let service = "";
  let conversationId = "";

  if (hostname.includes("chatgpt.com")) {
    service = "chatgpt";
    conversationId = pathSegments[2] || "";
  } else if (hostname.includes("claude.ai")) {
    service = "claude";
    conversationId = pathSegments[2] || "";
  } else if (hostname.includes("gemini.google.com")) {
    service = "gemini";
    conversationId = pathSegments[2] || "";
  }

  return { service, conversationId };
}

// Listener: Handles messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "conversation_scraped") {
    const { service, conversationId, data } = message;
    console.log("Received scraped conversation data:", data);

    // Upload conversation data to backend
    postConversationUpload(service, conversationId, data).then((result) => {
      if (result.success) {
        console.log("Conversation uploaded successfully.");
      } else {
        console.error("Upload failed:", result.error);
      }
    });

    return true; // Keep sendResponse alive for async work
  }
});

// Main: Runs when popup is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup loaded");

  // Get the active tab and extract service + conversation ID from the URL
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const { service, conversationId } = inferServiceAndConversationId(tabs[0].url);

    console.log("Detected service:", service);
    console.log("Detected conversation ID:", conversationId);

    if (!service || !conversationId) {
      console.log("Could not detect service or conversation ID from URL.");
      return;
    }

    const key = `${service}:${conversationId}`;

    // Step 1: Check if the session exists in local storage or via API
    chrome.storage.local.get([key], async (result) => {
      let sessionExists = false;
      let htmlFile = null;
      let scriptFile = null;

      console.log("Checking local storage for session key:", key);

      if (result[key]) {
        console.log("Session found in local storage.");
        sessionExists = true;
      } else {
        console.log("Session not found in local storage. Checking via API...");
        sessionExists = await postSessionCheck(conversationId, service);
        console.log(sessionExists ? "Session found via API." : "New session detected via API.");
      }

      // Step 2: Choose which UI to load (existing vs new session)
      htmlFile = sessionExists ? "views/existingSession.html" : "views/newSession.html";
      scriptFile = sessionExists ? "scripts/existingSession.js" : "scripts/newSession.js";

      // Step 3: Inject the selected HTML UI into the popup
      const html = await fetch(chrome.runtime.getURL(htmlFile)).then((r) => r.text());
      document.getElementById("app").innerHTML = html;

      // Step 4: Attach the related script
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL(scriptFile);
      script.type = "module";
      document.body.appendChild(script);

      // Step 5: If session exists, fetch and render context + degradation info + session list
      if (sessionExists) {
        // Fetch list of all sessions
        const sessionsRes = await fetchAllSessions();
        if (sessionsRes.success) {
          const listContainer = document.getElementById("session-list");
          if (listContainer) {
            sessionsRes.sessions.forEach(({ sessionId, sessionName }) => {
              const li = document.createElement("li");
              li.textContent = `${sessionName} (${sessionId})`;
              listContainer.appendChild(li);
            });
          }
        }

        // Fetch context and degradation score for the current conversation
        const ctxRes = await getContextAndDegradation(service, conversationId);
        if (ctxRes.success) {
          const contextEl = document.getElementById("context-block");
          const degradationEl = document.getElementById("degradation-score");
          const idEl = document.getElementById("conversation-id");

          if (contextEl) contextEl.textContent = ctxRes.context;
          if (degradationEl)
            degradationEl.textContent = `Degradation: ${ctxRes.degradationFactor.toFixed(2)}`;
          if (idEl) idEl.textContent = conversationId;
        } else {
          console.error("Failed to fetch context and degradation.");
        }
      }
    });
  });
});
