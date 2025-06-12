from fastapi import FastAPI, Header, HTTPException

app = FastAPI()

@app.get("/")
async def read_root():
    return {"message": "Hello, fucker!"}

@app.post("/update-context")
async def update_context(newchat: str = Header(None)):
    return {"status": "Context updated"}

@app.post("/evaluate_context")
async def evaluate_context(newchat: str = Header(None)):
    if not newchat:
        raise HTTPException(status_code=400, detail="newchat header is required")
    return {"status": "Context evaluated", "context": newchat}

