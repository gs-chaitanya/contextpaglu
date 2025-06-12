import pycouchdb

class Client:
    def __init__(self):
        self.server=pycouchdb.Server("http://admin:admin123@localhost:5984/")
        self.sessionDB=self.server.database("session_db")
        self.chatDB=self.server.database("chat_db")
        self.contextDB=self.server.database("context_db")
    

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
        session=self.sessionDB.get(session_id)
        context_doc=self.get_context(session["context_bucket"])
        context_doc["context"]=new_context
        self.contextDB.save(context_doc)


if __name__=="__main__":
    client=Client()
    print(client.get_context_for_session("fe51eea2c06c4e3582552726236d7dd4"))
    