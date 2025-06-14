import { createNewSession } from "../apiWrapper.js";

// Get DOM elements for button and session name input
const createBtn = document.getElementById("create");
const sessionInput = document.getElementById("sessionName");

// Handle "Create" button click
createBtn.addEventListener("click", async () => {
  const sessionName = sessionInput.value.trim();

  // Validate input
  if (!sessionName) {
    alert("Please enter a session name.");
    return;
  }

  // Extract service name and conversation ID from the active browser tab
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (!tabs.length) {
      alert("No active tab found.");
      return;
    }

    const url = new URL(tabs[0].url);
    let service = "Unknown";

    // Infer service based on URL
    if (url.hostname.includes("chatgpt.com")) service = "chatgpt";
    else if (url.hostname.includes("gemini.google.com")) service = "gemini";
    else if (url.hostname.includes("claude.ai")) service = "claude";

    // Extract conversation ID
    const match = url.pathname.match(/\/c\/([\w-]+)/);
    const conversationId = match ? match[1] : "unknown";

    if (conversationId === "unknown") {
      alert("Unable to extract conversation ID.");
      return;
    }

    // Call API to create a new session
    const response = await createNewSession(sessionName, conversationId, service);
    console.log("API Response:", response);

    if (!response.success) {
      alert("Failed to create session: " + (response.error || "Unknown error"));
      return;
    }

    console.log("Session created successfully:", response);

    const key = `${service}:${conversationId}`;

    // Save session info to local storage
    chrome.storage.local.set({
      [key]: true,
      service,
      conversationId,
      sessionName
    }, async () => {
      console.log("Session info saved to local storage.");

      // Load and inject the existingSession.html + script
      const htmlFile = "views/existingSession.html";
      const scriptFile = "scripts/existingSession.js";

      const html = await fetch(chrome.runtime.getURL(htmlFile)).then((r) => r.text());
      document.getElementById("app").innerHTML = html;

      const script = document.createElement("script");
      script.src = chrome.runtime.getURL(scriptFile);
      script.type = "module";
      document.body.appendChild(script);

      // Inject DOM scraper on first visit to this conversation
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const match = window.location.pathname.match(/\/c\/([\w-]+)/);
          const conversationId = match ? match[1] : "unknown";

          window.__executedConversations = window.__executedConversations || new Set();
          if (window.__executedConversations.has(conversationId)) return;
          window.__executedConversations.add(conversationId);

          console.log("DOM Scraper Running Once");

          // Function to extract prompt-response pairs from DOM
          const processEntireDOM = () => {
            const url = window.location.hostname;
            let serviceName = "Unknown";
            if (url.includes("chatgpt.com")) serviceName = "ChatGPT";
            else if (url.includes("gemini.google.com")) serviceName = "Gemini";
            else if (url.includes("claude.ai")) serviceName = "Claude";

            const match = window.location.pathname.match(/\/c\/([\w-]+)/);
            const conversationId = match ? match[1] : "unknown";

            const containers = Array.from(
              document.querySelectorAll(".text-token-text-primary.w-full")
            );
            const userMessages = [];
            const gptMessages = [];

            // Parse messages
            for (const el of containers) {
              const text = el.innerText || "";

              if (text.includes("You said:")) {
                const userDiv = el.querySelector("div.whitespace-pre-wrap");
                if (userDiv) userMessages.push(userDiv.textContent.trim());
              }

              if (text.includes("ChatGPT said:")) {
                const gptEls = el.querySelectorAll("p, code");
                const combined = Array.from(gptEls)
                  .map((el) => el.textContent.trim())
                  .join("\n");
                gptMessages.push(combined);
              }
            }

            const pairCount = Math.min(userMessages.length, gptMessages.length);
            const conversationArray = [];

            for (let i = 0; i < pairCount; i++) {
              conversationArray.push({
                prompt: userMessages[i],
                response: gptMessages[i],
              });
            }

            // Send structured conversation to background script
            chrome.runtime.sendMessage({
              type: "conversation_scraped",
              service: serviceName,
              conversationId,
              data: conversationArray,
            });

            console.log(`[WebScraper] Sent ${conversationArray.length} entries`);
            window.__lastConversationJSON = conversationArray;
            console.log(`[WebScraper] Service: ${serviceName}`);
            console.log(`[WebScraper] Conversation ID: ${conversationId}`);
            console.log(
              `[WebScraper] Prompt-Response JSON: \n`,
              JSON.stringify(conversationArray, null, 2)
            );
          };

          processEntireDOM(); // Run immediately
        }
      });
    });
  });
});
