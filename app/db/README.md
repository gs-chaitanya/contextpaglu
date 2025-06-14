Here is a complete `README.md` for your `pycouchdb`-based client module:

---

````markdown
# 🛠️ CouchDB Client Wrapper with PyCouchDB

This is a simple Python client that wraps basic **CRUD operations** for managing **sessions** and **contexts** stored in **Apache CouchDB**. It uses the [pycouchdb](https://pypi.org/project/pycouchdb/) library.

---

## 📦 Features

- Create, list, update, and delete **sessions**
- Create and update associated **context** for each session
- Automatically links sessions to a context document
- CouchDB connection via `http://admin:admin123@localhost:5984/`
- (Prepares for future chat operations with `chat_db`)

---

## 🔧 Requirements

- Python 3.6+
- [pycouchdb](https://pypi.org/project/pycouchdb/)
- A running CouchDB instance with the following databases:
  - `session_db`
  - `context_db`
  - `chat_db` *(not yet used)*

Install dependencies:

```bash
pip install pycouchdb
````

---

## 🚀 Usage

### 🛠️ Initialize the Client

```python
from client import Client

client = Client()
```

### 📌 Session Operations

#### Create a session

```python
session_id = client.create_session("My First Session")
```

#### List all sessions

```python
sessions = client.list_all_sessions()
# [["session_id", "session_name", "context_id"], ...]
```

#### Update session name

```python
client.update_session_name(session_id, "Renamed Session")
```

#### Delete session (and its context)

```python
client.delete_session(session_id)
```

---

### 🧠 Context Operations

#### Create a new context

```python
context_id = client.create_new_context()
```

#### Get context by ID

```python
context_doc = client.get_context(context_id)
# { "_id": ..., "context": ... }
```

#### Get context linked to a session

```python
context_text = client.get_context_for_session(session_id)
```

#### Update context for a session

```python
client.update_context_for_session(session_id, "Updated context data")
```

---

## 🧪 Example

```python
client = Client()

# Create session and add context
sid = client.create_session("Demo Session")
client.update_context_for_session(sid, "This is a test context.")

# Fetch and print
print(client.get_context_for_session(sid))

# Update session name
client.update_session_name(sid, "Updated Name")

# List all sessions
print(client.list_all_sessions())

# Delete session
client.delete_session(sid)
```

---

## 📁 Project Structure

```
project/
│
├── client.py          # Contains the Client class
└── README.md          # This file
```

---

## ⚠️ Notes

* The `chat_db` database is initialized but not yet used in this version.
* Ensure CouchDB is running and accessible on `http://localhost:5984/` with credentials `admin:admin123`.
* Create required databases manually or using the CouchDB UI if they don't exist.

---

## 📜 License

MIT License (or specify your license here)

```

---

Let me know if you want this saved to a file or tailored for usage as a package/module.
```
