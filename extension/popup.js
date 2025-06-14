// popup.js

import { postSessionCheck } from "./apiWrapper.js";


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

document.addEventListener("DOMContentLoaded", () => {
  
  console.log("popup loaded");

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    
    const { service, conversationId } = inferServiceAndConversationId(tabs[0].url);

    console.log("Detected service:", service);
    console.log("Detected conversation ID:", conversationId);

    if (!service || !conversationId) {
      console.log("Could not detect service or conversation ID from URL.");
      return;
    }

    const sessionExists = await postSessionCheck(conversationId, service);
    console.log("Session exists:", sessionExists);

    if (!sessionExists) 
    {
    console.log("New session detected. Please name it.");
    }
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["webScraperMutated.js"]
    });
  });
});
