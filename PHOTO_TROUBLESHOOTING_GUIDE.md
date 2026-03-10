# Photo Export Troubleshooting Guide

## Quick Diagnostic - 5 Steps

### Step 1: Run Automated Diagnostic (Recommended)

**In your browser console (F12):**

```javascript
// Import the diagnostic tool
import { runPhotoDiagnostics } from './src/lib/pdfDiagnosticTest';

// Run with your project ID
await runPhotoDiagnostics('your-project-id-here');
```

This will automatically check:
- ✅ jsPDF library setup
- ✅ Database connectivity
- ✅ Storage access
- ✅ Photo loading
- ✅ Data URL conversion
- ✅ PDF generation

**Expected Output:**
```
✅ jsPDF Setup: jsPDF initialized correctly and can embed images
✅ Database Access: Found 15 pins, 23 photos
✅ Storage Access: Successfully downloaded photo: 45678 bytes
✅ Photo Loading: All 3 photos loaded successfully
✅ Data URL Conversion: Data URL created successfully (61234 chars)
✅ PDF Generation: Successfully embedded 3 photos in test PDF

Summary: 6 passed, 0 warnings, 0 failed
✅ ALL TESTS PASSED
```

---

### Step 2: Manual Photo Check

**Check if photos exist in database:**

```sql
-- In Supabase SQL Editor
SELECT
  pp.id,
  pp.file_name,
  pp.file_path,
  dp.pin_number,
  p.project_name
FROM pin_photos pp
JOIN drawing_pins dp ON pp.pin_id = dp.pin_id
JOIN projects p ON dp.project_id = p.id
WHERE p.id = 'your-project-id'
ORDER BY dp.pin_number;
```

**Expected:** Should return rows with photo records

**If no results:** Photos haven't been uploaded yet

---

### Step 3: Test Storage Access

**In browser console:**

```javascript
import { supabase } from './src/lib/supabase';

// Test storage connection
const { data, error } = await supabase
  .storage
  .from('pin-photos')
  .list('project-folder', { limit: 10 });

console.log('Storage files:', data);
console.log('Any errors?', error);
```

**Expected:** Array of file objects

**Common Issues:**
- ❌ `null` data + error → Storage bucket doesn't exist
- ❌ `[]` empty array → No files uploaded
- ❌ `403 Forbidden` → RLS policy blocking access

---

### Step 4: Generate Test PDF

**Simple test PDF generation:**

```javascript
import jsPDF from 'jspdf';

// Create minimal test
const doc = new jsPDF();
const testImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

doc.text('Test PDF', 20, 20);
doc.addImage(testImg, 'PNG', 20, 30, 50, 50);
doc.save('test.pdf');

// If this works, jsPDF is installed correctly
console.log('✅ Test PDF created');
```

**Expected:** Downloads `test.pdf` with a small colored square

**If fails:** jsPDF installation issue

---

### Step 5: Check Browser Console During Export

When generating the actual PDF, watch console for:

**Successful flow:**
```
[PDF Generator] Loading photos for 3 pins...
[Photo Blobs] Retrieved 3 photo record(s)
[Photo Blobs] Successfully downloaded blob: 45678 bytes
[PDF] Processing photo 1/3: Image 1.jpeg
[PDF] Data URL obtained, length: 61234
[PDF] Detected format: JPEG
[PDF] ✓ Image added
[PDF] ✓ Caption added: Image 1.jpeg
```

**Problem indicators:**
```
❌ [Photo Blobs] No photos found for pin
❌ [Photo Download] All 3 attempts failed
❌ [PDF] No data URL for photo
❌ Error creating signed URL
❌ HTTP 403: Forbidden
```

---

## Common Issues & Solutions

### Issue 1: "No photos found"

**Symptoms:**
- Console: `[Photo Blobs] Retrieved 0 photo record(s)`
- PDF shows zero photos in summary

**Cause:** No photos uploaded to database

**Solution:**
1. Go to Site Mode → Select pin → Upload photo
2. Verify photo appears in pin list
3. Try PDF export again

---

### Issue 2: "Failed to download blob"

**Symptoms:**
- Console: `[Photo Download] All 3 attempts failed`
- Console: `HTTP 403: Forbidden`

**Cause:** Storage access denied (RLS policy issue)

**Solution:**

```sql
-- Check RLS policies
SELECT * FROM storage.objects
WHERE bucket_id = 'pin-photos'
LIMIT 5;

-- If empty, check bucket exists
SELECT * FROM storage.buckets
WHERE id = 'pin-photos';

-- Fix: Ensure authenticated users can read
CREATE POLICY "Allow authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pin-photos');
```

---

### Issue 3: "Photos in database but not in PDF"

**Symptoms:**
- Database has photo records
- Storage has files
- Console shows "✓ Image added"
- **But PDF shows blank space**

**Cause:** This was the bug I fixed!

**Solution:**
1. Clear browser cache (Ctrl+Shift+R)
2. Verify jsPDF version: `npm list jspdf`
3. Should be `jspdf@2.5.2`
4. If not: `npm install jspdf@2.5.2`
5. Rebuild: `npm run build`

---

### Issue 4: "Some photos work, others don't"

**Symptoms:**
- 2 out of 3 photos appear
- Console shows errors for specific files

**Cause:** Specific photo file issues

**Solution:**
1. Check console for file name of failed photo
2. Re-download original photo
3. Verify it's JPEG or PNG (not HEIC, WebP, BMP)
4. Re-upload to system
5. Try export again

---

### Issue 5: "PDF file size is tiny"

