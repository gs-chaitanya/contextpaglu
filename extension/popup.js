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

export async function getSessionIdFromKey(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
        return;
      }
      resolve(result[key] || null);
    });
  });
}

// Utility: Copy text to clipboard with visual feedback
async function copyToClipboard(text, buttonElement) {
  try {
    await navigator.clipboard.writeText(text);

    // Visual feedback
    const originalText = buttonElement.querySelector(
      ".session-copy-button-text"
    ).textContent;
    buttonElement.classList.add("copied");
    buttonElement.querySelector(".session-copy-button-text").textContent =
      "Copied!";

    setTimeout(() => {
      buttonElement.classList.remove("copied");
      buttonElement.querySelector(".session-copy-button-text").textContent =
        originalText;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy text: ", err);
  }
}

// Utility: Create a properly formatted session list item
function createSessionListItem(sessionName, context) {
  const li = document.createElement("li");
  li.className = "session-item";

  // Create checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "session-checkbox";

  // Create session icon
  const iconDiv = document.createElement("div");
  iconDiv.className = "session-icon";
  iconDiv.textContent = "🤖";

  // Create session details container
  const detailsDiv = document.createElement("div");
  detailsDiv.className = "session-details";

  // Create session name
  const sessionNameDiv = document.createElement("div");
  sessionNameDiv.className = "session-name";
  sessionNameDiv.textContent = sessionName;

  // Create session ID (using context as ID)
  const sessionIdDiv = document.createElement("div");
  sessionIdDiv.className = "session-id";
  sessionIdDiv.textContent =
    context.length > 50 ? context.substring(0, 50) + "..." : context;

  // Create session service label (optional)
  const sessionServiceDiv = document.createElement("div");
  sessionServiceDiv.className = "session-service";
  sessionServiceDiv.textContent = "AI Assistant";

  // Append elements to details container
  detailsDiv.appendChild(sessionNameDiv);
  detailsDiv.appendChild(sessionIdDiv);
  detailsDiv.appendChild(sessionServiceDiv);

  // Create individual copy button for this session
  const copyButton = document.createElement("button");
  copyButton.className = "session-copy-button";
  copyButton.innerHTML = `
    <span class="session-copy-button-icon">📋</span>
    <span class="session-copy-button-text">Copy</span>
  `;

  // Add copy functionality
  copyButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(context, copyButton);
  });

  // Add click handler for the entire item (optional selection behavior)
  li.addEventListener("click", (e) => {
    if (
      e.target !== checkbox &&
      e.target !== copyButton &&
      !copyButton.contains(e.target)
    ) {
      checkbox.checked = !checkbox.checked;
      li.classList.toggle("selected", checkbox.checked);
    }
  });

  // Add checkbox change handler
  checkbox.addEventListener("change", () => {
    li.classList.toggle("selected", checkbox.checked);
  });

  // Final assembly
  li.appendChild(checkbox);
  li.appendChild(iconDiv);
  li.appendChild(detailsDiv);
  li.appendChild(copyButton);

  return li;
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "conversation_scraped") {
    const { service, conversationId, data } = message;
    const key = `${service}:${conversationId}`;
    let sessionId = null;
    async function myCallerFunction() {
   sessionId = await getSessionIdFromKey(key);
  console.log("Session ID:", sessionId);
}
await myCallerFunction();
  // destructure sessionId and data from message
    console.log("Received conversation data for session:", sessionId);
    console.log(data);
    postConversationUpload(sessionId, data).then((result) => {
      if (result.success) {
        console.log("Conversation uploaded successfully.");
      } else {
        console.error("Upload failed:", result.error);
      }
    });

    return true; // Keep sendResponse alive for async response if needed
  }
});


// Main: Runs when popup is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup loaded");

  // Get the active tab and extract service + conversation ID from the URL
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const { service, conversationId } = inferServiceAndConversationId(
      tabs[0].url
    );

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
        console.log(
          sessionExists
            ? "Session found via API."
            : "New session detected via API."
        );
        if (sessionExists) {
          chrome.storage.local.set({
            [key]: sessionId,
            service,
            conversationId,
            sessionName,
          });
        }
      }

      // Step 2: Choose which UI to load (existing vs new session)
      htmlFile = sessionExists
        ? "views/existingSession.html"
        : "views/newSession.html";
      scriptFile = sessionExists
        ? "scripts/existingSession.js"
        : "scripts/newSession.js";

      // Step 3: Inject the selected HTML UI into the popup
      const html = await fetch(chrome.runtime.getURL(htmlFile)).then((r) =>
        r.text()
      );
      document.getElementById("app").innerHTML = html;

      // Step 4: Attach the related script
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL(scriptFile);
      script.type = "module";
      document.body.appendChild(script);

      // Step 5: Wait for DOM to be ready, then populate data
      setTimeout(async () => {
        if (sessionExists) {
          // Fetch context and degradation score for the current conversation
          const { service, conversationId } = inferServiceAndConversationId(
            tabs[0].url
          );
          const key = `${service}:${conversationId}`;
          const sessionId = await getSessionIdFromKey(key);
          const ctxRes = await getContextAndDegradation(
            sessionId
          );
          if (ctxRes.success) {
            const contextEl = document.getElementById("context-block");
            const degradationEl = document.getElementById("degradation-score");
            const idEl = document.getElementById("conversation-id");
            console.log(sessionId);
            console.log(ctxRes);
            if (contextEl) contextEl.textContent = ctxRes.context;
            if (degradationEl)
              degradationEl.textContent = `${ctxRes.degradationFactor.toFixed(
                2
              )}%`;
            if (idEl) idEl.textContent = conversationId;

            // Add copy functionality for context block
            const copyContextBtn = document.getElementById("copy-context-btn");
            if (copyContextBtn) {
              copyContextBtn.addEventListener("click", () => {
                copyToClipboard(ctxRes.context, copyContextBtn);
              });
            }
          } else {
            console.error("Failed to fetch context and degradation.");
          }
        }

        // Fetch and render all sessions (for both existing and new session views)
        const sessionsRes = await fetchAllSessions();
        if (sessionsRes.success) {
          const listContainer = document.getElementById("session-list");
          if (listContainer) {
            // Clear existing content
            listContainer.innerHTML = "";

            // Add session count
            const sessionCount = document.createElement("div");
            sessionCount.className = "session-count";
            sessionCount.textContent = sessionsRes.sessions.length;

            // Update header if it exists
            const sessionsHeader = document.querySelector(".sessions-header");
            if (
              sessionsHeader &&
              !sessionsHeader.querySelector(".session-count")
            ) {
              sessionsHeader.appendChild(sessionCount);
            }

            // Create and append session items
            sessionsRes.sessions.forEach(({ sessionName, context }) => {
              const sessionItem = createSessionListItem(sessionName, context);
              listContainer.appendChild(sessionItem);
            });
          }
        } else {
          console.error("Failed to fetch sessions:", sessionsRes.error);
        }
      }, 100); // Small delay to ensure DOM is ready
    });
  });
});
