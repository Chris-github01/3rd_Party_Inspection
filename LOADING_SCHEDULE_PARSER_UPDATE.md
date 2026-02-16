# Loading Schedule Parser - Update Guide

## You're Seeing "No Structural Members Detected"

This means:
- ✅ Your Python parser service IS deployed and working
- ⚠️ The PDF format isn't being recognized by the current parser
- 💡 Solution: Update to the improved parser version

---

## Quick Update Steps (2 minutes)

### If Using Render.com:

1. **Go to your Render dashboard**
   - Find your `loading-schedule-parser` service

2. **Trigger a manual redeploy**
   - Click "Manual Deploy" → "Deploy latest commit"
   - OR: Click "Settings" → "Manual Deploy" → "Clear build cache & deploy"

3. **Wait 2-3 minutes** for deployment

4. **Try uploading your PDF again**

### If Using Railway/Fly.io:

1. **Redeploy your service** using their dashboard or CLI
2. **Wait for deployment to complete**
3. **Try uploading again**

---

## What's Improved in the Latest Parser

### 1. Better Format Detection
- ✅ Handles spaces in section sizes: "610 UB 125" → "610UB125"
- ✅ Detects more section types: PFC, EA, UA (in addition to UB, UC, etc.)
- ✅ More flexible FRR pattern matching: "FRR: 60", "R60", "60 min", "60"

### 2. Table Extraction
- ✅ Tries table extraction first (better for structured PDFs)
- ✅ Falls back to position-based parsing if tables don't work

### 3. Debug Information
- ✅ Returns sample rows from your PDF
- ✅ Shows which patterns were/weren't found
- ✅ Helps diagnose format issues

---

## Test With CSV First (No Parser Update Needed)

To verify the system works, test with the included CSV file:

1. **Go to Loading Schedule tab**
2. **Upload:** `sample_loading_schedule.csv`
3. **Expected result:** 6 items extracted successfully

This confirms your database and edge functions are working correctly.

---

## Supported PDF Formats

### ✅ Best Results With:
- **Text-based PDFs** (not scanned images)
- **Table-structured data** with clear columns
- **Standard notation:**
  - Section sizes: `610UB125`, `310UC97`, `200x200SHS`, `150PFC`
  - FRR ratings: `60`, `90`, `120`, `FRR-60`, `R90`
  - DFT values: `500 microns`, `750μm`, `1000`

### Format Requirements:
Each row must contain:
1. **Section size** - Following standard notation (number + type + size)
2. **FRR rating** - Fire resistance rating in minutes (30-240)

Optional but helpful:
- **Member mark** - e.g., B10, C5, BR1
- **DFT** - Dry film thickness in microns (300-3000)
- **Element type** - beam, column, brace
- **Coating product** - e.g., Nullifire S607

### ❌ Won't Work With:
- Scanned images or photos
- Hand-written documents
- Non-standard notation
- Missing FRR ratings or section sizes

---

## Understanding Parser Output

### Success Scenarios:

**All items extracted:**
```
✓ Parsed 24 items
```

**Some items need review:**
```
✓ Parsed 24 items
Note: Some items need manual review due to missing data
```
(This happens when member marks or DFT values are missing)

### Failure Scenarios:

**No structural members detected:**
- PDF was parsed but no valid rows found
- Check the browser console for "debug_samples" to see what was found
- May need to adjust PDF format or use CSV

**Parser service unavailable:**
- Service not deployed or not responding
- May be cold-starting (wait 60 seconds)
- Check service logs in Render/Railway dashboard

---

## Troubleshooting Guide

### Issue: "No structural members detected"

**Check 1: Is it a loading schedule?**
- Open the PDF
- Verify it has columns for section sizes and FRR ratings
- Confirm it's not a general drawing or specification

**Check 2: Is the text readable?**
```bash
# Quick test: Try copying text from the PDF
# If you can copy/paste text → Good (text-based)
# If copying gives gibberish → Bad (scanned image)
```

