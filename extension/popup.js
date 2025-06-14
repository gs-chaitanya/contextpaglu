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
    // Handle both new conversations and existing ones
    if (pathSegments.length > 2 && pathSegments[2]) {
      conversationId = pathSegments[2];
    } else {
      // For new conversations, generate a temporary ID that will be replaced
      conversationId = "new-conversation-" + Date.now();
    }
  } else if (hostname.includes("claude.ai")) {
    service = "claude";
    if (pathSegments.length > 2 && pathSegments[2]) {
      conversationId = pathSegments[2];
    } else {
      conversationId = "new-conversation-" + Date.now();
    }
  } else if (hostname.includes("gemini.google.com")) {
    service = "gemini";
    if (pathSegments.length > 2 && pathSegments[2]) {
      conversationId = pathSegments[2];
    } else {
      conversationId = "new-conversation-" + Date.now();
    }
  }

  return { service, conversationId };
}

// Check if this is a valid AI service URL (more permissive for new conversations)
function isValidServiceUrl(urlString) {
  const url = new URL(urlString);
  const hostname = url.hostname;
  
  return hostname.includes("chatgpt.com") || 
         hostname.includes("claude.ai") || 
         hostname.includes("gemini.google.com");
}

// Check if conversation has a real ID (not a temporary one)
function hasRealConversationId(conversationId) {
  return conversationId && !conversationId.startsWith("new-conversation-");
}

// Listener: Handles messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "conversation_scraped") {
    const { service, conversationId, data } = message;
    console.log("🧩 Received scraped conversation data:", data);

    // Upload conversation data to backend
    postConversationUpload(service, conversationId, data).then((result) => {
      if (result.success) {
        console.log("🧩 Conversation uploaded successfully");
      } else {
        console.error("❌ Upload failed:", result.error);
      }
    });

    return true; // Keep sendResponse alive for async work
  }

  if (message.type === "conversation_id_detected") {
    // Handle when a real conversation ID is detected from a new conversation
    const { service, conversationId } = message;
    console.log("🧩 Real conversation ID detected:", conversationId);
    
    // Update local storage with real conversation ID
    updateConversationId(service, conversationId);
    
    return true;
  }
});

// Update conversation ID in storage when real one is detected
function updateConversationId(service, newConversationId) {
  chrome.storage.local.get(null, (result) => {
    const updates = {};
    
    // Find and update entries with temporary IDs
    for (const [key, value] of Object.entries(result)) {
      if (key.startsWith(`${service}:new-conversation-`)) {
        // Remove old entry and create new one with real ID
        updates[key] = undefined; // This will delete the old key
        updates[`${service}:${newConversationId}`] = value;
        break;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates, () => {
        console.log("🧩 Updated conversation ID in storage");
      });
    }
  });
}

