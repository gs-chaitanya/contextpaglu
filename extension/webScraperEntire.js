// existingSession.js - Enhanced existing session management with Material Design

import { getContextAndDegradation, fetchAllSessions } from "../apiWrapper.js";

// State
let isContextExpanded = false;
let currentSessionData = null;

// Initialize existing session view
async function init() {
  console.log("🧩 Existing session view initialized");
  
  // Set up event listeners
  setupEventListeners();
  
  // Load initial data
  await loadSessionData();
  
  // Start the continuous scraper for this session
  await startContinuousScraper();
}

// Set up event listeners for buttons and interactions
function setupEventListeners() {
  const refreshBtn = document.getElementById("refreshData");
  const exportBtn = document.getElementById("exportContext");
  const expandBtn = document.getElementById("expandContext");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", handleRefreshData);
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", handleExportContext);
  }

  if (expandBtn) {
    expandBtn.addEventListener("click", handleExpandContext);
  }

  // Add click-to-copy functionality for conversation ID
  const conversationIdEl = document.getElementById("conversation-id");
  if (conversationIdEl) {
    conversationIdEl.addEventListener("click", () => {
      const idText = conversationIdEl.textContent.replace("Conversation: ", "");
      copyToClipboard(idText, "Conversation ID copied!");
    });
    conversationIdEl.style.cursor = "pointer";
    conversationIdEl.title = "Click to copy";
  }
}

// Load all session data
async function loadSessionData() {
  try {
    // Get current tab info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      const { service, conversationId } = inferServiceAndConversationId(tabs[0].url);
      
      // Load context and degradation data
      await loadContextData(service, conversationId);
      
      // Load sessions list
      await loadSessionsList();
    }
  } catch (error) {
    console.error("Error loading session data:", error);
    showNotification("Error loading session data", "error");
  }
}

// Load context and degradation data
async function loadContextData(service, conversationId) {
  try {
    console.log("🧩 Loading context data...");
    
    const ctxRes = await getContextAndDegradation(service, conversationId);
    if (ctxRes.success) {
      currentSessionData = {
        context: ctxRes.context,
        degradationFactor: ctxRes.degradationFactor,
        conversationId: conversationId,
        service: service
      };
      
      updateContextDisplay(ctxRes.context, ctxRes.degradationFactor, conversationId);
      console.log("🧩 Context data loaded successfully");
    } else {
      console.error("Failed to load context data:", ctxRes.error);
      showNotification("Failed to load context data", "error");
    }
  } catch (error) {
    console.error("Error loading context data:", error);
    showNotification("Error loading context data", "error");
  }
}

// Load sessions list
async function loadSessionsList() {
  try {
    console.log("🧩 Loading sessions list...");
    
    const sessionsRes = await fetchAllSessions();
    if (sessionsRes.success) {
      updateSessionsList(sessionsRes.sessions);
      console.log(`🧩 Loaded ${sessionsRes.sessions.length} sessions`);
    } else {
      console.error("Failed to load sessions:", sessionsRes.error);
      updateSessionsList([]);
    }
  } catch (error) {
    console.error("Error loading sessions:", error);
    updateSessionsList([]);
  }
}

// Handle refresh data button click
async function handleRefreshData() {
  const btn = document.getElementById("refreshData");
  setButtonLoading(btn, true, "Refreshing...");

  try {
    await loadSessionData();
    showNotification("Data refreshed successfully", "success");
  } catch (error) {
    console.error("Error refreshing data:", error);
    showNotification("Error refreshing data", "error");
  } finally {
    setButtonLoading(btn, false, "Refresh");
  }
}

