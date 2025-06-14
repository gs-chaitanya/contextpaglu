// apiWrapper.js - Updated to match your FastAPI backend

const API_BASE_URL = "http://localhost:8000";

export async function postSessionCheck(conversationId, service) {
  // Check if session exists by trying to get context
  try {
    const response = await fetch(`${API_BASE_URL}/get_context/${conversationId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return true; // Session exists
    } else if (response.status === 404) {
      return false; // Session doesn't exist
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error("❌ API call failed:", error);
    return false; // Assume session doesn't exist on error
  }
}

export async function createNewSession(sessionName, conversationId, service) {
  try {
    const response = await fetch(`${API_BASE_URL}/create_session/${encodeURIComponent(sessionName)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: "Session created successfully",
      sessionName,
      conversationId,
      service,
      sessionId: data.session_id
    };
  } catch (error) {
    console.error("❌ Create session API call failed:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export async function postConversationUpload(service, conversationId, conversationJSON) {
  try {
    // First, check if we have a session for this conversation
    const sessionExists = await postSessionCheck(conversationId, service);
    
    if (!sessionExists) {
      console.log("🧩 No session found for conversation, skipping upload");
      return {
        success: true,
        message: "No session found, upload skipped",
        service,
        conversationId,
        entriesUploaded: 0
      };
    }

    // Convert conversation data to context string
    const contextString = conversationJSON.map(entry => 
      `User: ${entry.prompt}\nAssistant: ${entry.response}`
    ).join('\n\n');

    // Update context for the session
    const response = await fetch(`${API_BASE_URL}/update_context/${conversationId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        new_context: contextString
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: "Context updated successfully",
      service,
      conversationId,
      entriesUploaded: conversationJSON.length
    };
  } catch (error) {
    console.error("❌ Upload conversation API failed:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export async function getContextAndDegradation(service, conversationId) {
  try {
    const response = await fetch(`${API_BASE_URL}/get_context/${conversationId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: true,
          context: "No context available yet",
          degradationFactor: 0.0
        };
      }
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      context: data.context || "No context available",
      degradationFactor: 0.1 // Placeholder - your backend doesn't seem to have degradation calculation yet
    };
  } catch (error) {
    console.error("❌ Get context & degradation API failed:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export async function fetchAllSessions() {
  try {
    const response = await fetch(`${API_BASE_URL}/list_all_sessions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return { 
      success: true, 
      sessions: data.sessions || [] 
    };
  } catch (error) {
    console.error("❌ Fetch all sessions failed:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export async function sendChatMessage(sessionId, prompt, mode = "chat") {
  try {
    const response = await fetch(`${API_BASE_URL}/local/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        mode: mode
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error("❌ Send chat message failed:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export async function updateSessionName(sessionId, newName) {
  try {
    const response = await fetch(`${API_BASE_URL}/update_session_name/${sessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        new_session_name: newName
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message
    };
  } catch (error) {
    console.error("❌ Update session name failed:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export async function deleteSession(sessionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/delete_session/${sessionId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message
    };
  } catch (error) {
    console.error("❌ Delete session failed:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}