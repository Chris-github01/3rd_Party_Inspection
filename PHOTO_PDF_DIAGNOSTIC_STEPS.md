# Photo PDF Diagnostic Steps

## Issue
Photos are missing from the PDF export even though:
- Photo counts show correctly (1, 1, 0, 1, etc.)
- Captions appear in PDF ("Image 1.jpeg")
- Summary table shows correct photo counts
- But actual images are blank/white space

## Diagnostic Steps

### Step 1: Check Browser Console During PDF Generation

1. Open browser console (F12 → Console tab)
2. Clear any existing logs
3. Click "Generate Report" button
4. Wait for PDF generation to complete

### Step 2: Look for These Specific Log Messages

**Photo Loading:**
```
[PDF Generator] Loading photos for X pins...
[Photo Blobs] Fetching photos with blobs for pin: <pin_id>
[Photo Blobs] Retrieved X photo record(s)
[Photo Blobs] Processing photo 1/X: Image 1.jpeg
[Photo Blobs] Downloading blob for: Image 1.jpeg
[Photo Download] Attempt 1/3 for URL: ...
[Photo Download] Success on attempt 1: XXXXX bytes, type: image/jpeg
[Photo Blobs] Successfully downloaded blob for Image 1.jpeg: XXXXX bytes
[Photo Blobs] X of X photos successfully loaded with blobs
```

**PDF Image Addition:**
```
[PDF] Processing photo 1/X: Image 1.jpeg
[PDF] Data URL obtained, length: XXXXX, format: data:image/jpeg;base64...
[PDF] Detected image format: JPEG
[PDF] Adding image at position (X, Y) with size (W x H)
[PDF] Image added successfully
[PDF] Caption added: Image 1.jpeg
```

### Step 3: Identify the Problem

**If you see:**

#### Scenario A: "No photos found for pin"
```
[Photo Debug] No photos found for pin: <pin_id>
```
**Problem:** Photos not in database
**Solution:** Upload photos first

#### Scenario B: "Error creating signed URL"
```
[Photo Debug] Error creating signed URL for Image 1.jpeg: <error>
```
**Problem:** Storage access issue
**Solution:** Check RLS policies, authentication

#### Scenario C: "Failed to download blob"
```
[Photo Blobs] Failed to download blob for Image 1.jpeg
[Photo Download] All 3 attempts failed for URL
```
**Problem:** Network or URL issue
**Solution:** Check network, try again, verify storage bucket

#### Scenario D: "0 of X photos successfully loaded with blobs"
```
[Photo Blobs] 0 of 3 photos successfully loaded with blobs
[Photo Blobs] WARNING: No photos successfully loaded despite 3 records in database!
```
**Problem:** All photo downloads failed
**Solution:** Storage retrieval issue, check console for specific errors

#### Scenario E: "No data URL for photo"
```
[PDF] No data URL for photo: Image 1.jpeg
```
**Problem:** Photo blob → data URL conversion failed
**Solution:** Check if blobs are corrupted, retry upload

#### Scenario F: Photos load but images still missing in PDF
```
[PDF] Data URL obtained, length: XXXXX...
[PDF] Image added successfully
```
But images still don't appear in PDF

**Problem:** PDF library issue or coordinate problem
**Solution:** See advanced diagnostics below

### Step 4: Advanced Diagnostics

If photos load successfully but still don't appear:

#### Check Data URL Format
Look for log: `[PDF] Data URL obtained, length: XXXXX, format: data:image/jpeg;base64...`

**Expected:** `data:image/jpeg;base64,/9j/4AAQSkZJRg...` (or similar for PNG)
**Problem if:** Format doesn't start with `data:image/`

#### Check Image Coordinates
Look for log: `[PDF] Adding image at position (X, Y) with size (W x H)`

**Expected:** Positive values within page bounds (e.g., X: 20, Y: 50, W: 85, H: 63)
**Problem if:** Negative values or very large values (outside page)

#### Check Image Size
**Expected:** Data URL length > 10000 (at least 10KB for a valid image)
**Problem if:** Length < 1000 (probably not a valid image)

### Step 5: Common Issues and Solutions

#### Issue: Signed URL Expired
**Symptoms:**
- Photos worked before, now failing
- "HTTP 403" or "Forbidden" errors

**Solution:**
- Refresh the page
- Regenerate PDF (creates new signed URLs)

#### Issue: CORS Error
**Symptoms:**
- "CORS policy" error in console
- "Cross-origin request blocked"

**Solution:**
- Check storage bucket CORS settings
- Verify Supabase configuration

#### Issue: Out of Memory
**Symptoms:**
- Browser becomes slow/unresponsive
- "Out of memory" error
- Many large photos

**Solution:**
- Select fewer pins per report
- Compress images before uploading
- Use smaller image files

#### Issue: Wrong Image Format
**Symptoms:**
- "Unsupported image format" error
- PDF generates but images missing

**Solution:**
- Check uploaded file types (should be JPG/PNG)
- Re-upload as JPEG

### Step 6: Quick Tests

#### Test 1: Single Pin with One Photo
1. Deselect all pins
2. Select one pin with 1 photo
3. Generate PDF
4. Check if that single photo appears

**If works:** Issue is with multiple photos or specific pins
**If fails:** Issue is with photo loading/embedding system

#### Test 2: Fresh Photo Upload
1. Upload a new test photo to a pin
2. Immediately generate PDF with just that pin
3. Check if new photo appears

**If works:** Old photos may be corrupted
**If fails:** Upload or storage issue

#### Test 3: Different Browser
1. Try generating PDF in different browser
2. Compare results

**If works in other browser:** Browser-specific issue (cache/storage)
**If fails in all browsers:** Server/database issue

### Step 7: Export Console Logs

If issue persists:

1. Open Console (F12)
2. Right-click in console
3. Select "Save as..."
4. Save console logs to file
5. Share logs for analysis

### Step 8: Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Images" or "Fetch/XHR"
4. Generate PDF
5. Look for:
   - Failed requests (red)
   - 403/404 errors
   - Slow requests (> 30s)

### Expected Successful Flow

```
1. User clicks "Generate Report"
   ↓
2. System queries database for pin_photos records
   → Found X records
   ↓
3. System creates signed URLs for each photo
   → X signed URLs created
   ↓
4. System downloads blobs from storage
   → X blobs downloaded (Y bytes each)
   ↓
5. System converts blobs to data URLs
   → X data URLs created (base64 encoded)
   ↓
6. System adds images to PDF
   → doc.addImage() called X times
   ↓
7. PDF generated successfully with photos visible
```

### Failure Points to Check

```
2. Database query
   ❌ RLS policy blocking query
   ❌ No records exist

3. Signed URL creation
   ❌ Storage permissions
   ❌ File doesn't exist in bucket

4. Blob download
   ❌ Network timeout
   ❌ URL expired
   ❌ CORS error

5. Data URL conversion
   ❌ Blob corrupted
   ❌ Unsupported format

6. Image addition
   ❌ Invalid data URL
   ❌ PDF library error
   ❌ Coordinates out of bounds
```

## Next Steps

Based on console output, identify which step is failing and apply appropriate solution.

If all steps succeed but images still missing, this indicates:
- PDF rendering issue
- Viewer problem
- Coordinate calculation error

Proceed to check PDF file directly:
1. Try opening in different PDF viewer
2. Try printing PDF
3. Try viewing on different device

---

**Remember:** The system has extensive logging. Console output will tell you exactly where the failure occurs!
