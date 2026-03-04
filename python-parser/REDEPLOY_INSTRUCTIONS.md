# Python Parser - Redeploy Instructions

## 🚨 CRITICAL: Parser Has Been Updated

The Python parser (`parser.py`) has been significantly improved to be more flexible. **You MUST redeploy it to Render for the changes to take effect.**

---

## What Changed

### Before (TOO STRICT):
- ❌ Required BOTH section size AND FRR rating in every row
- ❌ Rejected rows missing any optional fields
- ❌ Couldn't handle FRR in headers

### After (FLEXIBLE):
- ✅ Extracts ANY row with a section size (only requirement)
- ✅ FRR is optional - can be in header, row, or null
- ✅ Missing fields set to null and marked for review
- ✅ Intelligent confidence scoring

---

## Redeploy to Render

### Method 1: Auto-Deploy (if Git configured)

1. **Commit the updated parser:**
   ```bash
   git add python-parser/parser.py
   git commit -m "Fix: Make parser more flexible - extract all rows with section sizes"
   git push
   ```

2. **Render will auto-deploy** (if connected to GitHub)

### Method 2: Manual Deploy

1. **Go to Render Dashboard:**
   - Login to: https://dashboard.render.com
   - Find your Python parser service

2. **Trigger Manual Deploy:**
   - Click "Manual Deploy" → "Deploy latest commit"
   - Or: Click "Deploy" → "Clear build cache & deploy"

3. **Wait for deployment:**
   - Watch logs for "Build successful"
   - Service should restart automatically

### Method 3: Fresh Deployment

If the parser isn't deployed yet:

1. **Create new Web Service on Render:**
   - Name: `loading-schedule-parser`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **Environment Variables:**
   - None required (parser is stateless)

3. **Deploy from:**
   - GitHub repo: Your repo
   - Branch: `main`
   - Root Directory: `python-parser/`

---

## Verify Deployment

### 1. Check Parser Service is Running

```bash
curl https://your-parser-service.onrender.com/
```

Should return: `{"status": "ok", "service": "loading-schedule-parser"}`

### 2. Test with Sample File

Upload a PDF with structural members to your app:
- Go to: https://burnratepro.co.nz/inspection
- Login and open a project
- Navigate to "Loading Schedule" tab
- Upload your PDF

Expected result:
- ✅ Members extracted (even if some fields are null)
- ✅ Rows marked for review if incomplete
- ✅ Error message shows what was found (not just "rejected")

### 3. Check Logs on Render

- View logs in Render dashboard
- Look for: "Extracted X items from Y pages"
- If 0 items: Check the debug samples in error message

---

## Troubleshooting

### Issue: "No structural members detected"

**Check the error message details:**
- Does it show sample rows found?
- Are section sizes present in the samples?
- Is the PDF scanned (not selectable text)?

**Solutions:**
1. If text IS selectable but not detected:
   - Parser might not be updated → Redeploy
   - FRR might be in header → Should work now
   - Try CSV format instead

2. If text is NOT selectable:
   - PDF is scanned image
   - Use OCR first or manually create CSV
   - AI fallback will attempt extraction

### Issue: Parser not updating

**Clear Render build cache:**
```bash
# In Render dashboard
Settings → "Clear build cache & deploy"
```

### Issue: Service crash after deployment

**Check requirements.txt:**
```txt
fastapi==0.104.1
uvicorn==0.24.0
pdfplumber==0.10.3
```

**Check main.py imports:**
```python
from parser import parse_loading_schedule
```

---

## Current Parser Version

**File:** `python-parser/parser.py`
**Last Updated:** March 3, 2026
**Key Function:** `is_valid_structural_row(text, require_frr=False)`
**Flexibility:** HIGH - Extracts all rows with section sizes

---

## Edge Function Configuration

The edge function `parse-pdf` calls your Python parser. Ensure it has the correct environment variable:

```bash
# In Supabase Edge Functions
PYTHON_PARSER_URL=https://your-parser-service.onrender.com
```

Check with:
```bash
supabase secrets list
```

---

## Testing Checklist

After redeploying, test with PDFs that have:

- ✅ FRR in column header (e.g., "R60 Hazard Rating")
- ✅ FRR in individual rows
- ✅ Missing DFT values
- ✅ Missing member marks
- ✅ Various section formats (UB, UC, SHS, RHS, etc.)
- ✅ Non-standard column names

All should extract successfully, with incomplete rows marked `needs_review: true`.

---

## Quick Deploy Commands

```bash
# 1. Navigate to parser directory
cd python-parser/

# 2. Test locally (optional)
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Commit changes
git add parser.py
git commit -m "Update parser: flexible extraction"
git push

# 4. Watch Render logs
# Go to Render dashboard → Your service → Logs
```

---

## Support

If deployment fails:
1. Check Render service logs
2. Verify requirements.txt dependencies install
3. Test parser locally first
4. Check Python version (should be 3.9+)

Once redeployed, your parser will extract members much more liberally! 🎉
