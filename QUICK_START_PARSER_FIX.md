# Quick Start: Fix Your Loading Schedule Parser

## The Problem
Your PDF won't parse: "No structural members detected"

## The Fix
I've updated the parser to recognize your section types (60SB, 600WF) and more FRR formats.

## Deploy in 5 Minutes

### Step 1: Deploy Python Parser

**If you already have a Render deployment:**
1. Go to https://dashboard.render.com
2. Click your `loading-schedule-parser` service
3. Click "Manual Deploy" → "Clear build cache & deploy"
4. Done! ✓

**If you need to deploy for the first time:**
1. Go to https://render.com (free signup)
2. Click "New +" → "Web Service"
3. Upload files from `python-parser/` folder
4. Set:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port 10000`
5. Deploy (takes ~3 minutes)
6. Copy your service URL

### Step 2: Set Environment Variable (First Time Only)

In Supabase dashboard:
1. Go to Edge Functions
2. Click "Manage secrets"
3. Add:
   - Name: `PYTHON_PARSER_URL`
   - Value: Your Render URL

### Step 3: Test It

1. Go to Loading Schedule tab
2. Upload your PDF
3. Watch it parse successfully! ✓

## What Was Fixed

| Before | After |
|--------|-------|
| ❌ Doesn't recognize 60SB | ✅ Recognizes 60SB |
| ❌ Doesn't recognize 600WF | ✅ Recognizes 600WF |
| ❌ Limited FRR formats | ✅ Multiple FRR formats |
| ❌ Vague error messages | ✅ Shows exactly what was found |

## Still Having Issues?

**Parser timeout (first use):**
- Free tier sleeps after 15 min
- First request takes 30-60s to wake up
- Just wait and retry

**Still not working:**
1. Open browser console (F12)
2. Look for "debug_samples" in error
3. This shows what the parser found
4. Or try CSV format (instant, no parsing)

## Need More Info?

- **Deployment details:** See `DEPLOY_PARSER_FIX.md`
- **Technical details:** See `LOADING_SCHEDULE_PARSER_FIX.md`
- **Quick summary:** See `PARSER_FIX_SUMMARY.md`
- **Complete guide:** See `LOADING_SCHEDULE_FIX_COMPLETE.md`

## That's It!

Deploy and test. Your PDF should now parse successfully.
