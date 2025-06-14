import json
import pycouchdb
import uuid
import requests


class Client:
    def __init__(self):
        self.url="http://admin:admin123@localhost:5984"
        self.server=pycouchdb.Server(self.url)
        self.sessionDB=self.server.database("session_db")
        self.chatDB=self.server.database("chat_db")
        self.contextDB=self.server.database("context_db")
    
    def query(self,relative_url):
        resp=requests.get(self.url+relative_url)
        if resp.status_code==200:
            return resp.json()

    ## SESSIONS
        
    def create_session(self,session_name):
        doc=self.sessionDB.save({
            "session_name":session_name,
            "context_bucket":self.create_new_context()
        })
        return doc["_id"]
    
    def list_all_sessions(self):
        return [[i["id"],i["doc"]["session_name"],i["doc"]["context_bucket"]] for i in list(self.sessionDB.all())]
    
    def update_session_name(self,session_id,new_session_name):
        doc=self.sessionDB.get(session_id)
        doc["session_name"]=new_session_name
        self.sessionDB.save(doc)
    
    def delete_session(self,session_id):
        session_doc=self.sessionDB.get(session_id)
        context_doc=self.contextDB.get(session_doc["context_bucket"])
        
        self.sessionDB.delete(session_doc)
        self.contextDB.delete(context_doc)
        
   
    
    ## CONTEXT
    
    def create_new_context(self):
        doc=self.contextDB.save({
            "context":""
        })
        return doc["_id"]
    
    def get_context(self,context_id):
        doc=self.contextDB.get(context_id)
        return doc
    
    def get_context_for_session(self,session_id):
        self.sessionDB.get(session_id)
        session_doc=self.sessionDB.get(session_id)
        context=self.get_context(session_doc["context_bucket"])["context"]
        return context
    
    def update_context_for_session(self,session_id,new_context):
        context_doc=self.get_context(session["context_bucket"])
        context_doc["context"]=new_context
        self.contextDB.save(context_doc)
    
    
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
    