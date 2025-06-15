    
    
    // Copy functionality
    function copyToClipboard(text, button) {
      navigator.clipboard.writeText(text).then(() => {
        const originalText = button.querySelector('.copy-button-text').textContent;
        const originalIcon = button.querySelector('.copy-button-icon').textContent;
        
        button.classList.add('copied');
        button.querySelector('.copy-button-text').textContent = 'Copied!';
        button.querySelector('.copy-button-icon').textContent = '✓';
        
        setTimeout(() => {
          button.classList.remove('copied');
          button.querySelector('.copy-button-text').textContent = originalText;
          button.querySelector('.copy-button-icon').textContent = originalIcon;
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }

    // Context copy button
    document.getElementById('copy-context-btn').addEventListener('click', function() {
      const contextContent = document.getElementById('context-block').textContent;
      copyToClipboard(contextContent, this);
    });

    const copyContextBtn = document.getElementById("copy-context-btn");
if (copyContextBtn) {
  copyContextBtn.addEventListener("click", () => {
    copyToClipboard(ctxRes.context, copyContextBtn);
  });
} else {
  console.warn("copy-context-btn element not found!");
}

    

    // Update session count when sessions are loaded
    function updateSessionCount() {
      const sessionItems = document.querySelectorAll('#session-list li');
      const countElement = document.getElementById('session-count');
      if (countElement) {
        countElement.textContent = sessionItems.length;
      }
    }

    // Observer to watch for session list changes
    const observer = new MutationObserver(updateSessionCount);
    const sessionList = document.getElementById('session-list');
    if (sessionList) {
      observer.observe(sessionList, { childList: true });
    }

    // Format degradation score as percentage
    function formatDegradationScore() {
      const scoreElement = document.getElementById('degradation-score');
      if (scoreElement && scoreElement.textContent.includes('Degradation:')) {
        const value = scoreElement.textContent.match(/[\d.]+/);
        if (value) {
          const percentage = Math.round((1 - parseFloat(value[0])) * 100);
          scoreElement.textContent = `${percentage}%`;
        }
      }
    }

    // Monitor for degradation score updates
    const scoreObserver = new MutationObserver(formatDegradationScore);
    const scoreElement = document.getElementById('degradation-score');
    if (scoreElement) {
      scoreObserver.observe(scoreElement, { childList: true, characterData: true, subtree: true });
    }
    // Initialize the page
    document.addEventListener('DOMContentLoaded', function() {
      updateSessionCount();
    });

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
