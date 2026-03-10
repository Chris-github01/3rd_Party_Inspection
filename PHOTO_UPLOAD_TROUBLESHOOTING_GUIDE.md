# Photo Upload Troubleshooting Guide

## Issue Fixed: "Failed to upload photos. Please try again."

### Root Cause Identified

The photo upload was failing because **required database fields were missing** from the INSERT operation.

**What was happening:**
- The code was trying to insert photo records into `pin_photos` table
- The table has Row Level Security (RLS) policies that check `uploaded_by = auth.uid()`
- The INSERT statement wasn't including the `uploaded_by` field
- RLS policy rejected the insert, causing the upload to fail

### What Was Fixed

#### 1. Added Missing Database Fields

**Before (causing failures):**
```typescript
.insert({
  pin_id: pinId,
  file_path: filePath,
  file_name: file.name,
  caption: '',
  sort_order: i
})
```

**After (now working):**
```typescript
.insert({
  pin_id: pinId,
  project_id: projectId,        // ✅ Added
  file_path: filePath,
  file_name: file.name,
  file_size: file.size,          // ✅ Added
  mime_type: file.type,          // ✅ Added
  caption: '',
  sort_order: i,
  uploaded_by: user.id           // ✅ Critical fix - required by RLS policy
})
```

#### 2. Enhanced Error Messages

Added detailed error logging and user feedback:

- **File validation** - Shows which files are rejected and why
- **Size limits** - Alerts if file exceeds 10MB
- **Upload tracking** - Counts successful vs failed uploads
- **Specific errors** - Shows storage vs database errors separately
- **Console logging** - Detailed logs for debugging

#### 3. Improved User Experience

**New features:**
- ✅ Success messages showing number of photos uploaded
- ✅ Partial success handling (some succeed, some fail)
- ✅ File size validation before upload
- ✅ Image type validation with clear messages
- ✅ Rollback on database error (removes storage file)

---

## How Photo Upload Now Works

### Step-by-Step Process

1. **User selects files** via "Add Photos" button
2. **File validation**
   - Check file type is image (JPG, PNG, GIF, WebP, etc.)
   - Check file size is under 10MB
   - Skip invalid files with warning

3. **Storage upload**
   - Upload to `pin-photos` bucket
   - Path: `{projectId}/{pinId}/{filename}`
   - Cache control: 1 hour

4. **Database record**
   - Insert record into `pin_photos` table
   - Include all required fields (pin_id, project_id, uploaded_by)
   - If database insert fails, delete storage file

5. **User feedback**
   - Show success/failure count
   - Refresh pin list to show new photo count
   - Update photo gallery if expanded

---

## Troubleshooting Common Issues

### Issue 1: "User not authenticated"

**Cause:** User session expired or not logged in

**Solution:**
1. Refresh the page
2. Log out and log back in
3. Check browser console for auth errors

### Issue 2: "Storage upload failed"

**Possible Causes:**
- File too large (>10MB recommended limit)
- Network connection issues
- Storage bucket permissions

**Solution:**
1. Try a smaller image
2. Compress image before upload
3. Check internet connection
4. Check browser console for specific error

### Issue 3: "Database insert failed"

**Possible Causes:**
- RLS policy rejection (missing uploaded_by)
- Invalid pin_id
- Invalid project_id
- Foreign key constraint violation

**Solution:**
1. Verify pin exists
2. Verify you have access to the project
3. Check browser console for specific error code
4. Try refreshing and uploading again

### Issue 4: Photos upload but don't appear

**Cause:** Cache or refresh issue

**Solution:**
1. Click "View Photos" button to expand gallery
2. Refresh the page
3. Check if photo count increased
4. Try generating report to verify photos exist

### Issue 5: "Only image files are allowed"

**Cause:** Trying to upload non-image file

**Supported formats:**
- ✅ JPG/JPEG
- ✅ PNG
- ✅ GIF
- ✅ WebP
- ✅ SVG
- ✅ BMP
- ❌ PDF
- ❌ Word documents
- ❌ Excel files
- ❌ Videos

**Solution:**
Convert file to supported image format

---

## Technical Details

### Database Schema

```sql
CREATE TABLE pin_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id uuid NOT NULL REFERENCES drawing_pins(id),
  project_id uuid NOT NULL REFERENCES projects(id),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer DEFAULT 0,
  mime_type text DEFAULT 'image/jpeg',
  caption text,
  sort_order integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### RLS Policies

**INSERT Policy:**
```sql
CREATE POLICY "Authenticated users can upload pin photos"
  ON pin_photos FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
```

This policy requires:
- User must be authenticated
- `uploaded_by` field must match current user's ID

### Storage Configuration

**Bucket:** `pin-photos`
- Public: No (requires signed URLs)
- File size limit: None (app enforces 10MB)
- Allowed MIME types: All (app validates image types)

**Storage Policies:**
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads to pin-photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pin-photos');

-- Allow users to view their project photos
CREATE POLICY "Users can view their project pin photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pin-photos' AND auth.uid() IS NOT NULL);
```

---

## Error Messages Explained

### "Failed to upload photos. Please try again."

