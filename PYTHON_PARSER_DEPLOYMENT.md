# Python Parser Deployment Guide

The loading schedule parser uses a Python service with pdfplumber for deterministic PDF parsing.

## Quick Start

The Python parser service is located in the `python-parser/` directory and must be deployed separately.

### Option 1: Deploy to Render (Recommended)

1. **Sign up for Render** at https://render.com (free tier available)

2. **Create a new Web Service:**
   - Click "New +" → "Web Service"
   - Connect your repository or manually upload
   - Set the following:
     - **Name:** `loading-schedule-parser`
     - **Runtime:** Python 3
     - **Root Directory:** `python-parser`
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`

3. **Deploy and get your URL:**
   - Render will provide a URL like: `https://loading-schedule-parser.onrender.com`
   - Copy this URL

4. **Configure Supabase Edge Function:**
   - The edge function `parse-loading-schedule` uses the environment variable `PYTHON_PARSER_URL`
   - By default it points to: `https://loading-schedule-parser.onrender.com`
   - If you used a different URL, you'll need to update line 10 in:
     `supabase/functions/parse-loading-schedule/index.ts`

### Option 2: Deploy to Railway, Fly.io, or other platforms

The service can be deployed to any platform that supports Python web apps:

- **Railway:** Auto-detects Python and deploys from `requirements.txt`
- **Fly.io:** Use `fly launch` in the `python-parser` directory
- **Heroku:** Push to Heroku with Python buildpack

### Option 3: Local Testing

For testing locally:

```bash
cd python-parser
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then update the edge function to use `http://localhost:8000` (only for local development).

## Architecture

```
Upload PDF
   ↓
Supabase Edge Function (parse-loading-schedule)
   ↓
Python Parser Service (Render/Railway/etc)
   ↓
pdfplumber deterministic extraction
   ↓
JSON response with structured items
   ↓
Edge function stores to database
```

## Features

The Python parser provides:

- **Position-based extraction** - Uses X/Y coordinates to reconstruct tables
- **Row stitching** - Handles broken rows (e.g., "10" + "0" → "100")
- **Section normalization** - Converts "610 UB 125" → "610UB125"
- **FRR standardization** - Converts "60" → "60/-/-"
- **DFT detection** - Extracts thickness in microns
- **Coating product detection** - Identifies fire protection products
- **Confidence scoring** - Each item gets a confidence score
- **Validation** - Only structural members with valid FRR are returned

## CSV Files

CSV files are still parsed directly in the edge function without calling the Python service. Only PDF files use the Python parser.

## Troubleshooting

**Problem:** Getting 0 items from PDF parsing

**Solution:**
1. Check Render service logs to see if it's receiving requests
2. Check Supabase edge function logs for errors calling the Python service
3. Verify the Python service URL is correct
4. Test the Python service directly with curl:
   ```bash
   curl -X POST https://your-service.onrender.com/parse-loading-schedule \
     -F "file=@sample.pdf"
   ```

**Problem:** Python service is slow or times out

**Solution:**
- Render free tier spins down after inactivity (cold start ~30 seconds)
- Upgrade to paid tier for always-on service
- Or accept the cold start delay on first use

**Problem:** "No structural members detected"

**Solution:**
- The PDF may not contain valid structural steel data
- The schedule format may be incompatible
- Check the PDF manually to verify it has:
  - Section sizes (e.g., 610UB125)
  - FRR ratings (e.g., R60, 60 minutes)
  - Readable text (not scanned images)
