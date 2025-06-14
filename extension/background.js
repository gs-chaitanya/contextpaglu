chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("app.html"), // Your persistent page
    type: "popup",
    width: 400,
    height: 600
  });
});
