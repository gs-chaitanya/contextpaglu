(() => {
  if (window.__domObserverRunning) return;
  window.__domObserverRunning = true;

  console.log("DOM observer started");

  let pendingNodes = new Set();
  let debounceTimeout = null;
  const processedNodes = new WeakSet();

  const processNodes = () => {
    const userMessages = [];
    const gptMessages = [];

    for (const node of pendingNodes) {
      if (!(node instanceof HTMLElement)) continue;

      if (
        !node.classList.contains("text-token-text-primary") ||
        !node.classList.contains("w-full")
      ) {
        continue;
      }

      if (processedNodes.has(node)) continue;
      processedNodes.add(node);

      const text = node.innerText || "";

      if (text.includes("You said:")) {
        const userDiv = node.querySelector("div.whitespace-pre-wrap");
        if (userDiv) {
          userMessages.push(userDiv.textContent.trim());
        }
      }

      if (text.includes("ChatGPT said:")) {
        const gptEls = node.querySelectorAll("p, code");
        const combined = Array.from(gptEls)
          .map((el) => el.textContent.trim())
          .join("\n");
        gptMessages.push(combined);
      }
    }

    // Service name (fixed for ChatGPT)
    const serviceName = "ChatGPT";

    // Extract conversation ID from /c/:id
    const match = window.location.pathname.match(/\/c\/([\w-]+)/);
    const conversationId = match ? match[1] : "unknown";

    // Pair messages into JSON format
    const pairCount = Math.min(userMessages.length, gptMessages.length);
    const conversationArray = [];

    for (let i = 0; i < pairCount; i++) {
      conversationArray.push({
        prompt: userMessages[i],
        response: gptMessages[i],
      });
    }

    if (conversationArray.length) {
      window.__lastConversationJSON = conversationArray;
      console.log(`[WebScraper] Service: ${serviceName}`);
      console.log(`[WebScraper] Conversation ID: ${conversationId}`);
      console.log("[WebScraper] Prompt-Response JSON:");
      console.log(JSON.stringify(conversationArray, null, 2));
    }

    pendingNodes.clear();
  };

  const scheduleProcessing = () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(processNodes, 3000);
  };

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

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
