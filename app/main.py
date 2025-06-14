from fastapi import FastAPI, HTTPException, Header, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
import json
import asyncio
from datetime import datetime
import uuid
from .db.connector import Client

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
        return {"message": "API key configured successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to configure API key")


@app.get("/create_session/{session_name}")
async def create_session(session_name):
    try:
        session_id = client.create_session(session_name)
        return {"session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/list_all_sessions")
async def list_all_sessions():
    try:
        sessions = client.list_all_sessions()
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/update_session_name/{session_id}")
async def update_session_name(session_id: str, payload: SessionRename):
    try:
        client.update_session_name(session_id, payload.new_session_name)
        return {"message": "Session name updated successfully"}
    except Exception as e:  
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/delete_session/{session_id}")
async def delete_session(session_id: str):
    try:
        client.delete_session(session_id)
        return {"message": "Session and associated context deleted"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/get_context/{session_id}")
async def get_context(session_id: str):
    try:
        context = client.get_context_for_session(session_id)
        return {"context": context}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/update_context/{session_id}")
async def update_context(session_id: str, payload: ContextUpdate):
    try:
        client.update_context_for_session(session_id, payload.new_context)
        return {"message": "Context updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/update-context")
async def update_context(newchat: str = Header(None)):
    return {"status": "Context updated"}

@app.post("/evaluate_context")
async def evaluate_context(newchat: str = Header(None)):
    if not newchat:
        raise HTTPException(status_code=400, detail="newchat header is required")
    return {"status": "Context evaluated", "context": newchat}

@app.get("/get_all_chats/{session_id}")
async def get_all_chats(session_id: str):
    try:
        resp = client.get_all_chats_by_session_id("fe51eea2c06c4e3582552726236d7dd4")
        return {"response": resp}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