**Check 3: Check the browser console**
```javascript
// Look for: "Parse result with debug info"
// Examine the "debug_samples" array
// See which patterns were/weren't found
```

**Check 4: Try the updated parser**
- Redeploy with latest code from `python-parser/parser.py`
- Updated version has better pattern matching

### Issue: Parser is slow (30-60 seconds)

**This is normal for free tier services:**
- Render free tier: Cold starts after 15 minutes of inactivity
- Railway free tier: Cold starts after 10 minutes
- First request takes 30-60s, subsequent requests are fast

**Solutions:**
- Wait for first request to complete
- Upgrade to paid tier for always-on service
- Use CSV files (instant, no cold start)

### Issue: Different PDF format

**If your PDF uses a different format:**

1. **Check debug samples in console:**
   ```
   Look for: parseResult.metadata.debug_samples
   ```

2. **Identify the pattern:**
   - How are section sizes formatted?
   - How are FRR ratings shown?
   - What's the column structure?

3. **Update the parser regex patterns:**
   - Edit `python-parser/parser.py`
   - Update `SECTION_REGEX` or `FRR_REGEX`
   - Redeploy

4. **Or convert to CSV:**
   - Export your loading schedule as CSV
   - Use format: `Member Mark, Section Size, FRR (mins), DFT (microns)`
   - See `sample_loading_schedule.csv` for example

---

## Manual Deployment (If Auto-Deploy Doesn't Work)

### Option 1: Upload Updated Files to Render

1. **Download latest code:**
   - Get `python-parser/parser.py` from this project
   - Ensure you have `main.py` and `requirements.txt`

2. **In Render dashboard:**
   - Go to your service settings
   - Delete the service
   - Create new service
   - Upload the `python-parser/` folder
   - Configure as before

### Option 2: Deploy via Git

```bash
# If you have the code in a git repo:
cd python-parser
git add .
git commit -m "Update parser with better format detection"
git push

# Render/Railway will auto-deploy from the push
```

### Option 3: Deploy with Docker

```bash
cd python-parser
docker build -t loading-schedule-parser .
docker run -p 10000:10000 loading-schedule-parser
```

---

## CSV Alternative (Always Works)

If PDF parsing continues to be problematic, use CSV format:

### CSV Format:
```csv
Member Mark,Section Size,FRR (mins),DFT (microns),Element Type,Coating Product
B10,610UB125,90,750,beam,Nullifire S607
C5,310UC97,120,1000,column,Nullifire S607
BR1,200x200SHS,60,500,brace,Nullifire S607
```

### Benefits:
- ✅ Instant parsing (no cold start)
- ✅ 100% reliable
- ✅ No Python service required
- ✅ Easy to create from spreadsheets

### Export from Excel/Sheets:
1. Open your loading schedule
2. Format columns as shown above
3. Save As → CSV
4. Upload to the app

---

## Getting More Help

### 1. Check Service Logs

**Render:**
- Go to your service → "Logs" tab
- Look for errors during parsing

**Railway:**
- Go to your service → "Deployments" → Click latest → "Logs"

### 2. Check Browser Console

Press F12 and look for:
- "Parse result with debug info"
- "debug_samples" array showing what was found
- Any error messages

### 3. Test Parser Directly

```bash
curl -X POST https://your-service-url.com/parse-loading-schedule \
  -F "file=@your_schedule.pdf"
```

Should return JSON with:
- status: "completed" or "failed"
- items: array of extracted items
- metadata: debug information

### 4. Verify Service Health

```bash
curl https://your-service-url.com/health
```

Should return:
```json
{"status": "healthy"}
```

---

## Summary

1. ✅ **Parser service is deployed** (you're past the 404 error)
2. ⚠️ **Format not recognized** - update to latest parser
3. 💡 **Quick fix:** Redeploy with updated code
4. 🔄 **Alternative:** Use CSV format (always works)

The updated parser has better pattern matching and will help diagnose format issues through debug output.
