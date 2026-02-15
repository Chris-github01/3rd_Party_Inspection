# Loading Schedule Parser - Setup Instructions

## Current Status

The loading schedule parser has been rebuilt with a deterministic Python engine. The error you're seeing means the Python parser service needs to be deployed before PDF parsing will work.

## What Works Right Now

✅ **CSV file parsing** - Works immediately, no setup required
✅ **Edge function deployed** - Your Supabase function is ready
✅ **Frontend error handling** - Clear messages guide you through setup

## What Needs Setup

⚠️ **Python parser service** - Must be deployed to parse PDF files

---

## Quick Setup (5 minutes)

### Option 1: Deploy to Render (Recommended - Free Tier Available)

1. **Sign up for Render**
   - Go to https://render.com
   - Create a free account

2. **Create a new Web Service**
   - Click "New +" → "Web Service"
   - Choose "Deploy from GitHub" or "Manual Deploy"

3. **Configure the service**
   - **Name:** `loading-schedule-parser`
   - **Runtime:** Python 3
   - **Root Directory:** `python-parser`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`

4. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - Copy your service URL (e.g., `https://loading-schedule-parser.onrender.com`)

5. **Done!**
   - The edge function will automatically use your deployed service
   - Try uploading a PDF loading schedule

### Option 2: Deploy to Railway

1. Go to https://railway.app
2. Create new project → "Deploy from GitHub repo"
3. Select the `python-parser` directory
4. Railway auto-detects Python and deploys
5. Copy your service URL

### Option 3: Deploy to Fly.io

```bash
cd python-parser
fly launch
fly deploy
```

---

## Testing Your Setup

### Test CSV Parsing (No Python Service Required)

1. Go to your project's Loading Schedule tab
2. Upload `sample_loading_schedule.csv`
3. Should extract 6 items successfully

### Test PDF Parsing (Requires Python Service)

1. Deploy the Python service first (see above)
2. Upload a loading schedule PDF
3. Should extract structural members with FRR ratings

---

## Understanding the Architecture

```
User Uploads PDF
       ↓
Supabase Edge Function
       ↓
Python Parser Service (You need to deploy this)
       ↓
pdfplumber extraction
       ↓
Structured JSON returned
       ↓
Saved to Supabase database
```

### CSV Flow (Already Works)
```
User Uploads CSV
       ↓
Supabase Edge Function
       ↓
Direct parsing (no Python service)
       ↓
Saved to database
```

---

## Error Messages Explained

### "Python parser returned 404: Not Found"
**Meaning:** The Python service isn't deployed yet or the URL is wrong
**Solution:** Deploy the Python service following the steps above

### "Cannot connect to Python parser service"
**Meaning:** Service is unreachable
**Possible causes:**
- Not deployed yet
- Cold start (first request takes 30-60s on free tier)
- Network issue

**Solution:** Wait 60 seconds and try again, or deploy the service

### "No structural members detected"
**Meaning:** The PDF was parsed but no valid data found
**Possible causes:**
- Not a loading schedule
- Scanned image (not readable text)
- Unusual format

**Solution:** Verify the PDF contains readable text with section sizes and FRR ratings

---

## What the Python Parser Does

- **Position-based extraction** - Uses X/Y coordinates to reconstruct tables
- **Row stitching** - Handles broken rows across lines
- **Section normalization** - "610 UB 125" → "610UB125"
- **FRR standardization** - "60" → "60/-/-"
- **DFT detection** - Extracts coating thickness in microns
- **Validation** - Only returns valid structural members

---

## Free Tier Limitations

### Render Free Tier
- ✅ Enough for this use case
- ⚠️ Cold starts (30-60s delay if inactive for 15 minutes)
- ✅ Always available
- ✅ 750 hours/month free

### Railway Free Tier
- ✅ $5 free credit/month
- ⚠️ Cold starts on inactivity
- ✅ Fast deploys

### Fly.io Free Tier
- ✅ 3 small VMs free
- ✅ Always-on (no cold starts)
- ✅ Fast deploys

---

## Advanced: Custom Deployment URL

If you deploy to a different URL, update line 10 in:
`supabase/functions/parse-loading-schedule/index.ts`

```typescript
const PYTHON_PARSER_URL = Deno.env.get("PYTHON_PARSER_URL") || "https://your-custom-url.com";
```

Then redeploy the edge function:
```bash
# In your Supabase dashboard, redeploy the parse-loading-schedule function
```

---

## Troubleshooting

### Python service won't start
- Check the logs in Render/Railway dashboard
- Verify `requirements.txt` is in the `python-parser` folder
- Ensure Python 3.11 is selected

### Still getting errors after deployment
1. Wait 2 minutes for service to fully start
2. Check service logs for errors
3. Test the service directly:
   ```bash
   curl https://your-service-url.com/health
   ```
   Should return: `{"status":"healthy"}`

### Service is too slow
- First request after inactivity takes 30-60s (cold start)
- Subsequent requests are fast (<2s)
- Upgrade to paid tier for always-on service

---

## Need Help?

1. Check the service logs in your Render/Railway dashboard
2. Check the Supabase edge function logs
3. Check the browser console for detailed error messages
4. See `PYTHON_PARSER_DEPLOYMENT.md` for more technical details
