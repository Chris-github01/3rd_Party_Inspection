# Drawing Upload Troubleshooting Guide

## Overview
This guide helps you resolve common issues when uploading drawings to the Site Manager in your Inspection Application.

---

## Quick Fix Summary

**Most Recent Issue (RESOLVED)**: ✅ "Error uploading drawing: new row violates row-level security policy for table 'documents'"

**Solution Applied**: Updated database permissions to allow all authenticated users to upload drawings, not just project creators.

---

## 1. File Format Verification

### Supported File Formats
The system accepts the following drawing file formats:

| Format | Extension | Notes |
|--------|-----------|-------|
| PDF | `.pdf` | Full support with auto-parsing and pin annotation |
| PNG | `.png` | Image format with pin annotation support |
| JPEG | `.jpg`, `.jpeg` | Image format with pin annotation support |

### How to Check Your File Format

**On Windows:**
1. Right-click the file
2. Select "Properties"
3. Check the "Type of file" field

**On Mac:**
1. Right-click (or Control-click) the file
2. Select "Get Info"
3. Check the "Kind" field

**On Linux:**
1. Right-click the file
2. Select "Properties"
3. Check the "Type" field

### Converting Unsupported Formats

If your file is in an unsupported format (e.g., DWG, DXF, TIFF):

**Option 1: Convert to PDF** (Recommended)
- **AutoCAD/CAD Software**: File → Export → PDF
- **Online Converters**:
  - CloudConvert (cloudconvert.com)
  - Zamzar (zamzar.com)
  - Adobe Acrobat Online

**Option 2: Convert to PNG/JPG**
- **Image Editors**: GIMP, Photoshop, Paint.NET
- **Online Tools**:
  - Convertio (convertio.co)
  - Online-Convert (online-convert.com)

---

## 2. File Size Limitations

### Current Limits
- **Maximum file size**: 50 MB (recommended)
- **Optimal size**: Under 10 MB for best performance
- **Storage quota**: Varies by organization plan

### How to Check File Size

**Any Operating System:**
1. Right-click the file
2. Select "Properties" (Windows/Linux) or "Get Info" (Mac)
3. Check the "Size" field

### Reducing File Size

**For PDF Files:**

1. **Adobe Acrobat Pro**
   - File → Save As Other → Reduced Size PDF
   - Or use "Optimize PDF" tool

2. **Free Online Tools**
   - SmallPDF (smallpdf.com/compress-pdf)
   - PDF24 (tools.pdf24.org/en/compress-pdf)
   - iLovePDF (ilovepdf.com/compress_pdf)

3. **Command Line (Mac/Linux)**
   ```bash
   gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
      -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH \
      -sOutputFile=output.pdf input.pdf
   ```

**For PNG/JPG Files:**

1. **Online Compressors**
   - TinyPNG (tinypng.com)
   - Compressor.io (compressor.io)
   - Squoosh (squoosh.app)

2. **Desktop Tools**
   - GIMP (free, cross-platform)
   - Paint.NET (Windows)
   - Preview (Mac - Export with reduced quality)

3. **Batch Processing**
   - ImageMagick: `convert input.jpg -quality 85 output.jpg`
   - XnConvert (free, GUI-based)

---

## 3. Technical Requirements

### Browser Compatibility

**Fully Supported Browsers:**
- Chrome 90+ (Recommended)
- Edge 90+
- Firefox 88+
- Safari 14+

**Check Your Browser Version:**
- Chrome: Menu → Help → About Google Chrome
- Firefox: Menu → Help → About Firefox
- Safari: Safari → About Safari
- Edge: Menu → Help and Feedback → About Microsoft Edge

### Internet Connection

**Minimum Requirements:**
- Download: 1 Mbps
- Upload: 512 Kbps
- Stable connection (no frequent drops)

**Test Your Connection:**
- Fast.com (upload test included)
- Speedtest.net
- Check for 0% packet loss

**Tips for Slow Connections:**
1. Close other bandwidth-heavy applications
2. Upload during off-peak hours
3. Use wired connection instead of Wi-Fi
4. Compress files before uploading