**Symptoms:**
- PDF generates but is only 50KB
- Should be 500KB+ with photos

**Cause:** Photos not actually embedded

**Solution:**
1. Run diagnostic tool (Step 1 above)
2. Check which test fails
3. Follow solution for that specific test

---

## Priority Checklist

When troubleshooting, check in this order:

**Priority 1 - Quick Checks (< 1 minute)**
- [ ] Browser console open during export?
- [ ] Any red errors in console?
- [ ] Is jsPDF v2.5.2 installed?
- [ ] Did you clear cache after update?

**Priority 2 - Data Checks (< 3 minutes)**
- [ ] Do photos exist in database? (SQL query)
- [ ] Do files exist in Storage? (Storage browser)
- [ ] Can you see photos in UI?
- [ ] Are you selecting pins that have photos?

**Priority 3 - Access Checks (< 5 minutes)**
- [ ] Can you download photo URLs manually?
- [ ] Are RLS policies correct?
- [ ] Is authentication working?
- [ ] Network tab showing 200 OK for photo downloads?

**Priority 4 - Deep Diagnostic (< 10 minutes)**
- [ ] Run automated diagnostic tool
- [ ] Review detailed test results
- [ ] Check specific failure points
- [ ] Apply targeted solutions

---

## Expected vs Actual

### Expected Behavior

**Summary Table:**
```
Pin #    Member    Photos
1001-1   100EA8    3 ← Shows count
1001-2   RB12      2
```

**Photo Section:**
```
Pin 1001-1
┌──────────────┐  ┌──────────────┐
│  [PHOTO 1]   │  │  [PHOTO 2]   │ ← Actual images visible
│   Visible    │  │   Visible    │
└──────────────┘  └──────────────┘
 Image 1.jpeg      Image 2.jpeg
```

### What You're Seeing (Before Fix)

**Summary Table:**
```
Pin #    Member    Photos
1001-1   100EA8    3 ← Count correct ✓
1001-2   RB12      2
```

**Photo Section:**
```
Pin 1001-1
┌──────────────┐  ┌──────────────┐
│              │  │              │ ← BLANK!
│  [BLANK]     │  │  [BLANK]     │
└──────────────┘  └──────────────┘
 Image 1.jpeg      Image 2.jpeg   ← Captions show ✓
```

**This was the bug pattern I fixed!**

---

## Testing After Fix

### Test Plan

1. **Clear cache** (Ctrl+Shift+R)
2. **Open console** (F12)
3. **Navigate to project**
4. **Go to Exports tab**
5. **Select "Inspection Report with Photos"**
6. **Choose 2-3 pins with photos**
7. **Click "Generate Report"**
8. **Watch console for:**
   - `[PDF] ✓ Image added` messages
   - No red errors
9. **Open generated PDF**
10. **Verify photos are visible** (not blank)

### Success Criteria

✅ Console shows "✓ Image added" for each photo
✅ PDF file size > 100KB per photo (approx)
✅ Photos display correctly in PDF viewer
✅ Photos aligned in 2-column grid
✅ Captions match correct photos
✅ All image formats work (JPEG, PNG)

---

## Advanced Diagnostics

### Network Tab Analysis

1. Open DevTools → Network tab
2. Filter: "Img" or "Fetch/XHR"
3. Generate PDF
4. Look for photo download requests

**Healthy Pattern:**
```
GET /storage/.../photo1.jpg  Status: 200  Size: 45KB  Time: 234ms
GET /storage/.../photo2.jpg  Status: 200  Size: 38KB  Time: 189ms
GET /storage/.../photo3.jpg  Status: 200  Size: 52KB  Time: 267ms
```

**Problem Patterns:**
```
❌ Status: 403  → Access denied (RLS issue)
❌ Status: 404  → File not found (deleted from storage)
❌ Status: 0    → CORS or network error
❌ Time: 30000ms → Timeout (file too large or network slow)
```

### Storage Browser Check

1. Supabase Dashboard → Storage
2. Open `pin-photos` bucket
3. Browse folders
4. Click on a photo
5. Try to view/download

**If you can't view it:** File is corrupted or RLS blocking

---

## Get Help

If issue persists after following this guide:

1. **Export console logs:**
   - Right-click in console → Save as...
   - Send logs for analysis

2. **Check these specific things:**
   ```
   - jsPDF version: npm list jspdf
   - Browser version: Help → About
   - Console errors: Copy full error text
   - Network status: Any failed requests?
   - File formats: JPEG? PNG? Other?
   ```

3. **Provide this information:**
   - What step failed in diagnostic?
   - Console error messages
   - Network tab screenshot
   - PDF file size (with/without photos)

---

## Quick Reference Commands

**Check jsPDF version:**
```bash
npm list jspdf
```

**Reinstall jsPDF:**
```bash
npm install jspdf@2.5.2
npm run build
```

**Run diagnostics:**
```javascript
import { runPhotoDiagnostics } from './src/lib/pdfDiagnosticTest';
await runPhotoDiagnostics('project-id-here');
```

**Test storage:**
```javascript
import { supabase } from './src/lib/supabase';
const { data } = await supabase.storage.from('pin-photos').list();
console.log('Files:', data);
```

**Test photo loading:**
```javascript
import { getPinPhotosWithBlobs } from './src/lib/pinPhotoUtils';
const photos = await getPinPhotosWithBlobs('pin-id-here');
console.log('Loaded:', photos.length, 'photos');
```

---

**Last Updated:** 2026-03-10
**Status:** Ready for testing
**Build:** ✅ Passing
