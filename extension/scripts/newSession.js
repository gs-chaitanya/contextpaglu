import { createNewSession, postAppendSession } from "../apiWrapper.js";

// DOM Elements
const createBtn = document.getElementById("create");
const sessionInput = document.getElementById("sessionName");
const sessionList = document.getElementById("session-list");

export function inferServiceAndConversationId(urlString) {
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
export async function getSessionIdFromKey(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
        return;
      }
      resolve(result[key] || null);
    });
  });
}
// Disable input if a session is selected
function updateInputState() {
  const anyChecked = sessionList.querySelector("input[type='checkbox']:checked");
  sessionInput.disabled = !!anyChecked;
  createBtn.disabled = false;
}

// Handle checkbox selection
function handleCheckboxChange(clicked) {
  const checkboxes = sessionList.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach(cb => {
    if (cb !== clicked) cb.checked = false;
  });
  updateInputState();
}

// Handle Create/Append Session logic
createBtn.addEventListener("click", async () => {
  async function getSessionIdFromKey(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
          return;
        }
        resolve(result[key] || null);
      });
    });
  }

  const sessionName = sessionInput.value.trim();

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (!tabs.length) return alert("No active tab found.");

    const { service, conversationId } = inferServiceAndConversationId(tabs[0].url);
    if (!service || !conversationId) return alert("Unable to extract service or conversation ID.");

    let sessionId = null;
    let response = null;

    if (sessionName) {
      // Create a new session
      response = await createNewSession(sessionName, conversationId, service);
      if (!response.success) return alert("Failed to create session: " + (response.error || "Unknown error"));
      sessionId = response.sessionId;
      const key = `${service}:${conversationId}`;
      console.log("Creating new session with key:", key, "and sessionId:", sessionId);

      chrome.storage.local.set({
        [key]: sessionId,
        service,
        conversationId,
        sessionName,
      });
    } else {
      // Append to existing session
      const checked = sessionList.querySelector("input[type='checkbox']:checked");
      if (!checked) return alert("Please enter a session name or select an existing session.");
      const li = checked.closest("li");
      const sessionIdSpan = li.querySelector(".session-id");
      sessionId = sessionIdSpan?.textContent?.trim();

      if (!sessionId) return alert("Unable to find session ID.");

      // response = await postAppendSession(service, conversationId, sessionId);
      // if (!response.success) return alert("Failed to append session: " + (response.error || "Unknown error"));

      const key = `${service}:${conversationId}`;
      sessionId = response.sessionId;
      chrome.storage.local.set({
        [key]: sessionId,
        service: service,
        conversationId: conversationId,
        sessionName: li.textContent.split("(")[0].trim(),
      });
    }

    // Load and inject existing session HTML
    const html = await fetch(chrome.runtime.getURL("views/existingSession.html")).then(r => r.text());
    document.getElementById("app").innerHTML = html;

    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/existingSession.js");
    script.type = "module";
    document.body.appendChild(script);

    // Run DOM Scraping Script
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {

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

        const match = window.location.pathname.match(/\/c\/([\w-]+)/);
        const conversationId = match ? match[1] : "unknown";

        window.__executedConversations = window.__executedConversations || new Set();
        if (window.__executedConversations.has(conversationId)) return;
        window.__executedConversations.add(conversationId);

        console.log("DOM Scraper Running Once");

        const processEntireDOM = async () => {
          const url = window.location.hostname;
          let serviceName = "Unknown";
          if (url.includes("chatgpt.com")) serviceName = "chatgpt";
          else if (url.includes("gemini.google.com")) serviceName = "gemini";
          else if (url.includes("claude.ai")) serviceName = "claude";

          const match = window.location.pathname.match(/\/c\/([\w-]+)/);
          // const conversationId = match ? match[1] : "unknown";

          const containers = Array.from(
            document.querySelectorAll(".text-token-text-primary.w-full")
          );
          const userMessages = [];
          const gptMessages = [];

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

          async function getSessionIdFromKey(key) {
            return new Promise((resolve, reject) => {
              chrome.storage.local.get([key], (result) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError.message);
                  return;
                }
                resolve(result[key] || null);
              });
            });
          }
          const url1 = window.location.href;
          const { service, conversationId } = inferServiceAndConversationId(url1);
          const key = `${service}:${conversationId}`;
          async function myCallerFunction() {
            const sessionId = await getSessionIdFromKey(key);
            console.log("Session ID:", sessionId);
          }
          myCallerFunction();


          const sessionId = await getSessionIdFromKey(key);
          setTimeout(200);
          console.log("Session ID and key:", sessionId, key);

          chrome.runtime.sendMessage({
            type: "conversation_scraped",
            service: service,
            conversationId: conversationId,
            data: conversationArray,
          });

          console.log(`[WebScraper] Sent ${conversationArray.length} entries`);
          window.__lastConversationJSON = conversationArray;
          console.log(`[WebScraper] Service: ${service}`);
          console.log(`[WebScraper] Conversation ID: ${conversationId}`);
          console.log(`[WebScraper] Prompt-Response JSON: \n`, JSON.stringify(conversationArray, null, 2));
        };

        processEntireDOM();
      }
    });
  });
});

sessionList.addEventListener("change", (event) => {
  if (event.target.type === "checkbox") {
    handleCheckboxChange(event.target);
  }
});

updateInputState();