### System Requirements

**Minimum:**
- RAM: 4 GB
- Available Storage: 100 MB
- Modern browser (see compatibility above)

**Recommended:**
- RAM: 8 GB or more
- Available Storage: 500 MB
- High-speed internet connection

---

## 4. Common Error Messages & Solutions

### Error 1: "new row violates row-level security policy for table 'documents'"

**Status**: ✅ FIXED (as of latest update)

**What it meant**: Database permissions were too restrictive

**Solution Applied**: Database permissions have been updated to allow all authenticated users to upload drawings

**If you still see this error**:
1. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)
2. Log out and log back in
3. Clear browser cache
4. Contact support if issue persists

---

### Error 2: "Please select a PDF, PNG, or JPG file"

**Cause**: File format not supported

**Solutions**:
1. Verify file extension is `.pdf`, `.png`, `.jpg`, or `.jpeg`
2. Convert file to supported format (see Section 1)
3. Ensure file extension matches actual file type
4. Try renaming file to remove special characters

---

### Error 3: "Failed to upload drawing" or "Upload failed"

**Possible Causes & Solutions**:

**A. Network Issues**
- Check internet connection
- Try smaller file
- Retry upload
- Switch to wired connection

**B. File Corruption**
- Open file locally to verify it's not corrupt
- Try re-exporting from source application
- Use file repair tools

**C. Browser Issues**
- Clear browser cache and cookies
- Try different browser
- Disable browser extensions
- Check browser console for errors (F12 → Console)

**D. Server Issues**
- Wait a few minutes and retry
- Check system status page
- Contact support if persistent

---

### Error 4: "Storage quota exceeded"

**Cause**: Organization storage limit reached

**Solutions**:
1. Delete unused documents from old projects
2. Compress files before uploading
3. Contact administrator to increase quota
4. Archive completed projects

---

### Error 5: File uploads but doesn't appear

**Troubleshooting Steps**:
1. Refresh the page (F5)
2. Check you're on the correct project/level
3. Check "Documents" tab to see if it uploaded
4. Verify upload completed (look for success message)
5. Check browser console for JavaScript errors (F12)

---

## 5. Alternative Upload Methods

### Method 1: Drag and Drop (Primary)
1. Select drawing file type from dropdown
2. Click "Choose file" button
3. Select file from your computer
4. Wait for upload to complete

### Method 2: Direct Document Upload
1. Go to "Documents" tab
2. Select "Drawing" as document type
3. Upload file
4. Manually associate with level in Site Manager

### Method 3: Bulk Upload via Documents Tab
1. Navigate to project
2. Click "Documents" tab
3. Upload multiple drawings at once
4. Associate each with appropriate level

### Method 4: Re-upload Failed Files
1. Note the file name that failed
2. Close upload modal
3. Check browser console (F12) for detailed error
4. Address specific error
5. Try upload again

---

## 6. Step-by-Step Upload Process

### Standard Upload Procedure

1. **Navigate to Site Manager**
   - Open project
   - Click "Site Manager" tab
   - Ensure you have a block and level created

2. **Prepare Your File**
   - Verify format (PDF, PNG, or JPG)
   - Check file size (under 10 MB recommended)
   - Ensure file name doesn't have special characters

3. **Upload Drawing**
   - Find the level where you want to add the drawing
   - Click "Upload" button next to the level
   - Select your file
   - (Optional) Enter page number if multi-page PDF
   - (Optional) Enter scale factor for measurements
   - Click "Upload" button

4. **Wait for Processing**
   - File uploads to storage
   - System creates document record
   - System creates drawing record
   - PDF files: Auto-generates previews
   - PDF files: Triggers parsing job

5. **Verify Upload**
   - Success message appears
   - Modal closes automatically
   - Drawing appears in level list
   - Preview should be visible (may take few seconds for PDFs)

---

## 7. Debugging Steps

### Step 1: Browser Console Check
1. Press F12 to open Developer Tools
2. Go to "Console" tab
3. Try uploading again
4. Look for red error messages
5. Copy error text for support

