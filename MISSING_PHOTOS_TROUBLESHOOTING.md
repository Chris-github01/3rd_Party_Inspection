# Missing Photos in PDF Export - Troubleshooting Guide

## Understanding the Issue

When you generate an "Inspection Report with Photos" and notice missing photos, this typically means one of the following:

1. Photos weren't uploaded to those specific pins before export
2. Photos failed to upload (but you didn't notice the error)
3. The pins weren't selected for the report
4. A technical issue prevented photos from being retrieved

**Important:** The PDF export intentionally **only includes pins that have photos**. Pins without photos are skipped in the photo section, but they still appear in the summary table.

---

## Step-by-Step Verification Guide

### Step 1: Check if Photos Were Actually Uploaded

1. **Navigate to the Exports Tab**
   - Go to your project
   - Click on the "Exports" tab
   - Scroll to "Inspection Report with Photos"

2. **Look at the Pin List**
   - Each pin shows a photo count badge (e.g., "0 photos", "3 photos")
   - If it shows "0 photos", no photos were uploaded for that pin
   - If it shows a number, those photos should appear in the report

3. **Expand a Pin to View Photos**
   - Click "View Photos" button on any pin with photos
   - You should see thumbnail previews
   - If thumbnails don't load, there's a retrieval issue

### Step 2: Verify Pin Selection

1. **Check the "Selected for Report" Count**
   - Look at the top of the pin list
   - It shows "X selected for report"
   - Only selected pins appear in the PDF

2. **Ensure Correct Pins are Selected**
   - Check the checkbox next to each pin you want in the report
   - Use "Select All" if you want all pins
   - Pins must be BOTH selected AND have photos to appear

### Step 3: Test Photo Upload

Try uploading a test photo to verify the upload system works:

1. Find a pin with 0 photos
2. Click "Add Photos"
3. Select a small image file (under 5MB)
4. Watch for success message
5. Verify the photo count increases
6. Click "View Photos" to confirm it appears

**Expected result:** "Successfully uploaded 1 photo"

**Problem indicators:**
- Error message appears
- Photo count doesn't increase
- Thumbnails don't load

---

## Common Causes and Solutions

### Cause 1: Photos Were Never Uploaded

**Symptoms:**
- Pin shows "0 photos"
- No upload history or confirmation

**Solution:**
1. Go to Exports tab
2. Find the pin in question
3. Click "Add Photos"
4. Select image files
5. Wait for "Successfully uploaded X photo(s)" message
6. Verify photo count updated
7. Try generating PDF again

### Cause 2: Upload Failed Silently

**Symptoms:**
- You remember uploading but photos show as 0
- Console shows errors (check with F12)

**Solution:**
1. Open browser console (F12 → Console)
2. Try uploading again
3. Look for red error messages
4. Common errors:
   - "User not authenticated" → Log out and back in
   - "Storage upload failed" → File may be too large (max 10MB)
   - "Database insert failed" → Contact support with error code

### Cause 3: File Size or Type Issues

**Symptoms:**
- Upload appears to work but photo count stays at 0
- Error message about file type or size

**Solution:**
1. Check file requirements:
   - Must be image file (JPG, PNG, GIF, WebP)
   - Maximum size: 10MB recommended
   - No PDFs, documents, or videos

2. If file is too large:
   - Compress image before uploading
   - Resize to maximum 2000x2000 pixels
   - Use online tools like TinyPNG or Squoosh

### Cause 4: Photos Not Loading in PDF

**Symptoms:**
- Pin shows correct photo count
- Thumbnails appear in interface
- But photos missing from PDF

**Solution:**
1. Check browser console during PDF generation
2. Look for download or fetch errors
3. Try generating PDF again (sometimes network issues)
4. If error persists, check:
   - Storage permissions
   - Network connection stability
   - Browser console for specific errors

### Cause 5: Wrong Pins Selected

**Symptoms:**
- Some pins appear in PDF, others don't
- No error messages

**Solution:**
1. Verify which pins are checked (selected)
2. Uncheck all, then recheck the ones you want
3. Or use "Select All" button
4. Generate PDF again

### Cause 6: Browser/Session Issues

**Symptoms:**
- Uploads worked before, now failing
- Generic errors appearing

**Solution:**
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Log out and log back in
4. Try a different browser
5. Check internet connection

---

## Best Practices for Future Exports

### Before Uploading Photos

1. **Prepare Images First**
   - Resize to reasonable dimensions (1920x1440 or smaller)
   - Compress to reduce file size
   - Use JPG for photos, PNG for screenshots
   - Ensure good image quality (not blurry)

2. **Organize Your Workflow**
   - Upload photos immediately after inspection
   - Check photo count after each upload
   - Verify thumbnails appear before moving on
   - Keep a backup of original photos

### During Upload

1. **Watch for Confirmations**
   - Wait for "Successfully uploaded X photo(s)" message
   - Don't navigate away during upload
   - Check photo count updates
   - Verify thumbnails appear

2. **Handle Errors Immediately**
   - If error appears, retry immediately
   - Don't assume it worked without confirmation
   - Check console if repeated failures
   - Save error messages for support

### Before Generating PDF

1. **Pre-Export Checklist**
   - ✅ All required pins have photos uploaded
   - ✅ Photo counts are correct
   - ✅ Thumbnails load when you click "View Photos"
   - ✅ Correct pins are selected (checked)
   - ✅ Network connection is stable

2. **During PDF Generation**
   - Don't close or navigate away from page
   - Wait for "Generating report with photos..." to complete
   - If it takes more than 2 minutes, check console
   - Download immediately when ready

### After Export

1. **Verify PDF Contents**
   - Open PDF immediately
   - Check that all expected photos appear
   - Verify image quality is acceptable
   - Confirm all selected pins are included

2. **If Issues Found**
   - Note which specific pins have missing photos
   - Check those pins in the interface
   - Re-upload if needed
   - Generate PDF again

---

## Understanding How Photos Work

### The Upload Process

1. **You click "Add Photos"** → File picker opens
2. **You select images** → System validates each file
3. **System uploads to storage** → File saved to secure bucket
4. **System creates database record** → Links photo to pin
5. **Photo count updates** → Interface refreshes
6. **Success message appears** → You can verify upload

### The PDF Generation Process

1. **You click "Generate Report"** → System starts
2. **System queries database** → Gets all selected pins
3. **System loads photo records** → For each pin
4. **System downloads photo files** → From storage bucket
5. **System converts to data URLs** → For PDF embedding
6. **System adds to PDF** → Two photos per row
7. **PDF downloads** → Ready to view

### Where Photos Are Stored

- **Storage Bucket:** `pin-photos`
- **File Path:** `{project_id}/{pin_id}/{filename}`
- **Database Table:** `pin_photos`
- **Access:** Secure, authenticated users only

### Why Photos Might Not Appear

At each step, something can go wrong:

| Step | What Can Fail | How to Detect | Solution |
|------|---------------|---------------|----------|
| Upload | File too large, wrong type | Error message | Use smaller/correct file |
| Storage | Permission denied | Console error | Check authentication |
| Database | RLS policy rejection | Console error | Verify user access |
| Retrieval | Network timeout | Console error | Retry or check connection |
| PDF Generation | Download fails | Console logs | Check console, retry |

---

## Diagnostic Tools

### Open Browser Console

**Windows/Linux:** Press `F12` or `Ctrl+Shift+I`
**Mac:** Press `Cmd+Option+I`

### What to Look For

1. **During Upload:**
   ```
   [Upload] Uploading photo.jpg to abc123/pin456/...
   [Upload] Storage upload successful
   [Upload] Database insert successful
   Successfully uploaded 1 photo
   ```

2. **During PDF Generation:**
   ```
   [PDF Generator] Loading photos for 5 pins...
   [Photo Debug] Found 3 photo(s) in database for pin xyz
   [Photo Blobs] 3 of 3 photos successfully loaded with blobs
   ```

3. **Error Examples:**
   ```
   [Upload] Storage error: Payload too large
   [Photo Debug] Error creating signed URL
   [Photo Blobs] Failed to download blob
   ```

### Enable Detailed Logging

The system already logs extensively. To view:

1. Open Console (F12)
2. Upload photos or generate PDF
3. Watch for logs prefixed with:
   - `[Upload]` - Upload process
   - `[Photo Debug]` - Photo queries
   - `[Photo Blobs]` - Photo downloads
   - `[PDF Generator]` - PDF creation

---

## Quick Diagnostic Checklist

Use this to quickly identify the issue:

### ✅ Photos Show "0 photos"
- **Issue:** No photos uploaded
- **Fix:** Upload photos to those pins

### ✅ Upload Fails with Error Message
- **Issue:** File validation or permission problem
- **Fix:** Check file type/size, verify authentication

### ✅ Photo Count Shows Number But Thumbnails Don't Load
- **Issue:** Storage retrieval problem
- **Fix:** Refresh page, check console for errors

### ✅ Thumbnails Load But Missing from PDF
- **Issue:** PDF generation or download problem
- **Fix:** Check console during PDF generation, retry

### ✅ Some Pins in PDF, Others Missing
- **Issue:** Selection or photo availability
- **Fix:** Verify pin selection and photo counts

### ✅ PDF Shows Summary Table But No Photo Section
- **Issue:** No selected pins have photos
- **Fix:** Upload photos, verify selection, regenerate

---

## When to Contact Support

Contact technical support if:

- ✅ Upload fails repeatedly with same error
- ✅ Console shows database or permission errors
- ✅ Photos uploaded successfully but never appear
- ✅ PDF generation consistently fails
- ✅ Multiple users experiencing same issue
- ✅ Error messages reference "RLS", "policy", or "auth"

### Information to Include

1. **Screenshot of error message**
2. **Browser console logs** (copy/paste text)
3. **Steps to reproduce:**
   - What you clicked
   - What you expected
   - What actually happened
4. **File details:**
   - Image type (JPG/PNG)
   - File size
   - Number of photos
5. **Pin information:**
   - Pin number
   - Project name
   - Photo count shown

---

## Testing Photo Upload System

### Quick Test Procedure

1. Go to Exports tab
2. Find any pin with 0 photos
3. Click "Add Photos"
4. Select 1 small test image (under 1MB)
5. Wait for upload to complete

**Expected Results:**
- ✅ "Successfully uploaded 1 photo" message appears
- ✅ Photo count changes from "0 photos" to "1 photo"
- ✅ Click "View Photos" shows thumbnail
- ✅ No console errors

**If Test Fails:**
1. Check console (F12)
2. Note exact error message
3. Try different image file
4. Try logging out and back in
5. Contact support with details

### Full Workflow Test

1. **Create or find a pin with no photos**
2. **Upload 2-3 test photos**
   - Verify success message
   - Check photo count
   - View thumbnails

3. **Select that pin for report**
   - Check the checkbox
   - Verify "1 selected for report"

4. **Generate PDF**
   - Click "Generate Report"
   - Wait for completion
   - Download PDF

5. **Verify PDF Contents**
   - Open PDF
   - Find the pin in summary table
   - Find photos in photo section
   - Verify images appear correctly

**If Any Step Fails:**
- Stop and diagnose that specific step
- Check console for errors
- Follow troubleshooting steps above

---

## Understanding the Summary Table vs Photo Section

### Summary Table (Page 2)

**Always includes:**
- ALL selected pins
- Whether they have photos or not
- Shows photo count (including 0)

**Example:**
| Pin # | Member | Section | Steel Type | Status | Photos |
|-------|--------|---------|------------|--------|--------|
| 1001-1 | RB12 | 100EA8 | Beam | PASS | 3 |
| 1001-2 | RB12 | 100EA8 | Beam | PASS | 0 |

### Photo Section (Page 3+)

**Only includes:**
- Pins with 1 or more photos
- Photos are displayed 2 per row
- Grouped by pin number

**Example:**
If 1001-1 has 3 photos and 1001-2 has 0 photos:
- Photo section will show 1001-1 with its 3 photos
- 1001-2 will NOT appear in photo section (no photos to show)
- This is **expected behavior**, not a bug

### Why This Matters

If you see a pin in the summary table but not in the photo section:
- **This is normal** if that pin has 0 photos
- Check the "Photos" column in the summary table
- Upload photos if you need them in the photo section

---

## Prevention Checklist

Before generating your next photo report:

### Pre-Flight Check

- [ ] All required pins exist in Site Manager
- [ ] Each pin has photos uploaded
- [ ] Photo counts are accurate
- [ ] Thumbnails load correctly
- [ ] Correct pins are selected
- [ ] Network connection is stable
- [ ] Browser is up to date

### Upload Verification

- [ ] Success message appeared for each upload
- [ ] Photo count incremented correctly
- [ ] Thumbnails appear when expanded
- [ ] No error messages in console
- [ ] Photos are clear and properly oriented

### PDF Generation

- [ ] All prerequisites met
- [ ] Selected pins have photos
- [ ] Not navigating during generation
- [ ] Waiting for completion message
- [ ] Downloading immediately
- [ ] Verifying contents before closing

---

## Summary

**Photos missing from PDF usually means:**
1. No photos uploaded to those pins (most common)
2. Pins not selected for report
3. Upload failed but wasn't noticed

**The solution is usually:**
1. Check photo counts (should be > 0)
2. Upload photos where needed
3. Verify pin selection
4. Generate PDF again

**Remember:**
- Pins need photos to appear in photo section
- Summary table shows all selected pins
- Photo section only shows pins with photos
- This is expected behavior

---

**Need More Help?**

If this guide doesn't resolve your issue:
1. Take screenshots of the problem
2. Copy browser console logs
3. Note the exact steps you took
4. Contact support with all details

The system has extensive logging to help diagnose issues. Always check the console first!

---

**Last Updated:** March 2026
**Status:** ✅ Active Guide
