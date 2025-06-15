// apiWrapper.js

export async function postSessionCheck(conversationId, service) {
  try {
    const response = await fetch(`http://localhost:8000/find_session_by_chat/${service}/${conversationId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    return data.session_id && data.session_id !== ""; // returns true if session exists
  } catch (error) {
    console.error("API call failed:", error);
    return false;
  }
}

export async function createNewSession(sessionName, conversationId, service) {
  try {
    const response = await fetch(`http://localhost:8000/create_new_session_from_chat?session_name=${encodeURIComponent(sessionName)}&service_name=${service}&conversation_id=${conversationId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    return {
      success: true,
      message: "Session created successfully",
      sessionId: data.session_id
    };
  } catch (error) {
    console.error("Create session API call failed:", error);
    return { success: false, error: error.message };
  }
}
// apiWrapper.js

export async function postConversationUpload(sessionId, conversationJSON) {
  // Dummy response for development/testing
  /*
  return {
    success: true,
    message: "Dummy upload successful",
    service,
    conversationId,
    entriesUploaded: conversationJSON.length
  };
  */

  // Real API call
  try {
    // Stringify the entire conversation JSON into a single string
    const conversationString = JSON.stringify(conversationJSON);

    const response = await fetch(`http://localhost:8000/local/chat/${sessionId}`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer JQF2CXB-MJ3MTTH-N4E5ZAJ-R6T628Z",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt:  conversationString,
        mode: "chat"
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error:", errorData);
    } else {
      const data = await response.json();
      console.log("Assistant response:", data.response);
    }


    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: "Conversation upload successful",
      entriesUploaded: conversationJSON.length,
      response: data.response,
      chat_data: data
    };
  } catch (error) {
    console.error("Upload conversation API failed:", error);
    return { success: false, error: error.message };
  }
}

export async function getContextAndDegradation(sessionId) {
  try {
    // Get context
    const contextResponse = await fetch(`http://localhost:8000/get_context/${sessionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!contextResponse.ok) throw new Error("Failed to fetch context");
    
    const contextData = await contextResponse.json();
    
    // For degradation, we need a sample prompt to calculate it
    // Since there's no direct degradation endpoint without a prompt, we'll return a placeholder
    // You might want to modify this based on your requirements
    return {
      success: true,
      message: "Context and degradation fetch successful",
      context: contextData.context,
      degradationFactor: 0.0 // Placeholder - actual calculation requires a prompt
    };
    
  } catch (error) {
    console.error("Get context & degradation API failed:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchAllSessions() {
  try {
    const response = await fetch("http://localhost:8000/list_all_sessions", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    console.log(data);
    // Transform the response to match expected format
    const sessions = data.sessions.map(session => ({
      sessionName: session[1], // Using session_id as sessionName
      context: session[2] || "No description available" // Using session_name as context
    }));
    
    return { success: true, sessions: sessions };
  } catch (error) {
    console.error("Fetch all sessions failed:", error);
    return { success: false, error: error.message };
  }
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