### Step 2: Network Tab Check
1. Press F12 to open Developer Tools
2. Go to "Network" tab
3. Try uploading again
4. Look for failed requests (red)
5. Click failed request to see details

### Step 3: Clear Browser Data
1. Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
2. Select "Cached images and files"
3. Select time range: "All time"
4. Click "Clear data"
5. Close and reopen browser
6. Try upload again

### Step 4: Test with Different File
1. Create a simple test file:
   - PDF: Export a single page document
   - PNG: Create a small screenshot
2. Try uploading test file
3. If test works, issue is with original file
4. If test fails, issue is with system/permissions

### Step 5: Check User Permissions
1. Verify you're logged in
2. Check your user role (should be inspector or admin)
3. Verify you have access to the project
4. Contact administrator if permissions issue

---

## 8. Best Practices

### File Organization
- Use descriptive file names (e.g., "Level-1-North-Elevation.pdf")
- Avoid special characters in file names
- Keep original files as backup
- Compress files before uploading

### Upload Tips
- Upload during off-peak hours for faster speeds
- Upload one file at a time for large files
- Verify upload success before closing window
- Keep file sizes under 10 MB when possible

### Quality Guidelines
- Use at least 150 DPI for image files
- For PDFs, use "High Quality" export settings
- Ensure drawings are legible at 100% zoom
- Test files locally before uploading

---

## 9. Support Information

### Before Contacting Support

Gather the following information:

1. **Error Details**
   - Exact error message
   - Screenshot of error
   - Browser console errors (F12)

2. **File Information**
   - File format and size
   - File name
   - Where file originated

3. **System Information**
   - Browser name and version
   - Operating system
   - Internet connection speed

4. **Account Information**
   - Your username
   - Project name
   - Organization name

### Getting Help

**Self-Help Resources:**
- Check this troubleshooting guide first
- Review system documentation
- Check for system status updates

**Contact Support:**
- Email: support@yourcompany.com
- Include all information from "Before Contacting Support"
- Attach screenshots if possible
- Describe steps to reproduce issue

**Emergency Support:**
- For critical issues preventing work
- Contact your system administrator
- Provide detailed error information

---

## 10. Recent Fixes & Updates

### February 2026 Updates

**✅ Fixed: Document Upload Permissions (2026-03-02)**
- **Issue**: "new row violates row-level security policy" error
- **Cause**: Only project creators could upload drawings
- **Fix**: Updated database policies to allow all authenticated users to upload
- **Impact**: All team members can now upload drawings to any project

**✅ Fixed: Report Profiles Creation (2026-03-02)**
- **Issue**: Could not create new report profiles
- **Cause**: Missing RLS policies for INSERT/UPDATE/DELETE
- **Fix**: Added comprehensive policies for admins
- **Impact**: Admins can now create custom report templates

**✅ Fixed: Materials Management (2026-03-02)**
- **Issue**: Could not add new fire protection materials
- **Cause**: Missing RLS policies
- **Fix**: Added policies for admins and inspectors
- **Impact**: Admins/inspectors can manage material library

---

## Appendix: File Format Specifications

### PDF Specifications
- **Version**: PDF 1.4 or higher
- **Pages**: Single or multi-page supported
- **Resolution**: 150-300 DPI recommended
- **Color**: RGB or Grayscale
- **Compression**: Supported
- **Encryption**: Not supported (remove passwords)

### PNG Specifications
- **Color Depth**: 8-bit or 24-bit
- **Transparency**: Supported
- **Resolution**: 150-300 DPI recommended
- **Compression**: Native PNG compression
- **Maximum Dimensions**: 10,000 x 10,000 pixels

### JPEG Specifications
- **Color Space**: RGB
- **Quality**: 80-95% recommended
- **Progressive**: Supported
- **Resolution**: 150-300 DPI recommended
- **Maximum Dimensions**: 10,000 x 10,000 pixels

---

**Document Version**: 1.0
**Last Updated**: March 2, 2026
**Status**: Current
