import { createNewSession, fetchAllSessions } from "../apiWrapper.js";

// DOM elements
const continueCard = document.getElementById("continueSessionCard");
const createCard = document.getElementById("createNewSessionCard");
const choiceCards = document.getElementById("choiceCards");
const continueFlow = document.getElementById("continueSessionFlow");
const createFlow = document.getElementById("createNewSessionFlow");
const backFromContinue = document.getElementById("backFromContinue");
const backFromCreate = document.getElementById("backFromCreate");
const sessionDropdown = document.getElementById("sessionDropdown");
const confirmContinue = document.getElementById("confirmContinue");
const sessionNameInput = document.getElementById("sessionNameInput");
const charCount = document.getElementById("charCount");
const confirmCreate = document.getElementById("confirmCreate");

// State
let availableSessions = [];
let currentService = "";
let currentConversationId = "";

// Initialize the session choice interface
async function init() {
  console.log("🧩 Session choice interface initialized");
  
  // Get current tab info
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      const { service, conversationId } = inferServiceAndConversationId(tabs[0].url);
      currentService = service;
      currentConversationId = conversationId;
      console.log(`🧩 Detected: ${service} - ${conversationId}`);
    }
  } catch (error) {
    console.error("Error getting tab info:", error);
  }

  // Load available sessions
  await loadSessions();
  
  // Set up event listeners
  setupEventListeners();
  
  // Listen for conversation ID updates
  setupConversationIdListener();
}

// Utility function to extract service and conversation ID from URL
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

// Load available sessions from API
async function loadSessions() {
  try {
    console.log("🧩 Loading available sessions...");
    const response = await fetchAllSessions();
    
    if (response.success) {
      availableSessions = response.sessions;
      console.log(`🧩 Loaded ${availableSessions.length} sessions`);
      populateSessionDropdown();
    } else {
      console.error("Failed to load sessions:", response.error);
      sessionDropdown.innerHTML = '<option value="">No sessions available</option>';
    }
  } catch (error) {
    console.error("Error loading sessions:", error);
    sessionDropdown.innerHTML = '<option value="">Error loading sessions</option>';
  }
}

// Populate the session dropdown with available sessions
function populateSessionDropdown() {
  sessionDropdown.innerHTML = "";
  
  if (availableSessions.length === 0) {
    sessionDropdown.innerHTML = '<option value="">No previous sessions found</option>';
    return;
  }

  // Add default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a session...";
  sessionDropdown.appendChild(defaultOption);

  // Add sessions
  availableSessions.forEach(session => {
    const option = document.createElement("option");
    option.value = session.session_id;
    option.textContent = `${session.session_name} (${session.session_id.substring(0, 8)}...)`;
    sessionDropdown.appendChild(option);
  });
}

// Set up all event listeners
function setupEventListeners() {
  // Card clicks with ripple effect
  continueCard.addEventListener("click", () => {
    addRippleEffect(continueCard);
    setTimeout(showContinueFlow, 150);
  });
  
  createCard.addEventListener("click", () => {
    addRippleEffect(createCard);
    setTimeout(showCreateFlow, 150);
  });

  // Back buttons
  backFromContinue.addEventListener("click", showMainChoice);
  backFromCreate.addEventListener("click", showMainChoice);

  // Session dropdown
  sessionDropdown.addEventListener("change", (e) => {
    const isValid = e.target.value.trim() !== "";
    confirmContinue.disabled = !isValid;
    
    if (isValid) {
      confirmContinue.classList.remove("btn:disabled");
    } else {
      confirmContinue.classList.add("btn:disabled");
    }
  });

  // Session name input
  sessionNameInput.addEventListener("input", (e) => {
    const value = e.target.value.trim();
    charCount.textContent = value.length;
    
    const isValid = value.length > 0 && value.length <= 50;
    confirmCreate.disabled = !isValid;
    
    // Update character counter color
    if (value.length > 45) {
      charCount.style.color = "#d32f2f";
    } else if (value.length > 35) {
      charCount.style.color = "#f57c00";
    } else {
      charCount.style.color = "#757575";
    }
  });

  // Confirm buttons
  confirmContinue.addEventListener("click", handleContinueSession);
  confirmCreate.addEventListener("click", handleCreateSession);

  // Enter key support
  sessionNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !confirmCreate.disabled) {
      handleCreateSession();
    }
  });
}

// Set up listener for conversation ID updates
function setupConversationIdListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "conversation_id_detected") {
      console.log("🧩 Conversation ID update received:", message.conversationId);
      // Update current conversation ID if it was temporary
      if (currentConversationId.startsWith("new-conversation-")) {
        currentConversationId = message.conversationId;
        console.log("🧩 Updated conversation ID:", currentConversationId);
      }
    }
  });
}

