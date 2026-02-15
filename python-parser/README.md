# Loading Schedule Parser - Python Service

Deterministic PDF parser for structural steel loading schedules using pdfplumber.

## Features

- Position-based table reconstruction
- Row stitching for split content
- Section size normalization
- FRR format standardization (e.g., 60 → 60/-/-)
- DFT extraction in microns
- Coating product detection
- Confidence scoring
- Page and line citations

## Deployment to Render

### Option 1: Using Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your Git repository or upload this folder
4. Configure:
   - **Name:** loading-schedule-parser
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
5. Click "Create Web Service"
6. Copy the service URL (e.g., `https://loading-schedule-parser.onrender.com`)

### Option 2: Using Render Blueprint

1. Place `render.yaml` in your repository root
2. Connect repository to Render
3. Render will auto-detect and deploy

## Local Testing

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Test endpoint:
```bash
curl -X POST http://localhost:8000/parse-loading-schedule \
  -F "file=@sample.pdf"
```

## API Endpoints

### POST /parse-loading-schedule

Upload a PDF file and receive parsed items.

**Request:**
- Content-Type: multipart/form-data
- Body: PDF file

**Response:**
```json
{
  "status": "completed",
  "items_extracted": 42,
  "items": [
    {
      "page": 1,
      "line": 5,
      "member_mark": "B10",
      "section_size_normalized": "610UB125",
      "frr_minutes": 60,
      "frr_format": "60/-/-",
      "dft_required_microns": 850,
      "confidence": 0.95
    }
  ],
  "metadata": {
    "total_pages": 3
  }
}
```

## Environment Variables

None required. Service runs standalone.

## After Deployment

1. Copy your Render service URL
2. Update the Supabase edge function `parse-loading-schedule`
3. Set `PYTHON_PARSER_URL` environment variable in edge function to your Render URL
