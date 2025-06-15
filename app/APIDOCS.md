# Enhanced AnythingLLM FastAPI Server API Documentation

A FastAPI server that provides a REST API interface for managing chat sessions with AnythingLLM integration and CouchDB backend storage.

## Table of Contents

- [Overview](#overview)
- [Installation & Setup](#installation--setup)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Health & Configuration](#health--configuration)
  - [Session Management](#session-management)
  - [Context Management](#context-management)
  - [Chat Operations](#chat-operations)
- [Request/Response Models](#requestresponse-models)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

This API server provides:
- Session management for chat conversations
- AnythingLLM workspace integration
- Context bucket management
- Real-time chat capabilities
- CouchDB-based data persistence

**Version:** 2.0.0  
**Base Technology:** FastAPI with AnythingLLM integration

## Installation & Setup

### Prerequisites
- Python 3.8+
- AnythingLLM instance running on `http://localhost:3001`
- CouchDB database
- Required dependencies (FastAPI, httpx, pydantic, etc.)

### Environment Setup
1. Install dependencies:
```bash
pip install fastapi httpx pydantic uvicorn
```

2. Start AnythingLLM service on port 3001
3. Configure CouchDB connection
4. Run the server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Base URL

```
http://localhost:8000
```

## Authentication

The server uses a Bearer token for AnythingLLM API calls:
- **Token:** `JQF2CXB-MJ3MTTH-N4E5ZAJ-R6T628Z` (configured in code)
- All AnythingLLM requests include: `Authorization: Bearer <token>`

## API Endpoints

### Health & Configuration

#### `GET /`
**Description:** Root endpoint returning a simple greeting.

**Response:**
```json
{
  "message": "hello"
}
```

#### `GET /health`
**Description:** Health check endpoint providing system status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-15T10:30:00.000000",
  "anythingllm_url": "http://localhost:3001/api/v1",
  "database_schema": "couchdb_partitioned",
  "databases": {
    "sessionDB": true,
    "chatDB": true,
    "configDB": true
  }
}
```

#### `GET /config`
**Description:** Retrieve current server configuration.

**Response:**
```json
{
  "anythingllm_url": "http://localhost:3001/api/v1",
  "port": 8000,
  "api_key_configured": true
}
```

#### `POST /config/api-key`
**Description:** Configure AnythingLLM API key.

**Request Body:**
```json
{
  "apiKey": "your-api-key-here"
}
```

**Response:**
```json
{
  "message": "API key configured successfully"
}
```

### Session Management

#### `GET /create_session/{session_name}`
**Description:** Create a new chat session and corresponding AnythingLLM workspace.

**Parameters:**
- `session_name` (path): Name for the new session

**Response:**
```json
{
  "session_id": "fe51eea2c06c4e3582552726236d7dd4"
}
```

**Side Effects:**
- Creates a new workspace in AnythingLLM with name `{session_name}workspace`

#### `POST /create_new_session_from_chat`
**Description:** Create a new session from an existing chat conversation.

**Parameters:**
- `session_name` (query): Name for the new session
- `service_name` (query): Name of the originating service
- `conversation_id` (query): ID of the source conversation

**Response:**
```json
{
  "session_id": "new-session-id"
}
```

#### `GET /find_session_by_chat/{service_name}/{conversation_id}`
**Description:** Find a session by service name and conversation ID.

**Parameters:**
- `service_name` (path): Service name
- `conversation_id` (path): Conversation ID

**Response:**
```json
{
  "session_id": "found-session-id"
}
```
*Returns empty string if not found*

#### `GET /list_all_sessions`
**Description:** Retrieve all available chat sessions.

**Response:**
```json
{
  "sessions": [
    {
      "session_id": "session-1",
      "session_name": "My Chat Session",
      "created_at": "2025-06-15T10:00:00Z",
      "last_updated": "2025-06-15T10:30:00Z"
    }
  ]
}
```

#### `POST /update_session_name/{session_id}`
**Description:** Update the name of an existing session.

**Parameters:**
- `session_id` (path): Session ID to update

**Request Body:**
```json
{
  "new_session_name": "Updated Session Name"
}
```

**Response:**
```json
{
  "message": "Session name updated successfully"
}
```

#### `DELETE /delete_session/{session_id}`
**Description:** Delete a chat session.

**Parameters:**
- `session_id` (path): Session ID to delete

**Response:**
```json
{
  "message": "Session deleted"
}
```

### Context Management

#### `GET /get_context/{session_id}`
**Description:** Retrieve context information for a session.

**Parameters:**
- `session_id` (path): Session ID

**Response:**
```json
{
  "context": "Context information for the session"
}
```

#### `POST /update_context/{session_id}`
**Description:** Update context for a specific session.

**Parameters:**
- `session_id` (path): Session ID

**Request Body:**
```json
{
  "new_context": "Updated context information"
}
```

**Response:**
```json
{
  "message": "Context updated successfully"
}
```

#### `POST /evaluate_context`
**Description:** Evaluate context information.

**Headers:**
- `newchat` (required): Context data to evaluate

**Response:**
```json
{
  "status": "Context evaluated",
  "context": "evaluated-context-data"
}
```

### Chat Operations

#### `GET /get_all_chats/{session_id}`
**Description:** Retrieve all chat messages for a session.

**Parameters:**
- `session_id` (path): Session ID

**Response:**
```json
{
  "response": [
    {
      "chat_id": "chat-1",
      "prompt": "User message",
      "response": "Assistant response",
      "timestamp": "2025-06-15T10:30:00Z"
    }
  ]
}
```

#### `POST /local/chat/{session_id}`
**Description:** Send a chat message to a session and get AI response.

**Parameters:**
- `session_id` (path): Session ID for the chat

**Request Body:**
```json
{
  "prompt": "Your message here",
  "mode": "chat"
}
```

**Response:**
```json
{
  "local_llm_session_id": "session-id",
  "prompt": "Your message here",
  "response": "AI assistant response",
  "response_time_ms": 1250,
  "sources": [
    {
      "title": "Source Document",
      "url": "https://example.com/source"
    }
  ]
}
```

## Request/Response Models

### ChatMessage
```json
{
  "prompt": "string (required)",
  "mode": "string (default: 'chat')"
}
```

### ContextUpdate
```json
{
  "new_context": "string (required)"
}
```

### SessionRename
```json
{
  "new_session_name": "string (required)"
}
```

### SessionCreate
```json
{
  "session_name": "string (required)",
  "workspace_slug": "string (optional)",
  "context": "string (optional)"
}
```

### ApiKeyConfig
```json
{
  "apiKey": "string (required)"
}
```

## Error Handling

The API uses standard HTTP status codes:

- **200**: Success
- **400**: Bad Request (missing required parameters)
- **404**: Not Found (session/resource doesn't exist)
- **500**: Internal Server Error
- **503**: Service Unavailable (AnythingLLM connection failed)
- **504**: Gateway Timeout (AnythingLLM request timeout)

### Error Response Format
```json
{
  "detail": "Error description"
}
```

### Common Error Scenarios

1. **Session Not Found (404)**
   ```json
   {
     "detail": "Session not found"
   }
   ```

2. **AnythingLLM Connection Error (503)**
   ```json
   {
     "detail": "Failed to connect to AnythingLLM: Connection refused"
   }
   ```

3. **Timeout Error (504)**
   ```json
   {
     "detail": "AnythingLLM request timeout"
   }
   ```

## Examples

### Creating and Using a Chat Session

1. **Create a new session:**
```bash
curl -X GET "http://localhost:8000/create_session/MyProject"
```

2. **Send a chat message:**
```bash
curl -X POST "http://localhost:8000/local/chat/fe51eea2c06c4e3582552726236d7dd4" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, how can I improve my code?",
    "mode": "chat"
  }'
```

3. **Update session context:**
```bash
curl -X POST "http://localhost:8000/update_context/fe51eea2c06c4e3582552726236d7dd4" \
  -H "Content-Type: application/json" \
  -d '{
    "new_context": "This is a Python development project focused on API optimization."
  }'
```

### Configuration Management

**Configure API Key:**
```bash
curl -X POST "http://localhost:8000/config/api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your-anythingllm-api-key"
  }'
```

**Check System Health:**
```bash
curl -X GET "http://localhost:8000/health"
```

## Notes

- The server automatically creates AnythingLLM workspaces when sessions are created
- All chat responses include timing information and source references when available
- Session context is automatically included in chat messages when configured
- The server supports CORS for all origins (configured for development)
- Database operations use CouchDB with partitioned design for scalability

## Development

To extend this API:
1. Add new endpoints following the FastAPI pattern
2. Update the database client for new data operations
3. Ensure proper error handling for AnythingLLM integration
4. Add corresponding Pydantic models for request/response validation

## Support

For issues related to:
- **AnythingLLM Integration**: Check AnythingLLM service status and API key configuration
- **Database Operations**: Verify CouchDB connection and database schemas
- **API Errors**: Check server logs and ensure all dependencies are installed