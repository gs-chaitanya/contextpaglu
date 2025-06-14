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
        self.timeout = 50.0
    
    async def make_request(self, method: str, endpoint: str, data: Dict = None, stream: bool = False):        
        headers = {
            "Authorization": f"Bearer JQF2CXB-MJ3MTTH-N4E5ZAJ-R6T628Z",
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

async def walterwhite(workspace_name):
            
    response = await anythingllm_client.make_request(
        "POST",
        f"/workspace/new",
        {
            "name": workspace_name,
            "similarityThreshold": 0.7,
            "openAiTemp": 0.7,
            "openAiHistory": 20,
            "openAiPrompt": "Custom prompt for responses",
            "queryRefusalResponse": "Custom refusal message",
            "chatMode": "chat",
            "topN": 4
        }
    )
    return response 



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
        workspace_name=f"{session_name}workspace"
        await walterwhite(workspace_name)
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

@app.post("/local/chat/{session_id}")
# Chat endpoints
async def send_chat_message( message: ChatMessage , session_id : str):
    """Send a chat message to a session"""
    local_llm_session_id = "90cc411d-fdd1-4732-88c9-60888e4b639f"
    session_name=client.get_session_name(session_id)
    workspace_name=f"{session_name}workspace"
    try:
        # Verify session exists
        # session = client.get_session(session_id)
        # if not session:
        #     raise HTTPException(status_code=404, detail="Session not found")
        
        start_time = datetime.now()
        
        # Get context if available
        context_message = message.prompt
        # if session.get("context_bucket_id"):
        #     context_data = client.get_context(session["context_bucket_id"])
        #     if context_data and context_data.get("context"):
        #         context_message = f"Context: {context_data['context']}\n\nUser: {message.prompt}"
        
        # Send to AnythingLLM
        # workspace_slug = session.get("workspace_slug", "hi")
        response = await anythingllm_client.make_request(
            "POST",
            f"/workspace/{workspace_name}/chat",
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
        # chat_id = client.store_chat(
        #     session_id,
        #     message.prompt,
        #     assistant_response,
        #     response_time,
        #     None,  # tokens_used
        #     response_data.get("sources", [])
        # )
        
        # Update session timestamp
        # client.update_session_timestamp(session_id)
        
        return {
            # "chat_id": chat_id,
            "local_llm_session_id": session_id,
            "prompt": message.prompt,
            "response": assistant_response,
            "response_time_ms": response_time,
            "sources": response_data.get("sources", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")

