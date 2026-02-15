from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from parser import parse_loading_schedule
import shutil
import os
import tempfile
from typing import Dict, Any

app = FastAPI(
    title="Loading Schedule Parser",
    description="Deterministic PDF parser for structural steel loading schedules",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "Loading Schedule Parser",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/parse-loading-schedule")
async def parse_loading_schedule_endpoint(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Parse a loading schedule PDF file

    Returns:
        {
            "status": "completed" | "failed",
            "items_extracted": int,
            "items": [...],
            "metadata": {...}
        }
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    temp_file = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = temp_file.name

        result = parse_loading_schedule(temp_path)

        os.unlink(temp_path)

        return result

    except Exception as e:
        if temp_file and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)

        raise HTTPException(
            status_code=500,
            detail=f"Parser error: {str(e)}"
        )
    finally:
        if file.file:
            file.file.close()
