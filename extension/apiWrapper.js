// apiWrapper.js

export async function postSessionCheck(conversationId, service) {
  // Dummy return for testing purposes
  return false;

  // Uncomment and use the real API call when backend is ready
  /*
  try {
    const response = await fetch("http://localhost:8000/check_session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
        service,
      }),
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    return data.exists; // expecting { "exists": true } or false
  } catch (error) {
    console.error("API call failed:", error);
    return false;
  }
  */
}

export async function createNewSession(sessionName, conversationId, service) {
  // Dummy response for testing purposes
  return {
    success: true,
    message: "Dummy session created successfully",
    sessionName,
    conversationId,
    service,
  };

  // Uncomment and use the real API call when backend is ready
  /*
  try {
    const response = await fetch("http://localhost:8000/create_session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionName,
        conversationId,
        service,
      }),
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    return data; // expecting something like { "success": true, "message": "...", ... }
  } catch (error) {
    console.error("Create session API call failed:", error);
    return { success: false, error: error.message };
  }
  */
}
// apiWrapper.js

export async function postConversationUpload(service, conversationId, conversationJSON) {
  // Dummy response for development/testing
  return {
    success: true,
    message: "Dummy upload successful",
    service,
    conversationId,
    entriesUploaded: conversationJSON.length
  };

  // Uncomment below for real API call
  /*
  try {
    const response = await fetch("http://localhost:8000/upload_conversation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service,
        conversationId,
        conversation: conversationJSON, // e.g. [{ prompt: "...", response: "..." }, ...]
      }),
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    return data; // expecting something like { "success": true, "message": "...", ... }
  } catch (error) {
    console.error("Upload conversation API failed:", error);
    return { success: false, error: error.message };
  }
  */
}

export async function getContextAndDegradation(service, conversationId) {
  // Dummy response for development/testing
  return {
    success: true,
    message: "Dummy context + degradation fetch successful",
    context: "Q: What is AI?\nA: Artificial Intelligence is the simulation of human intelligence...",
    degradationFactor: 0.12
  };

  // Uncomment below for real API call
  /*
  try {
    const response = await fetch("http://localhost:8000/get_context_and_degradation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ service, conversationId }),
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    return data; // expecting: { success: true, context: "string", degradationFactor: number }
  } catch (error) {
    console.error("Get context & degradation API failed:", error);
    return { success: false, error: error.message };
  }
  */
}

export async function fetchAllSessions() {
  // Dummy response for development/testing
  return {
    success: true,
    sessions: [
      { sessionName: "abc123", context: "AI Basics" },
      { sessionName: "def456", context: "Philosophy Chat" },
      { sessionName: "ghi789", context: "Code Review Session" }
    ]
  };
  // Uncomment below for real API call
  /*
  try {
    const response = await fetch("http://localhost:8000/get_all_sessions"); // Replace with actual endpoint
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json(); // expecting format: [{ sessionId, sessionName }, ...]
    return { success: true, sessions: data };
  } catch (error) {
    console.error("Fetch all sessions failed:", error);
    return { success: false, error: error.message };
  }
  */
}
export async function postAppendSession(service, conversationId, sessionId) {
  // Dummy response for testing purposes
  return {
    success: true,
    message: "Dummy session append successful",
    service,
    conversationId,
    sessionId,
  };

  // Uncomment and use the real API call when backend is ready
  /*
  try {
    const response = await fetch("http://localhost:8000/append_session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service,
        conversationId,
        sessionId,
      }),
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    return data; // expecting something like { "success": true, "message": "...", ... }
  } catch (error) {
    console.error("Append session API call failed:", error);
    return { success: false, error: error.message };
  }
  */
}



