from datetime import datetime
import json
from typing import Dict, List
import pycouchdb
import uuid
import requests
import asyncio


class Client:
    def __init__(self):
        self.url="http://admin:admin123@localhost:5984"
        self.server=pycouchdb.Server(self.url)
        self.sessionDB=self.server.database("session_db")
        self.chatDB=self.server.database("chat_db")
    
    def query(self,relative_url):
        resp=requests.get(self.url+relative_url)
        if resp.status_code==200:
            return resp.json()

    ## SESSIONS
        
    def create_session(self,session_name):
        doc=self.sessionDB.save({
            "session_name":session_name,
            "context":""
        })
        return doc["_id"]
    
    def get_session_name(self, session_id: str) -> str:
    
     try:
        return self.sessionDB.get(session_id)["session_name"]
     except Exception as e:
        print(f"❌ Session with {session_id[:8]}.'s name is not found: {e}")
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
            print(f"❌ Error listing sessions: {e}")
            return []
        
    def get_session(self, session_id: str) -> Dict:
        """Get session by ID"""
        try:
            return self.sessionDB.get(session_id)
        except Exception as e:
            print(f"❌ Session {session_id[:8]}... not found: {e}")
            return None
        
    def update_session_name(self, session_id: str, new_session_name: str):
        """Update session name"""
        try:
            doc = self.sessionDB.get(session_id)
            doc["session_name"] = new_session_name
            doc["updated_at"] = datetime.now().isoformat()
            self.sessionDB.save(doc)
            print(f"✏️  Updated session name: {new_session_name}")
        except Exception as e:
            print(f"❌ Error updating session name: {e}")
            raise
    
    def update_session_timestamp(self, session_id: str):
        """Update session's last activity timestamp"""
        try:
            doc = self.sessionDB.get(session_id)
            doc["updated_at"] = datetime.now().isoformat()
            self.sessionDB.save(doc)
        except Exception as e:
            print(f"❌ Error updating session timestamp: {e}")
    
    def delete_session(self, session_id: str):
        """Delete session and associated context"""
        try:
            session_doc = self.sessionDB.get(session_id)
        
            
            # Delete all chats for this session
            self.delete_session_chats(session_id)
            
            # Delete session
            self.sessionDB.delete(session_doc)
            print(f"🗑️  Deleted session: {session_id[:8]}...")
        except Exception as e:
            print(f"❌ Error deleting session: {e}")
            raise
    
    def get_context_for_session(self, session_id: str) -> str:
        """Get context content for a session"""
        try:
            session_doc = self.sessionDB.get(session_id)
            return session_doc["context"]
        except Exception as e:
            print(f"❌ Error getting context for session: {e}")
            return ""
    
    def update_context_for_session(self,session_id,new_context):
        session_id=self.sessionDB.get(session_id)
        session_id["context"]=new_context
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
    