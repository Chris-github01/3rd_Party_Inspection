from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from parser import parse_loading_schedule
import shutil
import os
import tempfile
import httpx
from typing import Dict, Any

app = FastAPI(
    title="Loading Schedule Parser",
    description="Deterministic PDF parser for structural steel loading schedules with SB/WF support",
    version="2.0.0-sb-wf-support"
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
        "version": "2.0.0-sb-wf-support",
        "features": ["SB sections", "WF sections", "Multiple FRR formats", "Enhanced debug output"]
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0-sb-wf-support",
        "parser_updated": "2026-03-02"
    }

class ParseURLRequest(BaseModel):
    pdf_url: str

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

@app.post("/parse")
async def parse_from_url(request: ParseURLRequest) -> Dict[str, Any]:
    """
    Parse a loading schedule PDF from URL

    Args:
        request: JSON body with pdf_url field

    Returns:
        {
            "status": "completed" | "failed",
            "items_extracted": int,
            "items": [...],
            "metadata": {...}
        }
    """
    temp_file = None

    try:
        # Download PDF from URL
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(request.pdf_url)
            response.raise_for_status()

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(response.content)
            temp_path = temp_file.name

        # Parse the PDF
        result = parse_loading_schedule(temp_path)

        # Clean up
        os.unlink(temp_path)

        return result

    except httpx.HTTPStatusError as e:
        if temp_file and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download PDF: {e.response.status_code}"
        )
    except httpx.RequestError as e:
        if temp_file and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to download PDF: {str(e)}"
        )
    except Exception as e:
        if temp_file and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        raise HTTPException(
            status_code=500,
            detail=f"Parser error: {str(e)}"
        )
