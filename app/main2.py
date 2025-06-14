from fastapi import FastAPI, HTTPException, Header, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
import json
import asyncio
from datetime import datetime
import uuid
from .db.conn2 import Client

app = FastAPI(
    title="Enhanced AnythingLLM FastAPI Server",
    description="CouchDB-based server with AnythingLLM integration",
    version="2.0.0"
)

client = Client()

# Pydantic models
class ContextUpdate(BaseModel):
    new_context: str

class SessionRename(BaseModel):
    new_session_name: str

class SessionCreate(BaseModel):
    session_name: str
    workspace_slug: Optional[str] = None
    context: Optional[str] = None

class ApiKeyConfig(BaseModel):
    apiKey: str

class ChatMessage(BaseModel):
    prompt: str
    mode: str = "chat"

class ContextBucketUpdate(BaseModel):
    context: str
    context_type: Optional[str] = None

# AnythingLLM client
class AnythingLLMClient:
    def __init__(self):
        self.base_url = "http://localhost:3001/api/v1"
        self.timeout = 30.0
    
    async def make_request(self, method: str, endpoint: str, data: Dict = None, stream: bool = False):
        """Make request to AnythingLLM API"""
        api_key = client.get_api_key()
        if not api_key:
            raise HTTPException(status_code=400, detail="API key not configured")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as http_client:
            try:
                if stream:
                    # For streaming responses
                    return await http_client.stream(method, url, headers=headers, json=data)
                else:
                    response = await http_client.request(method, url, headers=headers, json=data)
                    response.raise_for_status()
                    return response
            except httpx.TimeoutException:
                raise HTTPException(status_code=504, detail="AnythingLLM request timeout")
            except httpx.HTTPStatusError as e:
                raise HTTPException(status_code=e.response.status_code, detail=f"AnythingLLM API error: {e}")
            except httpx.RequestError as e:
                raise HTTPException(status_code=503, detail=f"Failed to connect to AnythingLLM: {e}")

anythingllm_client = AnythingLLMClient()

@app.get("/")
async def read_root():
    return {"message": "hello"}

# Health and configuration endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "anythingllm_url": anythingllm_client.base_url,
        "database_schema": "couchdb_partitioned",
        "databases": {
            "sessionDB": True,
            "contextDB": True,
            "chatDB": True,
            "configDB": True
        }
    }

@app.get("/config")
async def get_config():
    """Get current configuration"""
    config = client.get_config()
    config["anythingllm_url"] = anythingllm_client.base_url
    config["port"] = 8000  # FastAPI default
    return config

@app.post("/config/api-key")
async def configure_api_key(config: ApiKeyConfig):
    """Configure AnythingLLM API key"""
    if not config.apiKey:
        raise HTTPException(status_code=400, detail="API key is required")
    
    success = client.set_api_key(config.apiKey)
    if success:
        return {"message": "API key configured successfully ! "}
    else:
        raise HTTPException(status_code=500, detail="Failed to configure API key")
    

