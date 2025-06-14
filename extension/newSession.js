document.getElementById("submitSessionName").onclick = () => {
  const sessionName = document.getElementById("sessionNameInput").value.trim();
  if (sessionName) {
    console.log("Session name submitted:", sessionName);
    // Send it to background/API if needed:
    chrome.runtime.sendMessage({ type: "NEW_SESSION_NAME", name: sessionName });

    alert("Session name saved!");
    window.close(); // optionally close the page
  } else {
    alert("Please enter a session name.");
  }
};
