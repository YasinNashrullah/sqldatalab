"""
SQL Data Lab Backend Runner.
Run this script to start the FastAPI server with DuckDB:
    python run.py
"""
import sys
from pathlib import Path

# Ensure project root is in sys.path
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print(" Starting SQL Data Lab Backend Server (FastAPI + DuckDB)")
    print(" API URL: http://127.0.0.1:8000")
    print(" API Docs: http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
