function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function sendTextToAPI(text) {
  console.log("Sending to API:", text);
  fetch("https://httpbin.org/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text })
  })
  .then(res => res.json())
  .then(data => console.log("API response:", data))
  .catch(err => console.error("API error:", err));
}

function observeChatGPTInput() {
  const observer = new MutationObserver(() => {
    const textarea = document.querySelector('form textarea');

    if (textarea && !textarea.dataset.watching) {
      textarea.dataset.watching = "true";

      const debouncedSend = debounce((e) => {
        const text = e.target.value.trim();
        if (text) {
          sendTextToAPI(text);
        }
      }, 1000);

      textarea.addEventListener("input", debouncedSend);
      console.log("[Extension] Attached listener to ChatGPT textarea.");
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log("[Extension] Watching for ChatGPT chatbox.");
}

observeChatGPTInput();