**Old behavior:** Generic error with no details

**New behavior:** Specific error messages:
- "Skipped 'photo.pdf' - Only image files are allowed"
- "Skipped 'large.jpg' - File size must be less than 10MB"
- "Failed to upload 'photo.jpg': Storage upload failed: [specific error]"
- "Failed to upload 'photo.jpg': Database insert failed: [specific error]"

### Success Messages

- "Successfully uploaded 3 photos" - All uploads succeeded
- "Uploaded 2 photo(s), but 1 failed" - Partial success
- "All uploads failed. Please check the console for details." - Complete failure

---

## Prevention Tips

### Best Practices

1. **Optimize images before upload**
   - Resize to reasonable dimensions (max 2000x2000px)
   - Compress to reduce file size
   - Use JPG for photos, PNG for graphics

2. **Check requirements**
   - File must be an image
   - File size under 10MB
   - Stable internet connection

3. **Verify access**
   - Ensure you're logged in
   - Verify you have access to the project
   - Check pin exists and is valid

4. **Monitor uploads**
   - Watch for success/failure messages
   - Check photo count updates
   - View photos to verify upload

### Recommended Tools

- **Image compression:** TinyPNG, ImageOptim, Squoosh
- **Image resizing:** Photoshop, GIMP, online tools
- **Format conversion:** CloudConvert, online converters

---

## Testing Photo Upload

### Quick Test Procedure

1. Navigate to project → Exports tab
2. Scroll to "Inspection Report with Photos" section
3. Find a pin in the list
4. Click "Add Photos" button
5. Select 1-3 small images (<1MB each)
6. Wait for upload to complete
7. Check for success message
8. Verify photo count increased
9. Click "View Photos" to see thumbnails
10. Try generating report

### Expected Results

✅ Success message appears
✅ Photo count shows correct number
✅ Thumbnails appear in gallery
✅ Photos appear in generated PDF report
✅ No console errors

### What to Check if Test Fails

1. **Browser Console** (F12)
   - Look for red error messages
   - Check for authentication errors
   - Note any specific error codes

2. **Network Tab** (F12 → Network)
   - Check if upload request sent
   - Look for 401, 403, 500 errors
   - Verify file actually uploaded

3. **Database**
   - Check if record created in `pin_photos`
   - Verify `uploaded_by` field populated
   - Check `project_id` is correct

4. **Storage**
   - Check if file exists in bucket
   - Verify path is correct
   - Check file size matches

---

## Developer Debug Mode

### Enable Detailed Logging

Photos already log extensively to console. To view:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Upload photos
4. Look for logs starting with:
   - `[Upload]` - Upload process logs
   - `[Photo Debug]` - Photo loading logs
   - `[Photo Blobs]` - Blob conversion logs
   - `[PDF Generator]` - PDF generation logs

### Example Log Output

```
[Upload] Uploading photo1.jpg to abc123/pin456/pin456_1234567890_0.jpg
[Upload] Storage upload successful: { path: "...", ... }
[Upload] Database insert successful: [{ id: "...", ... }]
Successfully uploaded 1 photo
```

### Error Log Example

```
[Upload] Storage error for photo.jpg: { message: "Payload too large", statusCode: 413 }
Failed to upload "photo.jpg": Storage upload failed: Payload too large
```

---

## When to Seek Additional Support

Contact technical support if:

- ❌ Issue persists after trying all solutions
- ❌ Multiple users experiencing same problem
- ❌ Console shows database or server errors
- ❌ Storage quota exceeded
- ❌ Permissions/RLS policy errors
- ❌ Authentication failures

**Include in support request:**
1. Screenshot of error message
2. Browser console logs
3. Steps to reproduce
4. File details (size, type)
5. User role and permissions

---

## Summary of Changes

### Files Modified

1. **PhotoExportPinSelector.tsx**
   - Added `project_id`, `uploaded_by`, `file_size`, `mime_type` to insert
   - Enhanced error handling and logging
   - Added file validation (type and size)
   - Improved user feedback messages
   - Added rollback on database errors

### Database Requirements

**Required fields for pin_photos insert:**
- ✅ `pin_id` - Which pin the photo belongs to
- ✅ `project_id` - Which project (for RLS validation)
- ✅ `file_path` - Storage path
- ✅ `file_name` - Original filename
- ✅ `uploaded_by` - User ID (required by RLS policy)

**Optional but recommended:**
- `file_size` - Helps with storage management
- `mime_type` - Helps with display
- `caption` - User-friendly description
- `sort_order` - Display order

---

## Quick Reference

### Valid Image Types
JPG, PNG, GIF, WebP, SVG, BMP

### Size Limit
10MB (recommended)

### Storage Path
`pin-photos/{project_id}/{pin_id}/{filename}`

### Required Fields
`pin_id`, `project_id`, `file_path`, `file_name`, `uploaded_by`

### Success Indicators
- ✅ Success message appears
- ✅ Photo count increases
- ✅ Thumbnails visible
- ✅ No console errors

---

**Last Updated:** March 2026
**Status:** ✅ Fixed and Tested
**Build Status:** ✅ Passing
