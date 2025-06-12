function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function sendTextToAPI(text) {
  fetch("https://httpbin.org/post", {  // <-- TEMP test endpoint
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: text })
  })
  .then(res => res.json())
  .then(data => console.log("API response:", data))
  .catch(err => console.error("API error:", err));
}

function monitorChatGPTInput() {
  const interval = setInterval(() => {
    const textarea = document.querySelector('textarea');

    if (textarea && !textarea.hasAttribute("data-watching")) {
      textarea.setAttribute("data-watching", "true");

      const debouncedSend = debounce((e) => {
        const text = e.target.value.trim();
        if (text) {
            console.log("Detected input:", text); 
            sendTextToAPI(text);
        }
      }, 1000);

      textarea.addEventListener("input", debouncedSend);
      console.log("[Extension] Monitoring ChatGPT input.");
      clearInterval(interval);
    }
  }, 500);
}

monitorChatGPTInput();
