# Drawing Display Troubleshooting Guide
## Site Manager Interface - Pin Placement Issues

This comprehensive guide will help you diagnose and resolve issues where drawings are not displaying in the Site Manager interface, preventing you from adding location pins.

---

## Table of Contents
1. [Initial Diagnostics](#1-initial-diagnostics)
2. [Common Causes and Solutions](#2-common-causes-and-solutions)
3. [Site Manager Specific Checks](#3-site-manager-specific-checks)
4. [System-Level Troubleshooting](#4-system-level-troubleshooting)
5. [Escalation Steps](#5-escalation-steps)

---

## 1. Initial Diagnostics

### 1.1 Verify Drawings Are Properly Uploaded

**Step 1: Check the Documents Tab**
1. Navigate to your project
2. Click on the **"Documents"** tab
3. Look for documents with type **"Drawing"**
4. Verify that your drawing files appear in the list

**Visual Indicators:**
- ✅ **Success**: You see one or more files listed with type "Drawing"
- ❌ **Problem**: No drawings appear in the Documents tab

**If no drawings are found:**
- Navigate to the Site Manager tab
- Create a Block structure (if not already created)
- Create a Level within that Block
- Click the **Upload** icon next to the Level name
- Upload your drawing file

---

### 1.2 Check File Formats and Compatibility

**Supported File Formats:**
- ✅ **PDF** (.pdf) - Recommended for technical drawings
- ✅ **PNG** (.png) - High-quality images
- ✅ **JPG/JPEG** (.jpg, .jpeg) - Compressed images

**File Size Limits:**
- **Maximum file size**: 50 MB per file
- **Recommended size**: Under 10 MB for optimal performance

**Step-by-step file validation:**

1. **Check file extension:**
   - Right-click the file on your computer
   - Select "Properties" (Windows) or "Get Info" (Mac)
   - Verify the file type matches one of the supported formats above

2. **Check file size:**
   - In the same properties window, check the file size
   - If over 50 MB, consider:
     - Compressing the PDF (use Adobe Acrobat or online tools)
     - Reducing image resolution (if PNG/JPG)
     - Splitting multi-page PDFs into separate files

3. **Verify file integrity:**
   - Try opening the file in a PDF reader or image viewer
   - If the file doesn't open, it may be corrupted
   - Re-export the drawing from your CAD software

---

### 1.3 Verify Browser Compatibility

**Recommended Browsers:**
- ✅ **Google Chrome** (version 100+)
- ✅ **Microsoft Edge** (version 100+)
- ✅ **Mozilla Firefox** (version 100+)
- ✅ **Safari** (version 15+)

**To check your browser version:**
1. Open your browser
2. Go to Settings → About
3. Verify the version number

**If using an outdated browser:**
- Update to the latest version
- Restart the browser
- Try accessing the application again

---

## 2. Common Causes and Solutions

### 2.1 Browser Cache Issues

**Symptoms:**
- Drawings previously visible are now missing
- Upload appears successful but drawing doesn't display
- Site Manager shows blank area instead of drawing

**Solution: Clear browser cache**

**Google Chrome:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Choose "All time" from the time range dropdown
4. Click "Clear data"
5. Refresh the page with `Ctrl+F5` (force refresh)

**Microsoft Edge:**
1. Press `Ctrl+Shift+Delete`
2. Check "Cached images and files"
3. Click "Clear now"
4. Refresh with `Ctrl+F5`

**Firefox:**
1. Press `Ctrl+Shift+Delete`
2. Select "Cache"
3. Click "Clear Now"
4. Refresh with `Ctrl+Shift+R`

**Safari:**
1. Safari menu → Preferences → Privacy
2. Click "Manage Website Data"
3. Click "Remove All"
4. Confirm and refresh

---

### 2.2 Network Connectivity Issues

**Symptoms:**
- Drawings take a long time to load
- Partial drawing display
- Loading spinner appears indefinitely

**Diagnostic steps:**

1. **Check internet connection:**
   - Open speedtest.net
   - Run a speed test
   - Minimum required: 5 Mbps download speed
   - Recommended: 10+ Mbps for optimal performance

2. **Test Supabase storage access:**
   - Open browser Developer Tools (F12)
   - Go to the Console tab
   - Look for errors containing "supabase" or "storage"
   - Common error messages:
     - `Failed to load resource: net::ERR_CONNECTION_TIMED_OUT`
     - `CORS policy error`
     - `403 Forbidden`

3. **Check firewall/proxy settings:**
   - Ensure your firewall allows access to:
     - `*.supabase.co`
     - `*.supabase.in`
   - If behind a corporate proxy, contact your IT department

**Solution for slow connections:**
- Use lower resolution drawings (reduce PDF quality)
- Upload smaller file sizes
- Consider using PNG instead of PDF for single-page drawings

---

### 2.3 Permission and Authentication Issues

**Symptoms:**
- Error message: "Failed to load drawing"
- Console shows 403 or 401 errors
- Upload succeeds but viewing fails

**Solution: Verify user permissions**

1. **Check if you're logged in:**
   - Look for your user profile icon in the top-right
   - If not logged in, sign in again
   - Try accessing the drawing again

2. **Verify project access:**
   - Go to Projects list
   - Confirm you can see the project
   - If you cannot see the project, you may not have access rights
   - Contact your project administrator

3. **Check role permissions:**
   - Some features require specific user roles:
     - **Admin/Project Manager**: Can upload and delete drawings
     - **Field Inspector**: Can view drawings and add pins
     - **Viewer**: Can only view drawings (cannot add pins)

**Session timeout issue:**
- If you've been idle for extended periods:
  1. Log out completely
  2. Clear browser cookies
  3. Log back in
  4. Navigate to the Site Manager again

---

## 3. Site Manager Specific Checks

### 3.1 Verify Site Structure is Created

The Site Manager requires a hierarchical structure: **Project → Block → Level → Drawing**

**Step-by-step verification:**

1. **Navigate to Site Manager tab:**
   - Open your project
   - Click the **"Site Manager"** tab in the navigation

2. **Check for Blocks:**
   - Look in the left sidebar under "Site Structure"
   - **If you see "No blocks yet":**
     - Click **"Add Block"** button (blue button at top)
     - Enter Block name (e.g., "Building A", "North Wing")
     - Add description (optional)
     - Click "Create Block"

3. **Check for Levels:**
   - Click on a Block name to expand it
   - **If you see "No levels yet":**
     - Click **"Add Level"** link (appears when Block is expanded)
     - Enter Level name (e.g., "Ground Floor", "Level 1")
     - Enter order index (e.g., 0, 1, 2)
     - Click "Create Level"

4. **Upload Drawing to Level:**
   - Expand the Block and locate your Level
   - Click the **Upload icon** (↑) next to the Level name
   - Select your drawing file
   - Set page number (for PDFs)
   - Click "Upload Drawing"

**Visual hierarchy example:**
```
📦 Project: Office Building Renovation
  └─ 🏢 Block: Building A
      ├─ 📐 Level: Ground Floor
      │   ├─ 📄 Drawing 1
      │   └─ 📄 Drawing 2
      └─ 📐 Level: First Floor
          └─ 📄 Drawing 1
```

---

### 3.2 Drawing Selection and Display

**Step 1: Verify drawing is in the list**
1. Expand your Block in the left sidebar
2. Expand the Level
3. Look for drawing entries (shown with 📄 icon)
4. Count matches: "X drawings" should match visible items

**Step 2: Select the drawing**
1. Click on the drawing name (e.g., "Drawing 1")
2. The main viewing area should update
3. Look for these indicators:
   - Drawing title in top bar
   - Zoom controls (-, 100%, +)
   - "Add Pin" button
   - "Export PDF" button

**Common issues:**

| Symptom | Cause | Solution |
|---------|-------|----------|
| Click drawing, nothing happens | JavaScript error | Check browser console (F12) for errors; refresh page |
| Drawing area shows "No drawing selected" | Selection not registered | Try clicking the drawing name again |
| Drawing shows white/blank canvas | File loading failed | Check browser console; verify storage permissions |
| Loading spinner never stops | Network timeout | Check internet connection; try refreshing |

---

### 3.3 PDF vs Image Display Modes

The system handles PDFs and images differently:

**PDF Files:**
- Displays with canvas rendering
- Supports multi-page navigation
- Shows page controls if document has multiple pages
- Higher memory usage

**Image Files (PNG/JPG):**
- Displays as standard image
- Faster loading
- Lower memory usage
- Recommended for single-page drawings

**If PDF drawings won't display:**
1. Check browser console for PDF.js errors
2. Verify PDF is not password-protected
3. Try re-exporting PDF without encryption
4. Consider converting to high-res PNG as alternative

**If image drawings won't display:**
1. Verify image URL in browser console
2. Check CORS errors
3. Verify image file is not corrupted
4. Try re-uploading the image

---

### 3.4 Pin Placement Mode

**Activating pin placement:**
1. Select a drawing (it must be visible)
2. Click the **"Add Pin"** button in the toolbar
3. Button should turn blue/highlighted
4. Cursor should change to crosshair (✛)
5. Status bar at bottom should show: "Click on the drawing to place a pin"

**If pin mode doesn't activate:**
- Verify you have appropriate permissions (not read-only access)
- Check if drawing is fully loaded (no loading spinner)
- Try refreshing the page
- Clear browser cache

**If pins don't appear after clicking:**
1. Check browser console for errors
2. Verify database connectivity
3. Check that you clicked within the drawing boundaries
4. Try clicking "Add Pin" again and retry

---

## 4. System-Level Troubleshooting

### 4.1 Browser Developer Tools Diagnosis

**Open Developer Tools:**
- **Windows/Linux**: Press `F12` or `Ctrl+Shift+I`
- **Mac**: Press `Cmd+Option+I`

**Console Tab - Check for errors:**

Look for these specific error patterns:

1. **Storage/Upload errors:**
   ```
   Error: Failed to load resource: the server responded with a status of 403
   Error: Storage bucket not accessible
   ```
   **Solution**: Contact administrator - storage permissions need configuration

2. **Database errors:**
   ```
   Error: Failed to fetch drawings
   Error: Permission denied for relation drawings
   ```
   **Solution**: Database Row Level Security (RLS) policy issue - contact administrator

3. **Network errors:**
   ```
   Error: NetworkError when attempting to fetch resource
   Error: CORS policy blocked
   ```
   **Solution**: Check firewall/network settings; try different network

4. **PDF rendering errors:**
   ```
   Error: PDF.js: Invalid PDF structure
   Error: Failed to load PDF document
   ```
   **Solution**: Re-export PDF; try converting to image format

**Network Tab - Monitor file loading:**

1. Switch to **Network** tab in Developer Tools
2. Refresh the page
3. Filter by "documents" or "storage"
4. Look for failed requests (red)
5. Click on failed request to see details:
   - Status code (200 = success, 403 = forbidden, 404 = not found)
   - Response headers
   - Error messages

---

### 4.2 Database Connectivity Check

**Symptoms of database issues:**
- Drawings list is empty despite recent uploads
- Error messages mentioning "database" or "query"
- Changes don't save or persist

**Diagnostic steps:**

1. **Check project loading:**
   - Can you see the project name and details?
   - Can you access other tabs (Documents, Members)?
   - **If no**: Database connection problem

2. **Check data persistence:**
   - Upload a test drawing
   - Refresh the page
   - Check if drawing still appears
   - **If no**: Database write issue

3. **Check in browser console:**
   ```javascript
   // Look for messages containing:
   "Supabase"
   "PostgreSQL"
   "RLS policy"
   "Permission denied"
   ```

**Solutions:**
- Check if system maintenance is in progress
- Verify your API keys are valid (administrator task)
- Clear browser local storage:
  1. F12 → Application tab
  2. Storage → Local Storage
  3. Clear all
  4. Refresh and log in again

---

### 4.3 Storage Bucket Configuration

**Administrator check (requires system access):**

Drawings are stored in the **"documents"** bucket in Supabase Storage.

**Verify storage bucket exists:**
1. Access Supabase dashboard
2. Go to Storage section
3. Confirm "documents" bucket exists
4. Check bucket is set to **Public** or has appropriate RLS policies

**Common storage issues:**

| Issue | Symptom | Solution |
|-------|---------|----------|
| Bucket doesn't exist | All uploads fail | Create "documents" bucket |
| Bucket is private | Files upload but won't display | Update bucket policies or make public |
| RLS policies too restrictive | Users can't access their own files | Review and update RLS policies |
| Storage quota exceeded | Uploads fail with quota error | Upgrade plan or delete old files |

---

### 4.4 Browser Storage Limits

**Local browser storage can cause issues:**

**Check browser storage usage:**
1. Open Developer Tools (F12)
2. Go to **Application** tab
3. Check **Storage** section
4. Look at **IndexedDB** and **Local Storage** sizes

**If storage is full:**
1. Clear site data:
   - Application → Storage → Clear site data
2. Close all browser tabs
3. Reopen browser
4. Log back in

**Increase available storage (Chrome/Edge):**
1. Settings → Privacy and security
2. Site settings → View permissions and data stored
3. Find your application domain
4. Increase storage if option available

---

## 5. Escalation Steps

### 5.1 When to Contact Technical Support

Contact support if you've tried all solutions above and:

- ✅ Drawings won't load after cache clear and browser restart
- ✅ Console shows persistent database or storage errors
- ✅ Multiple users report the same issue
- ✅ Issue occurs across different browsers
- ✅ Upload succeeds but drawings never appear
- ✅ Existing drawings suddenly disappeared
- ✅ Permission errors despite having correct user role

---

### 5.2 Information to Gather Before Escalating

**Before contacting support, collect this information:**

#### A. User Information
- [ ] Your username/email
- [ ] Your role in the system (Admin, Inspector, Viewer)
- [ ] Organization/Company name

#### B. Environment Details
- [ ] **Browser**: Name and version (e.g., Chrome 120.0.6099.109)
- [ ] **Operating System**: (e.g., Windows 11, macOS Sonoma, Ubuntu 22.04)
- [ ] **Device**: Desktop/Laptop/Tablet
- [ ] **Screen resolution**: (e.g., 1920x1080)
- [ ] **Internet speed**: (Run speedtest.net and note results)

#### C. Project Information
- [ ] **Project ID**: (found in URL: /projects/{PROJECT_ID})
- [ ] **Project Name**:
- [ ] **Block Name**: (where drawing should appear)
- [ ] **Level Name**: (where drawing should appear)
- [ ] **Drawing filename**: (original file name)

#### D. Error Details
- [ ] **Exact error message**: (screenshot or copy-paste from console)
- [ ] **When did issue start**: (date/time if known)
- [ ] **Steps that trigger the issue**: (detailed reproduction steps)
- [ ] **Frequency**: (Always / Sometimes / Once)

#### E. Console Logs
**How to export console logs:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Right-click in console area
4. Select "Save as..." or "Copy all messages"
5. Attach to support ticket

#### F. Screenshots
**Capture these screenshots:**
1. Site Manager view showing the issue
2. Browser console with errors visible
3. Network tab showing failed requests (if applicable)
4. Documents tab showing uploaded drawings

#### G. Network Tab Export (if relevant)
1. Open Developer Tools (F12)
2. Go to Network tab
3. Reproduce the issue
4. Right-click in network log
5. Select "Save all as HAR with content"
6. Attach HAR file to support ticket

---

### 5.3 Support Contact Methods

**Email Support:**
- Create detailed email with all information from section 5.2
- Subject line: "Drawing Display Issue - Site Manager - [Project Name]"
- Attach screenshots and console logs
- Expected response time: 24-48 hours

**Emergency/Critical Issues:**
- If issue affects multiple users or production work
- Contact administrator immediately
- Provide project ID and user count affected

**Self-Service Resources:**
- Check system status page for outages
- Review recent release notes for known issues
- Search knowledge base for similar issues

---

## Appendix A: Quick Diagnostic Checklist

Use this quick checklist for rapid troubleshooting:

```
□ Drawing file is uploaded and visible in Documents tab
□ File format is PDF, PNG, or JPG
□ File size is under 50 MB
□ Browser is supported and up-to-date
□ Browser cache cleared (Ctrl+Shift+Delete)
□ User is logged in with valid session
□ Block structure exists in Site Manager
□ Level exists within Block
□ Drawing is assigned to a Level
□ Drawing name appears in left sidebar
□ Clicking drawing name changes main view
□ No errors in browser console (F12)
□ Internet connection is stable (5+ Mbps)
□ No firewall blocking *.supabase.co
□ User has appropriate permissions (not read-only)
```

**If all checkboxes are ✅ but drawing still won't display:**
→ Proceed to Section 5 (Escalation)

---

## Appendix B: Common Error Messages and Solutions

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| "Failed to load drawing" | File cannot be accessed from storage | Check browser console; verify file exists in storage bucket |
| "No drawing selected" | User hasn't clicked a drawing yet | Click a drawing name in left sidebar |
| "Permission denied" | User lacks access rights | Verify user role; contact administrator |
| "Network error" | Connection to server failed | Check internet; try again; check firewall |
| "Invalid PDF structure" | PDF file is corrupted or encrypted | Re-export PDF; remove password protection |
| "Storage quota exceeded" | No space available | Administrator needs to upgrade plan or delete old files |
| "Failed to render page" | PDF rendering error | Try different browser; convert to image format |
| "CORS policy error" | Cross-origin request blocked | Contact administrator - server configuration needed |

---

## Appendix C: Browser Console Interpretation Guide

**Understanding console message types:**

🔵 **Info** (Blue): Informational messages, usually safe to ignore
```
[DrawingViewer] Loading content: {...}
[DrawingViewer] PDF loaded successfully, pages: 5
```

⚠️ **Warning** (Yellow): Potential issues, may not break functionality
```
Warning: Resource timing information not available
```

🔴 **Error** (Red): Critical issues that prevent functionality
```
Error: Failed to load resource: net::ERR_FAILED
Error: Cannot read property 'preview_image_path' of undefined
```

**Priority for support:**
1. Focus on **Red errors** first
2. Include in support ticket if any red errors exist
3. Yellow warnings only if they seem related to your issue

---

## Document Version
- **Version**: 1.0
- **Last Updated**: March 2026
- **Applies to**: Site Manager v2.0+
- **Author**: Technical Support Team

**For the latest version of this guide, check the project documentation folder.**
