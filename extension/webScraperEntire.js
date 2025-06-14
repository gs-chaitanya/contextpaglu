(() => {
  if (window.__domObserverRunning) return;
  window.__domObserverRunning = true;

  console.log("DOM observer started");

  const processEntireDOM = () => {
    // Identify service
    const url = window.location.hostname;
    let serviceName = "Unknown";

    if (url.includes("chatgpt.com")) serviceName = "ChatGPT";
    else if (url.includes("gemini.google.com")) serviceName = "Gemini";
    else if (url.includes("claude.ai")) serviceName = "Claude";

    // Get conversation ID from URL
    const match = window.location.pathname.match(/\/c\/([\w-]+)/);
    const conversationId = match ? match[1] : "unknown";

    // Find all message containers
    const containers = Array.from(document.querySelectorAll(".text-token-text-primary.w-full"));
    const userMessages = [];
    const gptMessages = [];

    // Parse messages
    for (const el of containers) {
      const text = el.innerText || "";

      if (text.includes("You said:")) {
        const userDiv = el.querySelector("div.whitespace-pre-wrap");
        if (userDiv) {
          userMessages.push(userDiv.textContent.trim());
        }
      }

      if (text.includes("ChatGPT said:")) {
        const gptEls = el.querySelectorAll("p, code");
        const combined = Array.from(gptEls)
          .map(el => el.textContent.trim())
          .join("\n");
        gptMessages.push(combined);
      }
    }

    // Pair messages
    const pairCount = Math.min(userMessages.length, gptMessages.length);
    const conversationArray = [];

    for (let i = 0; i < pairCount; i++) {
      const pair = {
        prompt: userMessages[i],
        response: gptMessages[i]
      };
      conversationArray.push(pair);
    }
    window.__lastConversationJSON = conversationArray;
    console.log(`[WebScraper] Service: ${serviceName}`);
    console.log(`[WebScraper] Conversation ID: ${conversationId}`);
    console.log(`[WebScraper] Prompt-Response JSON: \n`, JSON.stringify(conversationArray, null, 2));
  };

  const observer = new MutationObserver(() => {
    processEntireDOM();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Run once immediately
  processEntireDOM();
})();
