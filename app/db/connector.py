from datetime import datetime
import json
from typing import Dict, List
from imagine import ChatMessage, ImagineClient
import pycouchdb
import uuid
import requests
import asyncio
import httpx


class Client:
    def __init__(self):
        self.url="http://admin:admin123@localhost:5984"
        self.server=pycouchdb.Server(self.url)
        self.sessionDB=self.server.database("session_db")
        self.chatDB=self.server.database("chat_db")
        self.personalContextDB=self.server.database("personal_context_db")
        self.imagineClient=client = ImagineClient(api_key="f66499e9-2d54-4adf-85c1-5c9d67a13b1b",
                                                  endpoint="http://10.190.147.82:5050/")
    
    def translate(self, text, target_language="hi-IN"):
        response = self.imagineClient.chat(
        messages=[
                ChatMessage(role="user", content=f"translate {text} to hindi (hi-IN), only return the translated text")],
                model="Sarvam-m"
            )
        return response.first_content
    
    def query(self,relative_url):
        resp=requests.get(self.url+relative_url)
        if resp.status_code==200:
            return resp.json()

    def get_personal_context(self):
        doc=self.personalContextDB.get("1")
        return doc
    
    def update_personal_context(self,new_doc):
        self.sessionDB.save(new_doc)


    async def get_personal_context_from_json(personal_info: dict) -> dict:
        """
        Convert personal information from JSON to a string and send it to the API endpoint
        
        Args:
            personal_info (dict): Dictionary containing personal information with keys:
                - name: str
                - age: int
                - city: str
                - country: str
                - occupation: str
                - bio: str (optional)
        
        Returns:
            dict: API response
        """
        try:
            # Validate required fields
            required_fields = ['name', 'age', 'city', 'country', 'occupation']
            for field in required_fields:
                if field not in personal_info:
                    raise ValueError(f"Missing required field: {field}")
            
            # Format the personal information as a natural language string
            context_string = (
                f"My name is {personal_info['name']}. "
                f"I am {personal_info['age']} years old. "
                f"I live in {personal_info['city']}, {personal_info['country']}. "
                f"I work as a {personal_info['occupation']}. "
            )
            
            # Add bio if provided
            if 'bio' in personal_info and personal_info['bio']:
                context_string += f"About me: {personal_info['bio']}"
            
            # Prepare the API request
            url = "http://localhost:3001/api/v1/workspace/crazy/chat"
            headers = {
                "Authorization": f"Bearer JQF2CXB-MJ3MTTH-N4E5ZAJ-R6T628Z",
                "Content-Type": "application/json"
            }
            payload = {
                "message": context_string,
                "mode": "chat"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                
                return {
                    "success": True,
                    "context": context_string,
                    "response": response.json()
                }
                
        except ValueError as ve:
            return {
                "success": False,
                "error": str(ve)
            }
        except httpx.HTTPError as he:
            return {
                "success": False,
                "error": f"HTTP error occurred: {str(he)}"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"An unexpected error occurred: {str(e)}"
            }

    ## SESSIONS
        
    def create_session(self,session_name):
        doc=self.sessionDB.save({
            "session_name":session_name,
            "context":"",
            "attached_chats":[]
        })
        return doc["_id"]
    
    def create_new_session_from_chat(self,session_name,service_name,conversation_id):
        doc=self.sessionDB.save({
            "session_name":session_name,
            "context":"",
            "last_chat" : "",
            "attached_chats":[{
                "service_name": service_name,
                "conversation_id": conversation_id
            }]
        })
        return doc["_id"]
    
    def find_session_by_chat(self, service_name, conversation_id):
        for doc in self.sessionDB.all():
            for chat in doc.get('attached_chats', []):
                if chat.get('service_name') == service_name and chat.get('conversation_id') == conversation_id:
                    return doc['_id']
        return None
        
    
    def get_session_name(self, session_id: str) -> str:
    
     try:
        return self.sessionDB.get(session_id)["session_name"]
     except Exception as e:
        print(f" Session with {session_id[:8]}.'s name is not found: {e}")
        return None
    
    def list_all_sessions(self, workspace_slug: str = None, limit: int = 50, offset: int = 0) -> List[List]:
        """List sessions with optional workspace filtering"""
        try:
            if workspace_slug:
                # Filter by workspace - in CouchDB we need to iterate
                all_sessions = []
                for session in self.sessionDB.all():
                    doc = session.get("doc", {})
                    if doc.get("workspace_slug") == workspace_slug:
                        all_sessions.append([
                            session["id"],
                            doc.get("session_name", ""),
                            doc.get("context", ""),
                            doc.get("workspace_slug", ""),
                            doc.get("updated_at", "")
                        ])
                # Sort by updated_at and apply pagination
                all_sessions.sort(key=lambda x: x[4], reverse=True)
                return all_sessions[offset:offset + limit]
            else:
                sessions = list(self.sessionDB.all())[offset:offset + limit]
                return [[
                    i["id"],
                    i["doc"].get("session_name", ""),
                    i["doc"].get("context", ""),
                    i["doc"].get("workspace_slug", ""),
                    i["doc"].get("updated_at", "")
                ] for i in sessions]
        except Exception as e:
            print(f" Error listing sessions: {e}")
            return []
        
    def get_session(self, session_id: str) -> Dict:
        """Get session by ID"""
        try:
            return self.sessionDB.get(session_id)
        except Exception as e:
            print(f" Session {session_id[:8]}... not found: {e}")
            return None
        
    def update_session_name(self, session_id: str, new_session_name: str):
        """Update session name"""
        try:
            doc = self.sessionDB.get(session_id)
            doc["session_name"] = new_session_name
            doc["updated_at"] = datetime.now().isoformat()
            self.sessionDB.save(doc)
            print(f"  Updated session name: {new_session_name}")
        except Exception as e:
            print(f" Error updating session name: {e}")
            raise
    
    def update_session_timestamp(self, session_id: str):
        """Update session's last activity timestamp"""
        try:
            doc = self.sessionDB.get(session_id)
            doc["updated_at"] = datetime.now().isoformat()
            self.sessionDB.save(doc)
        except Exception as e:
            print(f" Error updating session timestamp: {e}")
    
    def delete_session(self, session_id: str):
        """Delete session and associated context"""
        try:
            session_doc = self.sessionDB.get(session_id)
        
            
            # Delete all chats for this session
            self.delete_session_chats(session_id)
            
            # Delete session
            self.sessionDB.delete(session_doc)
            print(f"  Deleted session: {session_id[:8]}...")
        except Exception as e:
            print(f" Error deleting session: {e}")
            raise
    
    def get_context_for_session(self, session_id: str) -> str:
        """Get context content for a session"""
        try:
            session_doc = self.sessionDB.get(session_id)
            return session_doc["context"]
        except Exception as e:
            print(f" Error getting context for session: {e}")
            return ""
        
    def get_last_chat_for_session(self, session_id: str) -> str:
        """Get context content for a session"""
        try:
            session_doc = self.sessionDB.get(session_id)
            return session_doc["last_chat"]
        except Exception as e:
            print(f" Error getting context for session: {e}")
            return ""
    
    def update_context_for_session(self,session_id,new_context, lastChat=""):
        session_id=self.sessionDB.get(session_id)
        session_id["context"]=new_context
        session_id["last_chat"] = lastChat
        self.sessionDB.save(session_id)
    
    
    ## CHAT
    
    def add_chat(self,session_id,user_prompt,system_response):
        new_chat_id=session_id+":"+(uuid.uuid4().hex)
        self.chatDB.save({
            "_id":new_chat_id,
            "user":user_prompt,
            "response":system_response
        })
    
    def get_all_chats_by_session_id(self,session_id):
        resp = self.query(f"/chat_db/_partition/{session_id}/_all_docs")["rows"]
        
        resp=[{"id":i["id"],"rev":i["value"]["rev"]} for i in resp]
        
        resp = requests.post(self.url+"/chat_db/_bulk_get",json={"docs":resp})
        return [i["docs"][0]["ok"] for i in resp.json()["results"]]

if __name__=="__main__":
    client=Client()
    # print(client.get_context_for_session("fe51eea2c06c4e3582552726236d7dd4"))
    # client.add_chat("fe51eea2c06c4e3582552726236d7dd4","e","E")
    # client.add_chat("fe51eea2c06c4e3582552726236d7dd4","e3","EE")
    # client.add_chat("fe51eea2c06c4e3582552726236d7dd4","eeee","EEEEE")
    resp=client.get_all_chats_by_session_id("fe51eea2c06c4e3582552726236d7dd4")
    print(resp)
