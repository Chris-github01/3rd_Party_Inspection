# Quick Guide: Deploy Parser Fix

## The Fix is Ready!

I've improved the loading schedule parser to handle more PDF formats, including:
- ✓ Section types like `60SB` and `600WF`
- ✓ Various FRR formats (`R60`, `FRR 60`, `Fire Rating: 60`)
- ✓ FRR ratings in column headers
- ✓ Better debug information

## Deploy Now (3 Minutes)

### If you already deployed the Python parser to Render:

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Find your `loading-schedule-parser` service

2. **Update the Code**
   - Click "Manual Deploy" button
   - Select "Clear build cache & deploy"
   - Wait 2-3 minutes for deployment

3. **Verify It's Working**
   - Visit: `YOUR_SERVICE_URL/health`
   - Should show: `{"status": "healthy"}`

### If you haven't deployed the Python parser yet:

**Quick Deploy to Render (Free Tier):**

1. **Create Render Account**
   - Go to https://render.com/register
   - Sign up (free tier available)

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Choose "Deploy from GitHub/GitLab" OR "Manual Deploy"

3. **Configure Service**
   ```
   Name: loading-schedule-parser
   Environment: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn main:app --host 0.0.0.0 --port 10000
   Instance Type: Free
   ```

4. **Upload Files**
   - Upload files from `python-parser/` folder:
     - `main.py`
     - `parser.py` (with the new fixes!)
     - `requirements.txt`
     - `README.md`

5. **Get Your Service URL**
   - Copy the URL (looks like: `https://your-service.onrender.com`)
   - Add to Supabase Edge Function secrets as `PYTHON_PARSER_URL`

### Alternative: Deploy to Railway

```bash
cd python-parser/

# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy
railway up

# Get URL
railway domain
```

## Set Environment Variable in Supabase

After deploying, you need to tell the Edge Function where to find your parser:

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Click "Manage secrets"
4. Add secret:
   - Name: `PYTHON_PARSER_URL`
   - Value: `https://your-parser-service.onrender.com`

### Option 2: Using Supabase CLI
```bash
supabase secrets set PYTHON_PARSER_URL=https://your-parser-service.onrender.com
```

## Test the Fix

1. **Go to your app's Loading Schedule tab**
2. **Upload the PDF** that was failing before
3. **Watch the progress bar**

### Success Indicators:
- ✓ Progress reaches 100%
- ✓ Members appear in the table
- ✓ Status shows "completed" or "needs_review"

### If Still Failing:
- Check browser console for debug information
- Look for "debug_samples" in the error
- These show exactly what the parser found in each row

## Troubleshooting

### Error: "Python parser service not deployed"
**Solution:** The parser isn't deployed yet. Follow deployment steps above.

### Error: "Python parser service timeout"
**Solution:** Free tier services "sleep" after 15 minutes of inactivity. First request takes 30-60 seconds to wake up. Just wait and try again.

### Error: "Cannot connect to Python parser"
**Solution:** Check that `PYTHON_PARSER_URL` environment variable is set correctly in Supabase Edge Functions.

### Still shows "No structural members detected"
**Solution:**
1. Check browser console for debug samples
2. Verify your PDF contains actual text (not scanned images)
3. Try the sample CSV file to verify the workflow works
4. Share the debug samples for further diagnosis

## Files Updated

The following files contain the parser improvements:
- ✅ `python-parser/parser.py` - Enhanced detection patterns
- ✅ `src/components/LoadingScheduleTab.tsx` - Better error messages

## Need Help?

If you're still having issues after deploying:

1. **Check the debug output** in browser console
2. **Verify parser is running**: Visit `YOUR_PARSER_URL/health`
3. **Try the sample CSV** to test the workflow: `sample_loading_schedule.csv`
4. **Check PDF is text-based**: Try copying text from the PDF in a viewer

For detailed technical information, see `LOADING_SCHEDULE_PARSER_FIX.md`