// Load a specific view into the popup
async function loadView(htmlFile, scriptFile = null) {
  try {
    const html = await fetch(chrome.runtime.getURL(htmlFile)).then(r => r.text());
    document.getElementById("app").innerHTML = html;

    if (scriptFile) {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL(scriptFile);
      script.type = "module";
      document.body.appendChild(script);
    }
  } catch (error) {
    console.error("❌ Error loading view:", error);
    document.getElementById("app").innerHTML = `
      <div style="padding: 20px; text-align: center; color: #e2e8f0; background: #1a1d29; border-radius: 12px;">
        <h3>Error Loading Extension</h3>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
  }
}

// Show welcome screen briefly, then transition to session choice
async function showWelcomeFlow() {
  await loadView("views/welcome.html");
  
  // After 2.5 seconds, transition to session choice
  setTimeout(async () => {
    await loadView("views/sessionChoice.html", "scripts/sessionChoice.js");
  }, 2500);
}

// Load existing session view with context and session list
async function loadExistingSession(service, conversationId) {
  await loadView("views/existingSession.html", "scripts/existingSession.js");

  try {
    // Only fetch data if we have a real conversation ID
    if (hasRealConversationId(conversationId)) {
      // Fetch list of all sessions
      const sessionsRes = await fetchAllSessions();
      if (sessionsRes.success) {
        const listContainer = document.getElementById("session-list");
        if (listContainer) {
          // Clear existing content
          listContainer.innerHTML = "";
          
          if (sessionsRes.sessions.length === 0) {
            const li = document.createElement("li");
            li.textContent = "No sessions found";
            li.style.fontStyle = "italic";
            li.style.color = "#a0aec0";
            listContainer.appendChild(li);
          } else {
            sessionsRes.sessions.forEach(({ session_id, session_name }) => {
              const li = document.createElement("li");
              li.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>${session_name}</strong></span>
                  <small style="color: #a0aec0;">${session_id.substring(0, 8)}...</small>
                </div>
              `;
              li.style.cssText = `
                padding: 12px;
                margin: 8px 0;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                transition: all 0.2s ease;
                cursor: pointer;
              `;
              
              li.addEventListener("mouseenter", () => {
                li.style.background = "rgba(255, 255, 255, 0.1)";
              });
              
              li.addEventListener("mouseleave", () => {
                li.style.background = "rgba(255, 255, 255, 0.05)";
              });
              
              listContainer.appendChild(li);
            });
          }
        }
      }

      // Fetch context for the current conversation
      const ctxRes = await getContextAndDegradation(service, conversationId);
      if (ctxRes.success) {
        const contextEl = document.getElementById("context-block");
        const conversationIdEl = document.getElementById("conversation-id");

        if (contextEl) {
          contextEl.textContent = ctxRes.context || "No context available yet";
          contextEl.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            padding: 16px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #e2e8f0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.4;
            max-height: 200px;
            overflow-y: auto;
          `;
        }
        
        if (conversationIdEl) {
          conversationIdEl.textContent = `Conversation: ${conversationId}`;
          conversationIdEl.style.cssText = `
            color: #a0aec0;
            font-size: 12px;
            font-family: 'Courier New', monospace;
          `;
        }
      } else {
        console.error("❌ Failed to fetch context:", ctxRes.error);
      }
    } else {
      // For new conversations, show placeholder data
      const contextEl = document.getElementById("context-block");
      const conversationIdEl = document.getElementById("conversation-id");
      
      if (contextEl) {
        contextEl.textContent = "Context will be available once the conversation starts...";
      }
      
      if (conversationIdEl) {
        conversationIdEl.textContent = "New conversation (ID will be assigned)";
      }
    }
  } catch (error) {
    console.error("❌ Error loading existing session data:", error);
  }
}

// Show an error state for invalid URLs
function showInvalidUrlState() {
  document.getElementById("app").innerHTML = `
    <div style="padding: 30px 20px; text-align: center; color: #e2e8f0; background: linear-gradient(135deg, #1a1d29 0%, #2d3748 100%); border-radius: 16px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚫</div>
      <h3 style="margin: 0 0 12px 0; color: #f56565;">Unsupported Page</h3>
      <p style="margin: 0; color: #a0aec0; font-size: 14px; line-height: 1.5;">
        Context Weaver only works on ChatGPT, Claude, or Gemini pages.
        <br><br>
        Please navigate to one of these services and try again.
      </p>
    </div>
  `;
}

// Main: Runs when popup is loaded
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🧩 Context Weaver popup loaded");

  try {
    // Get the active tab and extract service + conversation ID from the URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tabs.length) {
      showInvalidUrlState();
      return;
    }

    const currentUrl = tabs[0].url;
    
    if (!isValidServiceUrl(currentUrl)) {
      showInvalidUrlState();
      return;
    }

    const { service, conversationId } = inferServiceAndConversationId(currentUrl);
    console.log("🧩 Detected service:", service);
    console.log("🧩 Detected conversation ID:", conversationId);

    const key = `${service}:${conversationId}`;

    // Check if the session exists in local storage
    chrome.storage.local.get([key], async (result) => {
      let sessionExists = false;

      console.log("🧩 Checking local storage for session key:", key);

      if (result[key]) {
        console.log("🧩 Session found in local storage");
        sessionExists = true;
      } else if (hasRealConversationId(conversationId)) {
        // Only check API for real conversation IDs
        console.log("🧩 Session not found in local storage. Checking via API...");
        try {
          sessionExists = await postSessionCheck(conversationId, service);
          console.log(sessionExists ? "🧩 Session found via API" : "🧩 New session detected via API");
        } catch (error) {
          console.error("❌ Error checking session via API:", error);
          sessionExists = false;
        }
      }

      if (sessionExists) {
        // Load existing session view immediately
        await loadExistingSession(service, conversationId);
      } else {
        // Show welcome flow for new sessions
        await showWelcomeFlow();
      }
    });
  } catch (error) {
    console.error("❌ Error initializing popup:", error);
    showInvalidUrlState();
  }
});