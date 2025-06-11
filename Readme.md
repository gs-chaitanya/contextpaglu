# FastAPI Application

This is a simple FastAPI application.

## Requirements

- Python 3.8+
- [pip](https://pip.pypa.io/en/stable/)

## Setup

1. **Clone the repository** (if applicable):

   ```sh
   git clone <your-repo-url>
   cd <your-project-directory>
   ```

2. **Create and activate a virtual environment** (optional but recommended):

   ```sh
   python -m venv qcomm
   # On Windows
   qcomm\Scripts\activate
   # On Unix or MacOS
   source qcomm/bin/activate
   ```

3. **Install dependencies**:

   ```sh
   pip install -r requirements.txt
   ```

4. **Run the application**:

   ```sh
   uvicorn app.main:app --reload
   ```

5. **Access the API**:

   Open your browser and go to [http://127.0.0.1:8000](http://127.0.0.1:8000)

   - Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Redoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

## Project Structure

```
app/
    __init__.py
    main.py
requirements.txt
```

## License

MIT