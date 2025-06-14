from fastapi import FastAPI, HTTPException,Header ,status
from pydantic import BaseModel

from .db.connector import Client

app = FastAPI()
client = Client()

class ContextUpdate(BaseModel):
    new_context: str

class SessionRename(BaseModel):
    new_session_name: str


@app.get("/")
async def read_root():
    return {"message": "hello"}


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