@app.post("/sessions")
async def create_session_enhanced(session_data: SessionCreate):
    """Create a new session with optional context and workspace"""
    try:
        session_id = client.create_session(
            session_data.session_name,
            session_data.workspace_slug,
            session_data.context
        )
        
        session = client.get_session(session_id)
        return {
            "session_id": session_id,
            "session_name": session["session_name"],
            "context_bucket_id": session.get("context_bucket_id"),
            "workspace_slug": session.get("workspace_slug"),
            "message": "Session created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
async def list_sessions_enhanced(
    workspace_slug: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """List sessions with optional workspace filtering"""
    try:
        sessions = client.list_all_sessions(workspace_slug, limit, offset)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/create_session/{session_name}")
async def create_session(session_name):
    try:
        session_id = client.create_session(session_name)
        return {"session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/update_session_name/{session_id}")
async def update_session_name(session_id: str, payload: SessionRename):
    """Update session name"""
    try:
        client.update_session_name(session_id, payload.new_session_name)
        return {"message": "Session name updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.delete("/delete_session/{session_id}")
async def delete_session(session_id: str):
    """Delete session and associated data"""
    try:
        client.delete_session(session_id)
        return {"message": "Session and associated context deleted"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

# Context management endpoints
@app.get("/context/{context_bucket_id}")
async def get_context_bucket(context_bucket_id: str):
    """Get context bucket by ID"""
    try:
        context = client.get_context(context_bucket_id)
        if not context:
            raise HTTPException(status_code=404, detail="Context bucket not found")
        return context
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/context/{context_bucket_id}")
async def update_context_bucket(context_bucket_id: str, payload: ContextBucketUpdate):
    """Update context bucket"""
    try:
        success = client.update_context_bucket(
            context_bucket_id, 
            payload.context, 
            payload.context_type
        )
        if success:
            return {"message": "Context updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Context bucket not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_context/{session_id}")
async def get_context_legacy(session_id: str):
    """Legacy endpoint for getting session context"""
    try:
        context = client.get_context_for_session(session_id)
        return {"context": context}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/update_context/{session_id}")
async def update_context_legacy(session_id: str, payload: ContextUpdate):
    """Legacy endpoint for updating session context"""
    try:
        client.update_context_for_session(session_id, payload.new_context)
        return {"message": "Context updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

# Chat endpoints
@app.post("/chat/{session_id}")
async def send_chat_message(session_id: str, message: ChatMessage):
    """Send a chat message to a session"""
    try:
        # Verify session exists
        session = client.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        start_time = datetime.now()
        
        # Get context if available
        context_message = message.prompt
        if session.get("context_bucket_id"):
            context_data = client.get_context(session["context_bucket_id"])
            if context_data and context_data.get("context"):
                context_message = f"Context: {context_data['context']}\n\nUser: {message.prompt}"
        
        # Send to AnythingLLM
        workspace_slug = session.get("workspace_slug", "hi")
        response = await anythingllm_client.make_request(
            "POST",
            f"/workspace/{workspace_slug}/chat",
            {"message": context_message, "mode": message.mode}
        )
        
        response_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Parse response
        response_data = response.json()
        assistant_response = (
            response_data.get("textResponse") or
            response_data.get("text") or
            response_data.get("response") or
            response_data.get("message") or
            response_data.get("content") or
            "No response received"
        )
        
        # Store chat
        chat_id = client.store_chat(
            session_id,
            message.prompt,
            assistant_response,
            response_time,
            None,  # tokens_used
            response_data.get("sources", [])
        )
        
        # Update session timestamp
        client.update_session_timestamp(session_id)
        
        return {
            "chat_id": chat_id,
            "session_id": session_id,
            "prompt": message.prompt,
            "response": assistant_response,
            "response_time_ms": response_time,
            "sources": response_data.get("sources", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")



# Chat history and management
@app.get("/chats/{session_id}")
async def get_session_chats(session_id: str, limit: int = 50, offset: int = 0):
    """Get all chats for a session"""
    try:
        chats = client.get_session_chats(session_id, limit, offset)
        return chats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/{chat_id}")
async def get_specific_chat(chat_id: str):
    """Get specific chat by partitioned chat_id"""
    try:
        chat = client.get_chat(chat_id)
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        return chat
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Analytics endpoint
@app.get("/analytics")
async def get_analytics(session_id: Optional[str] = None, days: int = 7):
    """Get usage analytics"""
    try:
        analytics = client.get_analytics(session_id, days)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Workspace management
@app.get("/workspaces")
async def get_workspaces():
    """Get available workspaces from AnythingLLM"""
    try:
        response = await anythingllm_client.make_request("GET", "/workspaces")
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch workspaces: {str(e)}")

# Legacy endpoints for backward compatibility
@app.post("/update-context")
async def update_context_header(newchat: str = Header(None)):
    """Legacy header-based context update"""
    return {"status": "Context updated"}

@app.post("/evaluate_context")
async def evaluate_context(newchat: str = Header(None)):
    """Legacy context evaluation endpoint"""
    if not newchat:
        raise HTTPException(status_code=400, detail="newchat header is required")
    return {"status": "Context evaluated", "context": newchat}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)