// Handle export context button click
async function handleExportContext() {
  if (!currentSessionData) {
    showNotification("No context data to export", "error");
    return;
  }

  const btn = document.getElementById("exportContext");
  setButtonLoading(btn, true, "Exporting...");

  try {
    const exportData = {
      conversationId: currentSessionData.conversationId,
      service: currentSessionData.service,
      context: currentSessionData.context,
      degradationFactor: currentSessionData.degradationFactor,
      exportedAt: new Date().toISOString(),
      exportedBy: "Context Weaver v1.0"
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: "application/json" 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `context-${currentSessionData.conversationId.substring(0, 8)}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification("Context exported successfully", "success");
  } catch (error) {
    console.error("Error exporting context:", error);
    showNotification("Error exporting context", "error");
  } finally {
    setButtonLoading(btn, false, "Export");
  }
}

// Handle expand context button click
function handleExpandContext() {
  const contextBlock = document.getElementById("context-block");
  const expandBtn = document.getElementById("expandContext");
  
  if (!contextBlock || !expandBtn) return;

  isContextExpanded = !isContextExpanded;
  
  if (isContextExpanded) {
    contextBlock.classList.add("expanded");
    expandBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M7.41 15.41L12 10.83L16.59 15.41L18 14L12 8L6 14L7.41 15.41Z" fill="currentColor"/>
      </svg>
    `;
    expandBtn.title = "Collapse";
  } else {
    contextBlock.classList.remove("expanded");
    expandBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="currentColor"/>
      </svg>
    `;
    expandBtn.title = "Expand";
  }
}

// Update context display
function updateContextDisplay(context, degradationFactor, conversationId) {
  const contextEl = document.getElementById("context-block");
  const degradationEl = document.getElementById("degradation-score");
  const conversationIdEl = document.getElementById("conversation-id");

  if (contextEl) {
    contextEl.textContent = context || "No context available";
  }

  if (degradationEl) {
    const percentage = Math.round((1 - degradationFactor) * 100);
    degradationEl.textContent = `${percentage}%`;
    degradationEl.style.color = getDegradationColor(degradationFactor);
    
    // Add quality indicator
    let qualityText = "Excellent";
    if (degradationFactor > 0.7) qualityText = "Poor";
    else if (degradationFactor > 0.4) qualityText = "Fair";
    else if (degradationFactor > 0.2) qualityText = "Good";
    
    degradationEl.title = `Quality: ${qualityText} (${degradationFactor.toFixed(3)})`;
  }

  if (conversationIdEl) {
    conversationIdEl.textContent = conversationId || "Unknown";
  }
}

// Update sessions list display
function updateSessionsList(sessions) {
  const sessionsList = document.getElementById("session-list");
  const sessionCount = document.getElementById("session-count");

  if (sessionCount) {
    sessionCount.textContent = sessions.length.toString();
  }

  if (sessionsList) {
    sessionsList.innerHTML = "";
    
    if (sessions.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No sessions found";
      li.className = "loading-item";
      sessionsList.appendChild(li);
    } else {
      sessions.forEach(({ sessionId, sessionName }) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 500; color: #212121; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${sessionName}
              </div>
              <div style="font-size: 12px; color: #757575; font-family: 'Roboto Mono', monospace;">
                ${sessionId.substring(0, 8)}...
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="color: #9e9e9e;">
              <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
            </svg>
          </div>
        `;
        
        li.addEventListener("click", () => {
          copyToClipboard(sessionId, "Session ID copied!");
        });
        
        sessionsList.appendChild(li);
      });
    }
  }
}

// Get color based on degradation factor
function getDegradationColor(factor) {
  if (factor > 0.7) return "#d32f2f"; // Red
  if (factor > 0.4) return "#f57c00"; // Orange  
  if (factor > 0.2) return "#fbc02d"; // Yellow
  return "#388e3c"; // Green
}

// Set button loading state
function setButtonLoading(button, isLoading, loadingText = "Loading...") {
  if (isLoading) {
    button.disabled = true;
    button.classList.add("loading");
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    button.classList.remove("loading");
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

// Copy to clipboard utility
async function copyToClipboard(text, successMessage = "Copied!") {
  try {
    await navigator.clipboard.writeText(text);
    showNotification(successMessage, "success");
  } catch (error) {
    console.error("Failed to copy:", error);
    showNotification("Failed to copy", "error");
  }
}

// Show notification
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  
  let bgColor = "#1976d2";
  if (type === "error") bgColor = "#d32f2f";
  else if (type === "success") bgColor = "#388e3c";
  else if (type === "warning") bgColor = "#f57c00";
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: 'Roboto', sans-serif;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Extract service and conversation ID from URL
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

// Start continuous scraper for the current session
async function startContinuousScraper() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id) {
    try {
      console.log("🧩 Starting continuous scraper...");
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: [chrome.runtime.getURL("webScraperMutated.js")]
      });
      console.log("🧩 Continuous scraper injected successfully");
    } catch (error) {
      console.error("Error injecting continuous scraper:", error);
      showNotification("Warning: Auto-scraper failed to start", "warning");
    }
  }
}

// Add CSS for animations if not already present
function addAnimationStyles() {
  if (!document.getElementById("animation-styles")) {
    const style = document.createElement("style");
    style.id = "animation-styles";
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(-50%) translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
        to {
          transform: translateX(-50%) translateY(-100%);
          opacity: 0;
        }
      }
      
      .loading {
        opacity: 0.7;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize when the script loads
document.addEventListener("DOMContentLoaded", () => {
  addAnimationStyles();
  init();
});

// Also initialize immediately if DOM is already ready
if (document.readyState !== "loading") {
  addAnimationStyles();
  init();
}