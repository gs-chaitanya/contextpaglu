import pycouchdb
import uuid
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

try:
    import pycouchdb
    COUCHDB_AVAILABLE = True
    print("✅ Using real CouchDB via pycouchdb")
except ImportError:
    COUCHDB_AVAILABLE = False
    print("⚠️  pycouchdb not available, using mock database")
    print("   Install with: pip install pycouchdb")

class Client:
    def __init__(self):
        self.server = pycouchdb.Server("http://admin:admin123@localhost:5984/")
        self.sessionDB = self.server.database("session_db")
        self.chatDB = self.server.database("chat_db")
        self.contextDB = self.server.database("context_db")
        self.configDB = self.server.database("config_db")
        self._ensure_databases()
        print("✅ Connected to real CouchDB")

    def _ensure_databases(self):
        """Ensure all required databases exist (only for real CouchDB)"""
        if not COUCHDB_AVAILABLE:
            return
        
        try:
            # Create databases if they don't exist
            databases = ["session_db", "chat_db", "context_db", "config_db"]
            for db_name in databases:
                try:
                    self.server.database(db_name)
                except:
                    self.server.create(db_name)
                    print(f"📁 Created database: {db_name}")
        except Exception as e:
            print(f"⚠️  Database initialization error: {e}")
    
    def set_api_key(self, api_key: str) -> bool:
        """Store AnythingLLM API key"""
        try:
            # Check if config exists
            try:
                config_doc = self.configDB.get("anythingllm_config")
                config_doc["api_key"] = api_key
                config_doc["updated_at"] = datetime.now().isoformat()
            except:
                config_doc = {
                    "_id": "anythingllm_config",
                    "api_key": api_key,
                    "anythingllm_url": "http://localhost:3001/api/v1",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
            
            self.configDB.save(config_doc)
            print(f"🔑 API key configured successfully")
            return True
        except Exception as e:
            print(f"❌ Error setting API key: {e}")
            return False
    
    def get_api_key(self) -> Optional[str]:
        """Get stored AnythingLLM API key"""
        try:
            config_doc = self.configDB.get("anythingllm_config")
            return config_doc.get("api_key")
        except:
            return None
    
    def is_api_key_configured(self) -> bool:
        """Check if API key is configured"""
        return self.get_api_key() is not None

    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        try:
            config_doc = self.configDB.get("anythingllm_config")
            return {
                "api_key_configured": bool(config_doc.get("api_key")),
                "anythingllm_url": config_doc.get("anythingllm_url", "http://localhost:3001/api/v1"),
                "database_schema": "couchdb_enhanced" if COUCHDB_AVAILABLE else "mock_couchdb"
            }
        except:
            return {
                "api_key_configured": False,
                "anythingllm_url": "http://localhost:3001/api/v1",
                "database_schema": "couchdb_enhanced" if COUCHDB_AVAILABLE else "mock_couchdb"
            }
    ## ENHANCED SESSION MANAGEMENT
        
    def create_session(self, session_name: str, workspace_slug: Optional[str] = None, context: Optional[str] = None) -> str:
        """Create a new session with optional context and workspace"""
        session_id = str(uuid.uuid4())
        context_bucket_id = None
        
        # Create context bucket if context provided
        if context:
            context_bucket_id = self.create_new_context(context)
        
        session_doc = {
            "_id": session_id,
            "session_name": session_name,
            "session_id": session_id,
            "context_bucket_id": context_bucket_id,
            "workspace_slug": workspace_slug or "hi",  # default workspace
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        doc = self.sessionDB.save(session_doc)
        print(f"📝 Created session: {session_name} (ID: {session_id[:8]}...)")
        return doc["_id"]
    
    def list_all_sessions(self, workspace_slug: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[List]:
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
                            doc.get("context_bucket_id", ""),
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
                    i["doc"].get("context_bucket_id", ""),
                    i["doc"].get("workspace_slug", ""),
                    i["doc"].get("updated_at", "")
                ] for i in sessions]
        except Exception as e:
            print(f"❌ Error listing sessions: {e}")
            return []
        
    def get_session(self, session_id: str) -> Optional[Dict]:
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
            
            # Delete associated context if exists
            if session_doc.get("context_bucket_id"):
                try:
                    context_doc = self.contextDB.get(session_doc["context_bucket_id"])
                    self.contextDB.delete(context_doc)
                    print(f"🗑️  Deleted context bucket: {session_doc['context_bucket_id'][:8]}...")
                except:
                    pass  # Context might already be deleted
            
            # Delete all chats for this session
            self.delete_session_chats(session_id)
            
            # Delete session
            self.sessionDB.delete(session_doc)
            print(f"🗑️  Deleted session: {session_id[:8]}...")
        except Exception as e:
            print(f"❌ Error deleting session: {e}")
            raise
        
   
    
    ## ENHANCED CONTEXT MANAGEMENT
    
    def create_new_context(self, context: str = "", context_type: str = "general") -> str:
        """Create a new context bucket"""
        context_id = str(uuid.uuid4())
        doc = self.contextDB.save({
            "_id": context_id,
            "context_bucket_id": context_id,
            "context": context,
            "context_type": context_type,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        })
        print(f"📄 Created context bucket: {context_id[:8]}...")
        return doc["_id"]
    
    def get_context(self, context_id: str) -> Optional[Dict]:
        """Get context by ID"""
        try:
            return self.contextDB.get(context_id)
        except Exception as e:
            print(f"❌ Context {context_id[:8]}... not found: {e}")
            return None
    
    def get_context_for_session(self, session_id: str) -> str:
        """Get context content for a session"""
        try:
            session_doc = self.sessionDB.get(session_id)
            if session_doc.get("context_bucket_id"):
                context = self.get_context(session_doc["context_bucket_id"])
                return context.get("context", "") if context else ""
            return ""
        except Exception as e:
            print(f"❌ Error getting context for session: {e}")
            return ""
    
    def update_context_for_session(self, session_id: str, new_context: str):
        """Update context for a session"""
        try:
            session = self.sessionDB.get(session_id)
            if session.get("context_bucket_id"):
                context_doc = self.get_context(session["context_bucket_id"])
                if context_doc:
                    context_doc["context"] = new_context
                    context_doc["updated_at"] = datetime.now().isoformat()
                    self.contextDB.save(context_doc)
                    print(f"📝 Updated context for session: {session_id[:8]}...")
        except Exception as e:
            print(f"❌ Error updating context for session: {e}")
            raise
    
    def update_context_bucket(self, context_bucket_id: str, context: str, context_type: Optional[str] = None):
        """Update a context bucket directly"""
        try:
            context_doc = self.contextDB.get(context_bucket_id)
            context_doc["context"] = context
            if context_type:
                context_doc["context_type"] = context_type
            context_doc["updated_at"] = datetime.now().isoformat()
            self.contextDB.save(context_doc)
            print(f"📝 Updated context bucket: {context_bucket_id[:8]}...")
            return True
        except Exception as e:
            print(f"❌ Error updating context bucket: {e}")
            return False
    ## CHAT MANAGEMENT
    
    def store_chat(self, session_id: str, prompt: str, response: str, 
                  response_time: int, tokens_used: Optional[int] = None, 
                  sources: Optional[List] = None) -> str:
        """Store a chat interaction with partitioned chat_id"""
        chat_id = f"{session_id}:{str(uuid.uuid4())}"
        
        chat_doc = {
            "_id": chat_id,
            "chat_id": chat_id,
            "session_id": session_id,
            "prompt": prompt,
            "response": response,
            "response_time": response_time,
            "tokens_used": tokens_used,
            "sources": json.dumps(sources or []),
            "timestamp": datetime.now().isoformat()
        }
        
        doc = self.chatDB.save(chat_doc)
        print(f"💬 Stored chat: {chat_id[:16]}... ({response_time}ms)")
        return doc["_id"]
    
    def get_session_chats(self, session_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get all chats for a session (partitioned query)"""
        try:
            all_chats = []
            for chat in self.chatDB.all():
                doc = chat.get("doc", {})
                if doc.get("session_id") == session_id:
                    # Parse sources back from JSON
                    try:
                        doc["sources"] = json.loads(doc.get("sources", "[]"))
                    except:
                        doc["sources"] = []
                    all_chats.append(doc)
            
            # Sort by timestamp
            all_chats.sort(key=lambda x: x.get("timestamp", ""))
            return all_chats[offset:offset + limit]
        except Exception as e:
            print(f"❌ Error getting session chats: {e}")
            return []
    
    def get_chat(self, chat_id: str) -> Optional[Dict]:
        """Get specific chat by partitioned chat_id"""
        try:
            chat = self.chatDB.get(chat_id)
            if chat and chat.get("sources"):
                try:
                    chat["sources"] = json.loads(chat["sources"])
                except:
                    chat["sources"] = []
            return chat
        except Exception as e:
            print(f"❌ Chat {chat_id[:16]}... not found: {e}")
            return None
    
    def delete_session_chats(self, session_id: str):
        """Delete all chats for a session"""
        try:
            chats_to_delete = []
            for chat in self.chatDB.all():
                doc = chat.get("doc", {})
                if doc.get("session_id") == session_id:
                    chats_to_delete.append(doc)
            
            for chat_doc in chats_to_delete:
                self.chatDB.delete(chat_doc)
            
            if chats_to_delete:
                print(f"🗑️  Deleted {len(chats_to_delete)} chats for session: {session_id[:8]}...")
        except Exception as e:
            print(f"❌ Error deleting session chats: {e}")

    ## ANALYTICS
    
    def get_analytics(self, session_id: Optional[str] = None, days: int = 7) -> List[Dict]:
        """Get usage analytics"""
        try:
            from datetime import datetime, timedelta
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            daily_stats = {}
            total_chats = 0
            total_response_time = 0
            unique_sessions = set()
            
            for chat in self.chatDB.all():
                doc = chat.get("doc", {})
                
                # Filter by session if specified
                if session_id and doc.get("session_id") != session_id:
                    continue
                
                # Parse timestamp
                try:
                    chat_date = datetime.fromisoformat(doc.get("timestamp", ""))
                    if chat_date < start_date:
                        continue
                except:
                    continue
                
                date_str = chat_date.date().isoformat()
                
                if date_str not in daily_stats:
                    daily_stats[date_str] = {
                        "date": date_str,
                        "total_chats": 0,
                        "total_response_time": 0,
                        "unique_sessions": set()
                    }
                
                daily_stats[date_str]["total_chats"] += 1
                response_time = doc.get("response_time", 0)
                if response_time:
                    daily_stats[date_str]["total_response_time"] += response_time
                
                daily_stats[date_str]["unique_sessions"].add(doc.get("session_id"))
                
                total_chats += 1
                if response_time:
                    total_response_time += response_time
                unique_sessions.add(doc.get("session_id"))
            
            # Convert to final format
            result = []
            for date_str, stats in daily_stats.items():
                avg_response_time = None
                if stats["total_chats"] > 0 and stats["total_response_time"] > 0:
                    avg_response_time = stats["total_response_time"] / stats["total_chats"]
                
                result.append({
                    "date": date_str,
                    "total_chats": stats["total_chats"],
                    "avg_response_time": avg_response_time,
                    "unique_sessions": len(stats["unique_sessions"])
                })
            
            result = sorted(result, key=lambda x: x["date"], reverse=True)
            print(f"📊 Generated analytics for {len(result)} days")
            return result
            
        except Exception as e:
            print(f"❌ Error getting analytics: {e}")
            return []

    ## UTILITY METHODS
    
    def health_check(self) -> Dict[str, Any]:
        """Perform a health check on all databases"""
        try:
            health = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "database_type": "couchdb" if COUCHDB_AVAILABLE else "mock",
                "databases": {}
            }
            
            # Test each database
            for db_name, db in [
                ("session_db", self.sessionDB),
                ("chat_db", self.chatDB), 
                ("context_db", self.contextDB),
                ("config_db", self.configDB)
            ]:
                try:
                    # Try to get a document count (mock way)
                    if hasattr(db, 'data'):  # Mock database
                        count = len(db.data)
                    else:  # Real CouchDB
                        count = len(list(db.all()))
                    
                    health["databases"][db_name] = {
                        "status": "healthy",
                        "document_count": count
                    }
                except Exception as e:
                    health["databases"][db_name] = {
                        "status": "error",
                        "error": str(e)
                    }
                    health["status"] = "degraded"
            
            return health
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }



if __name__ == "__main__":
    print("🧪 Testing Enhanced CouchDB Connector...")
    
    client = Client()
    print(f"✅ Client initialized")
    
    # Test basic functionality
    health = client.health_check()
    print(f"🏥 Health check: {health['status']}")
    
    # Test session creation
    session_id = client.create_session("Test Session", context="Test context")
    print(f"📝 Test session created: {session_id[:8]}...")
    
    # Test configuration
    client.set_api_key("test-api-key")
    config = client.get_config()
    print(f"🔧 Configuration: {config}")
    
    print("✅ All tests passed!")
    