// Add ripple effect to buttons/cards
function addRippleEffect(element) {
  const ripple = document.createElement("div");
  ripple.style.position = "absolute";
  ripple.style.borderRadius = "50%";
  ripple.style.background = "rgba(255, 255, 255, 0.3)";
  ripple.style.transform = "scale(0)";
  ripple.style.animation = "ripple 0.6s linear";
  ripple.style.left = "50%";
  ripple.style.top = "50%";
  ripple.style.width = "100px";
  ripple.style.height = "100px";
  ripple.style.marginLeft = "-50px";
  ripple.style.marginTop = "-50px";
  ripple.style.pointerEvents = "none";

  element.style.position = "relative";
  element.style.overflow = "hidden";
  element.appendChild(ripple);

  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple);
    }
  }, 600);
}

// Show continue session flow
function showContinueFlow() {
  choiceCards.style.display = "none";
  continueFlow.style.display = "block";
  createFlow.style.display = "none";
  
  // Focus on dropdown after animation
  setTimeout(() => {
    sessionDropdown.focus();
  }, 100);
}

// Show create session flow
function showCreateFlow() {
  choiceCards.style.display = "none";
  continueFlow.style.display = "none";
  createFlow.style.display = "block";
  
  // Focus on input after animation
  setTimeout(() => {
    sessionNameInput.focus();
  }, 100);
}

// Show main choice cards
function showMainChoice() {
  choiceCards.style.display = "flex";
  continueFlow.style.display = "none";
  createFlow.style.display = "none";
  
  // Reset form states
  sessionDropdown.value = "";
  confirmContinue.disabled = true;
  sessionNameInput.value = "";
  charCount.textContent = "0";
  charCount.style.color = "#757575";
  confirmCreate.disabled = true;
}

// Handle continuing an existing session
async function handleContinueSession() {
  const selectedSessionId = sessionDropdown.value;
  if (!selectedSessionId) return;

  const selectedSession = availableSessions.find(s => s.session_id === selectedSessionId);
  if (!selectedSession) {
    showNotification("Selected session not found.", "error");
    return;
  }

  // Update button state
  setButtonLoading(confirmContinue, true);

  try {
    // Save session info to local storage
    const key = `${currentService}:${currentConversationId}`;
    chrome.storage.local.set({
      [key]: true,
      service: currentService,
      conversationId: currentConversationId,
      sessionName: selectedSession.session_name,
      sessionId: selectedSessionId,
      isExistingSession: true
    }, () => {
      console.log("🧩 Existing session linked successfully");
      loadExistingSessionView();
    });
  } catch (error) {
    console.error("Error linking session:", error);
    showNotification("Error linking session. Please try again.", "error");
    setButtonLoading(confirmContinue, false);
  }
}

// Handle creating a new session
async function handleCreateSession() {
  const sessionName = sessionNameInput.value.trim();
  if (!sessionName || sessionName.length > 50) return;

  setButtonLoading(confirmCreate, true);

  try {
    console.log("🧩 Creating new session:", sessionName);
    const response = await createNewSession(sessionName, currentConversationId, currentService);
    
    if (!response.success) {
      showNotification("Failed to create session: " + (response.error || "Unknown error"), "error");
      return;
    }

    console.log("🧩 Session created successfully:", response);

    // Save session info to local storage
    const key = `${currentService}:${currentConversationId}`;
    chrome.storage.local.set({
      [key]: true,
      service: currentService,
      conversationId: currentConversationId,
      sessionName: sessionName,
      isExistingSession: false
    }, () => {
      console.log("🧩 New session created successfully");
      loadExistingSessionView(true);
    });

  } catch (error) {
    console.error("Error creating session:", error);
    showNotification("Error creating session. Please try again.", "error");
  } finally {
    setButtonLoading(confirmCreate, false);
  }
}

// Set button loading state
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.classList.add("loading");
    const originalText = button.innerHTML;
    button.dataset.originalText = originalText;
    button.innerHTML = originalText.replace(/Create Session|Continue Session/, "Loading...");
  } else {
    button.disabled = false;
    button.classList.remove("loading");
    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
    }
  }
}

// Show notification
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === "error" ? "#d32f2f" : "#1976d2"};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Load the existing session view
async function loadExistingSessionView(shouldStartScraping = false) {
  try {
    const htmlFile = "views/existingSession.html";
    const scriptFile = "scripts/existingSession.js";

    const html = await fetch(chrome.runtime.getURL(htmlFile)).then(r => r.text());
    document.getElementById("app").innerHTML = html;

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(scriptFile);
    script.type = "module";
    document.body.appendChild(script);

    // If this is a new session, start scraping the conversation
    if (shouldStartScraping) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        console.log("🧩 Starting conversation scraper for new session");
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: [chrome.runtime.getURL("webScraperEntire.js")]
        });
      }
    }
  } catch (error) {
    console.error("Error loading existing session view:", error);
    showNotification("Error loading session view. Please try again.", "error");
  }
}

// Add CSS for animations
const style = document.createElement("style");
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
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
`;
document.head.appendChild(style);

// Initialize when the script loads
init();