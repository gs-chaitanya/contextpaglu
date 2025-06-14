// Query the active tab in the current window
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.id) {
    // Inject a script into the current tab to observe DOM changes
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        // Prevent re-initializing the observer if it's already running
        if (window.__domObserverRunning) return;
        window.__domObserverRunning = true;

        console.log("DOM observer started");

        // Sets for managing newly added DOM nodes and debounced execution
        let pendingNodes = new Set();
        let debounceTimeout = null;
        const processedNodes = new WeakSet();

        // Processes DOM nodes that appear to contain message content
        const processNodes = () => {
          const userMessages = [];
          const gptMessages = [];

          for (const node of pendingNodes) {
            if (!(node instanceof HTMLElement)) continue;

            // Skip nodes that don't match message container classes
            if (
              !node.classList.contains("text-token-text-primary") ||
              !node.classList.contains("w-full")
            ) {
              continue;
            }

            // Skip already processed nodes
            if (processedNodes.has(node)) continue;
            processedNodes.add(node);

            const text = node.innerText || "";

            // Extract user message
            if (text.includes("You said:")) {
              const userDiv = node.querySelector("div.whitespace-pre-wrap");
              if (userDiv) {
                userMessages.push(userDiv.textContent.trim());
              }
            }

            // Extract GPT response
            if (text.includes("ChatGPT said:")) {
              const gptEls = node.querySelectorAll("p, code");
              const combined = Array.from(gptEls)
                .map((el) => el.textContent.trim())
                .join("\n");
              gptMessages.push(combined);
            }
          }

          // Extract conversation ID from URL
          const serviceName = "ChatGPT";
          const match = window.location.pathname.match(/\/c\/([\w-]+)/);
          const conversationId = match ? match[1] : "unknown";

          // Create prompt-response pairs
          const pairCount = Math.min(userMessages.length, gptMessages.length);
          const conversationArray = [];

          for (let i = 0; i < pairCount; i++) {
            conversationArray.push({
              prompt: userMessages[i],
              response: gptMessages[i],
            });
          }

          // Send the structured conversation data to the extension background
          if (conversationArray.length) {
            chrome.runtime.sendMessage({
              type: "conversation_scraped",
              service: serviceName,
              conversationId,
              data: conversationArray
            });

            window.__lastConversationJSON = conversationArray;

            console.log(`[WebScraper] Service: ${serviceName}`);
            console.log(`[WebScraper] Conversation ID: ${conversationId}`);
            console.log("[WebScraper] Prompt-Response JSON:");
            console.log(JSON.stringify(conversationArray, null, 2));
          }

          // Clear the queue after processing
          pendingNodes.clear();
        };

        // Debounce DOM processing to avoid excessive calls
        const scheduleProcessing = () => {
          clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(processNodes, 3000);
        };

        // Observe DOM mutations for new message blocks
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                pendingNodes.add(node);
              }
            }
          }
          scheduleProcessing();
        });

        // Start observing the entire document for added nodes
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }
    });
  }
});
