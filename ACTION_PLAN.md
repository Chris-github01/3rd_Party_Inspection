# Action Plan: Fix Your Loading Schedule Parser

## Current Status

✅ **Frontend Updated** - Error messages now mention "60SB, 600WF"
✅ **Parser Code Updated** - Python parser supports SB/WF sections
✅ **Build Successful** - Application compiles without errors
⚠️ **Deployment Needed** - Python parser service needs the updated code

## What You Need to Do Now

### Step 1: Check Parser Version (1 minute)

Visit your Python parser URL in a browser:
- If you deployed to Render: `https://your-service.onrender.com/`
- Or whatever your `PYTHON_PARSER_URL` is

**Look for the version number:**

✅ **If it shows version 2.0.0:**
```json
{
  "version": "2.0.0-sb-wf-support",
  "features": ["SB sections", "WF sections", ...]
}
```
→ **Skip to Step 3** (parser is already updated)

❌ **If it shows version 1.0.0 or you can't access it:**
```json
{
  "version": "1.0.0"
}
```
→ **Continue to Step 2** (need to deploy)

### Step 2: Deploy Updated Parser (3 minutes)

**If you have an existing Render deployment:**

1. Go to https://dashboard.render.com
2. Find your `loading-schedule-parser` service
3. Click "Manual Deploy" button
4. Select "Clear build cache & deploy"
5. Wait 2-3 minutes for deployment
6. Verify: Visit `/` endpoint and check version is 2.0.0

**If you don't have a deployment yet:**

See the detailed guide in `DEPLOY_PARSER_FIX.md` for:
- Creating a Render account (free)
- Deploying the Python parser
- Setting environment variables

**Files to upload (from `python-parser/` folder):**
- ✅ `main.py` (version 2.0.0, includes SB/WF support message)
- ✅ `parser.py` (enhanced with SB/WF regex patterns)
- ✅ `requirements.txt`
- ✅ `README.md`

### Step 3: Test Your PDF (1 minute)

After confirming version 2.0.0:

1. Go to your app's **Loading Schedule** tab
2. Click **"Upload Loading Schedule"**
3. Select your PDF: `20250226 Westgate Town Centre 60SB and 600WF Loading Schedule.pdf`
4. Watch the progress bar

**Expected result:**
- ✅ Parsing completes successfully
- ✅ Members appear in the table with 60SB and 600WF sections
- ✅ Status shows "completed" or "needs_review"

### Step 4: If Still Failing - Check Debug Info

If parsing still fails even with version 2.0.0:

1. **Open browser console** (Press F12)
2. **Find the parse result** in the console logs
3. **Look for `metadata.debug_samples`**

This will show you exactly what the parser found in your PDF:

```javascript
debug_samples: [
  {
    text: "60SB section description...",
    has_section: true,  // ← Should be TRUE for 60SB rows
    has_frr: false,     // ← May be FALSE if FRR is in header
    page: 1
  }
]
```

**Share this debug output if you need further help.**

### Step 5: Alternative - Use CSV (if PDF continues to fail)

If your PDF is a scanned image or has unusual formatting:

1. Open `sample_loading_schedule.csv`
2. Create a new CSV with your data:
   ```csv
   member_mark,section,frr,dft,coating,element_type
   M1,60SB,60,600,Nullifire S607,beam
   M2,600WF,60,650,Nullifire S607,column
   ```
3. Upload the CSV instead (instant parsing, no issues)

## Quick Reference

| Task | Document |
|------|----------|
| Check if parser is updated | `VERIFY_PARSER_DEPLOYMENT.md` |
| Deploy the parser | `DEPLOY_PARSER_FIX.md` |
| Understand the fixes | `PARSER_FIX_SUMMARY.md` |
| Technical details | `LOADING_SCHEDULE_PARSER_FIX.md` |
| Complete overview | `LOADING_SCHEDULE_FIX_COMPLETE.md` |

## Summary of Fixes

### What was fixed in the code:

1. **Section Type Support**
   - Added: `SB` (Standard Beam)
   - Added: `WF` (Wide Flange)

2. **FRR Detection**
   - Now matches: `R60`, `FRR 60`, `FRR-60`, `FRR: 60`, `Fire Rating: 60`

3. **DFT Range**
   - Expanded from 300-3000 to 100-5000 microns

4. **Error Messages**
   - Shows debug samples from your PDF
   - Indicates what was detected in each row
   - Provides specific guidance

### Files updated:
- ✅ `python-parser/main.py` - Version tracking
- ✅ `python-parser/parser.py` - Core parsing logic
- ✅ `src/components/LoadingScheduleTab.tsx` - Error display

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't access parser URL | Deploy parser for first time |
| Parser shows version 1.0.0 | Redeploy with updated files |
| Parser shows version 2.0.0 but still fails | Check debug samples in console |
| Service is sleeping | Wait 30-60s for cold start, retry |
| PDF has no text | Use OCR or create CSV instead |

## Need Help?

1. **Check parser version** - Visit `YOUR_PARSER_URL/`
2. **Check browser console** - Look for debug samples
3. **Try CSV format** - Bypass PDF parsing entirely

All the code fixes are complete and ready to deploy!
