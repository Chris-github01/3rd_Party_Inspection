# 🚀 Python Parser Deployment Required

## ⚠️ Critical Issue Identified

The Python parser service is missing the `/parse` endpoint that accepts PDF URLs. I've added this endpoint to the code, but **you need to redeploy the service to Render**.

---

## 🔧 What Was Fixed

Added a new endpoint to `main.py`:

```python
@app.post("/parse")
async def parse_from_url(request: ParseURLRequest):
    # Downloads PDF from URL
    # Parses it
    # Returns results
```

This endpoint:
- ✅ Accepts `{"pdf_url": "https://..."}`
- ✅ Downloads PDF from Supabase Storage
- ✅ Parses using the same logic as file upload
- ✅ Returns standard format (works with both Altex & AkzoNobel)

---

## 📋 Deployment Steps

### Option 1: Automatic Deployment (Recommended)

If your Render service is connected to GitHub:

1. **Push changes to GitHub**:
   ```bash
   cd python-parser
   git add .
   git commit -m "Add /parse endpoint for URL-based parsing"
   git push
   ```

2. **Render auto-deploys** (if auto-deploy is enabled)
   - Go to https://dashboard.render.com
   - Find your "loading-schedule-parser" service
   - Watch the deploy log
   - Wait for "Deploy live" (usually 2-3 minutes)

### Option 2: Manual Deployment

If auto-deploy is not set up:

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Find your service**: "loading-schedule-parser"

3. **Click "Manual Deploy"** → "Deploy latest commit"

4. **Wait for deployment** (2-3 minutes)

5. **Verify**:
   ```bash
   curl https://loading-schedule-parser.onrender.com/health
   ```
   Should return: `{"status": "healthy"}`

---

## ✅ How to Test After Deployment

### Test 1: Health Check
```bash
curl https://loading-schedule-parser.onrender.com/health
```

**Expected**:
```json
{
  "status": "healthy",
  "version": "2.0.0-sb-wf-support"
}
```

### Test 2: Parse Endpoint Exists
```bash
curl -X POST https://loading-schedule-parser.onrender.com/parse \
  -H "Content-Type: application/json" \
  -d '{"pdf_url": "test"}'
```

**Expected**: Should NOT return 404. Should return 400 or 500 (because "test" is not a valid URL).

### Test 3: Full Parse (in your app)
1. Upload a PDF in the Loading Schedule tab
2. Watch the browser console
3. Should see: "Python parser extracted X items"

---

## 🔑 Environment Variables

Make sure these are set in Render:

- `PYTHON_PARSER_URL` = Your Render service URL (already configured in Supabase)

No other env vars needed for this endpoint.

---

## 📊 Expected Behavior After Deployment

**Before (Current)**:
- ❌ Upload PDF → Error: "Python parser failed with status 404"
- ❌ `/parse` endpoint doesn't exist

**After (Deployed)**:
- ✅ Upload PDF → Parses successfully
- ✅ `/parse` endpoint works
- ✅ Extracts Altex & AkzoNobel schedules
- ✅ Returns DFT, FRR, member marks correctly

---

## 🐛 Troubleshooting

### Issue: Still getting 404 after deploy

**Check**:
1. Deployment actually completed (check Render logs)
2. Service is "Live" (not "Build Failed")
3. Correct URL in `PYTHON_PARSER_URL` secret

**Fix**:
```bash
# Test the health endpoint
curl https://YOUR-SERVICE.onrender.com/health

# If 404, the service didn't deploy correctly
# Check Render logs for errors
```

### Issue: Deploy fails with module errors

**Likely cause**: Missing dependencies

**Fix**: I've added `httpx` and `pydantic` to requirements.txt, but if deploy fails:
1. Check Render build logs
2. Look for "ModuleNotFoundError"
3. Ensure requirements.txt was committed

### Issue: Parse endpoint returns 500 error

**Check Render logs**:
1. Go to Render Dashboard
2. Click your service
3. Click "Logs" tab
4. Look for Python traceback

**Common causes**:
- PDF download timeout (increase to 60s if needed)
- Invalid PDF format
- Parser bug (check logs for details)

---

## 📝 Files Modified

- ✅ `python-parser/main.py` - Added `/parse` endpoint
- ✅ `python-parser/requirements.txt` - Added httpx, pydantic

---

## ⏱️ Deployment Time

**Total time**: 3-5 minutes
- Git push: 10 seconds
- Render build: 2-3 minutes
- Service restart: 30 seconds

---

## 🎯 Next Steps

1. **Deploy to Render** (see steps above)
2. **Wait 3-5 minutes** for deployment
3. **Test health endpoint** to verify deploy
4. **Upload PDF in your app** to test parsing
5. **Check results** - should see items extracted correctly

---

## ✨ What This Fixes

- ✅ Parser now accepts PDF URLs (not just file uploads)
- ✅ Works with Supabase Storage public URLs
- ✅ Both Altex and AkzoNobel formats supported
- ✅ Returns consistent data format
- ✅ No more 404 errors!

---

**Status**: ⏳ Waiting for deployment to Render
**Priority**: 🔴 Critical - Blocks all PDF parsing
**ETA**: 5 minutes after you deploy

Deploy now and your PDF parsing will work! 🚀
