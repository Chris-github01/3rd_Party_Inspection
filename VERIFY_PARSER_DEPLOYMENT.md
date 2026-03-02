# Verify Parser Deployment

## Quick Check: Is Your Parser Updated?

### Step 1: Find Your Parser URL

Check your Supabase Edge Function environment variables for `PYTHON_PARSER_URL`.

It should look like:
- `https://your-service.onrender.com`
- `https://your-service.up.railway.app`
- Or similar

### Step 2: Check Version

Visit: `YOUR_PARSER_URL/` (the root endpoint)

**If you see version 2.0.0:**
```json
{
  "service": "Loading Schedule Parser",
  "status": "running",
  "version": "2.0.0-sb-wf-support",
  "features": ["SB sections", "WF sections", "Multiple FRR formats", "Enhanced debug output"]
}
```
✅ **Parser is updated!** Your fixes are deployed.

**If you see version 1.0.0:**
```json
{
  "service": "Loading Schedule Parser",
  "status": "running",
  "version": "1.0.0"
}
```
❌ **Parser is NOT updated!** You need to deploy the fixes.

### Step 3: Deploy If Needed

**If parser is NOT updated (version 1.0.0):**

#### Option A: Redeploy on Render
1. Go to https://dashboard.render.com
2. Find your `loading-schedule-parser` service
3. Click "Manual Deploy"
4. Select "Clear build cache & deploy"
5. Wait 2-3 minutes
6. Check version again (should show 2.0.0)

#### Option B: Upload Updated Files to Render
1. Go to your Render service settings
2. Delete old files
3. Upload new files from `python-parser/` folder:
   - `main.py` (updated with version 2.0.0)
   - `parser.py` (updated with SB/WF support)
   - `requirements.txt`
   - `README.md`
4. Trigger manual deploy

#### Option C: First Time Deployment
If you haven't deployed the parser yet, see `DEPLOY_PARSER_FIX.md`.

## Troubleshooting

### Can't Access Parser URL
**Problem:** Browser shows "Can't reach this site"
**Solution:**
- Parser service might not be deployed yet
- Check Render/Railway dashboard to see if service is running
- Verify the URL is correct

### Parser Returns 404
**Problem:** `YOUR_PARSER_URL/` returns 404
**Solution:**
- Service might not be fully started yet
- Wait 30-60 seconds (cold start on free tier)
- Try again

### Service is "Sleeping"
**Problem:** Render shows service as "Sleeping"
**Solution:**
- Free tier services sleep after 15 minutes of inactivity
- First request wakes it up (takes 30-60 seconds)
- Just wait and retry

## After Verification

Once you confirm version is 2.0.0:

1. ✅ Parser has SB/WF support
2. ✅ Parser has enhanced FRR detection
3. ✅ Parser has better error messages
4. ✅ Ready to test your PDF

Go to your app's Loading Schedule tab and try uploading your PDF again!

## Still Getting "No Structural Members" Error?

If the version shows 2.0.0 but parsing still fails:

### Check the Browser Console

1. Open browser console (F12)
2. Look for the parse result object
3. Find `metadata.debug_samples`

Example of what you should see:
```javascript
{
  status: "failed",
  error_code: "NO_STRUCTURAL_ROWS_DETECTED",
  metadata: {
    debug_samples: [
      {
        text: "60SB beam section with coating...",
        has_section: true,  // Should be TRUE if 60SB is detected
        has_frr: false,
        page: 1,
        source: "table"
      }
    ]
  }
}
```

### What the Debug Samples Tell You

**If `has_section: false` even for rows with "60SB":**
- Parser code might not be fully updated
- Try clearing cache and redeploying

**If `has_section: true` but still failing:**
- Something else might be missing (DFT, coating, etc.)
- Rows might be too short
- Check the full debug output

**If `debug_samples` is empty:**
- PDF might not have extractable text
- PDF could be scanned images
- Try CSV format instead

## Next Steps

- ✅ Version 2.0.0 confirmed → Test your PDF
- ❌ Still version 1.0.0 → Deploy the update
- ❌ Can't reach parser → Deploy for first time
- ⚠️ Version 2.0.0 but still fails → Check debug samples in console

For detailed deployment instructions, see:
- `QUICK_START_PARSER_FIX.md` - Fast deployment
- `DEPLOY_PARSER_FIX.md` - Detailed deployment
- `LOADING_SCHEDULE_PARSER_FIX.md` - Technical details
