# InspectPDF User Guide
## Professional PDF Manipulation for Fire Protection Reports

**Version:** 1.0
**Status:** Production Ready
**Date:** March 1, 2026

---

## Quick Start

### Accessing InspectPDF

1. Navigate to any project
2. Go to the **Exports** tab
3. Click **"Edit in InspectPDF"** button next to any report

This will:
- Generate your PDF report
- Upload it to a new workspace
- Open the InspectPDF editor automatically

---

## Main Interface

The InspectPDF workspace consists of three main areas:

### 1. Top Bar
- **Back Button**: Return to project
- **Workspace Name**: Current PDF being edited
- **Page Count & File Size**: Quick stats
- **History Button**: View operation history
- **Download Button**: Save current version

### 2. Left Panel - Operations
Six PDF manipulation tools:

#### Merge PDFs
Combine multiple PDF files into one
- Upload 2-10 PDF files
- Specify page ranges for each file (optional)
- Reorder files with ↑↓ buttons
- Remove unwanted files

**Example Use Cases:**
- Add appendices to report
- Combine multiple project reports
- Create comprehensive audit packs

#### Split PDF
Divide PDF into multiple files
- **Method 1: Split at specific pages** (e.g., "5, 10, 20")
- **Method 2: Split every N pages** (e.g., every 10 pages)

**Example Use Cases:**
- Extract executive summary
- Separate sections for different stakeholders
- Create individual inspection reports

#### Rotate Pages
Fix page orientation
- Choose angle: 90°, 180°, 270°, or custom
- Apply to all pages or specific pages
- Live preview before applying

**Example Use Cases:**
- Fix incorrectly scanned pages
- Rotate landscape to portrait
- Correct photo orientations

#### Extract Pages
Pull out specific pages
- Enter page ranges (e.g., "1-10, 15, 20-")
- Creates new PDF with selected pages
- Original remains unchanged

**Example Use Cases:**
- Extract summary only
- Remove unnecessary pages
- Create custom sections

#### Mix PDFs
Interleave pages from multiple documents
- Alternate pages from 2-10 PDFs
- Custom mixing patterns
- Handle uneven page counts

**Example Use Cases:**
- Combine duplex scans
- Interleave photos with reports
- Mix slides with notes

#### Insert Pages
Add pages at intervals
- Insert at regular intervals
- Insert at specific pages
- Add blank pages or dividers

**Example Use Cases:**
- Add disclaimers before sections
- Insert divider pages
- Add blank pages for printing

### 3. Right Panel - Preview
- Thumbnail view of all pages
- Visual page navigation
- Page selection for operations
- Real-time updates after operations

---

## Page Range Syntax

InspectPDF uses flexible page range notation:

| Syntax | Meaning | Example |
|--------|---------|---------|
| `1-10` | Pages 1 through 10 | Pages 1,2,3,4,5,6,7,8,9,10 |
| `1,5,10` | Specific pages | Pages 1, 5, and 10 |
| `5-` | Page 5 to end | All pages from 5 onwards |
| `-10` | Start to page 10 | Pages 1 through 10 |
| `1-10,15,20-` | Combined | Pages 1-10, 15, and 20 onwards |

---

## Common Workflows

### Workflow 1: Add Appendix to Report

1. Generate base report from Exports tab
2. Click "Edit in InspectPDF"
3. Select **Merge PDFs** operation
4. Upload your appendix PDF(s)
5. Reorder if needed
6. Click **Merge PDFs**
7. Download final report

### Workflow 2: Extract Executive Summary

1. Open full report in InspectPDF
2. Select **Extract Pages** operation
3. Enter page range (e.g., "1-5" for first 5 pages)
4. Click **Extract Pages**
5. Download extracted summary

### Workflow 3: Fix Rotated Pages

1. Open PDF in InspectPDF
2. Select **Rotate Pages** operation
3. Choose rotation angle (90°, 180°, 270°)
4. Select which pages to rotate
   - All pages, or
   - Specific pages (e.g., "10-15")
5. Click **Rotate Pages**
6. Download corrected PDF

### Workflow 4: Create Client Deliverable

1. Generate inspection report
2. Open in InspectPDF
3. **Merge** with cover letter
4. **Merge** with appendices
5. **Merge** with supporting documents
6. Download complete package

---

## Features & Benefits

### All Processing is Local
- **Fast**: No server upload/download delays
- **Secure**: PDFs never leave your browser
- **Offline**: Works without internet connection
- **Private**: Your data stays on your device

### Complete Audit Trail
- Every operation is tracked
- View operation history
- Undo capability (coming soon)
- Original PDF always preserved

### Professional Quality
- Maintains PDF quality
- Preserves bookmarks and metadata
- No watermarks
- No file size limits (reasonable sizes)

---

## Performance Guide

### Recommended File Sizes
- **Small PDFs** (<5MB): Instant processing
- **Medium PDFs** (5-20MB): 2-5 seconds
- **Large PDFs** (20-50MB): 5-15 seconds
- **Very Large PDFs** (>50MB): May take longer

### Tips for Best Performance
1. Close other browser tabs
2. Use Chrome or Edge for best performance
3. For very large PDFs, split into smaller chunks first
4. Clear thumbnail cache periodically (Settings)

---

## Troubleshooting

### PDF Won't Load
- **Check file size**: Very large PDFs may take time
- **Check PDF format**: Encrypted PDFs not supported
- **Refresh page**: Try reloading the workspace

### Operation Failed
- **Check page ranges**: Ensure valid syntax
- **Check browser memory**: Close other tabs
- **Try smaller operations**: Split large operations into steps

### Thumbnails Not Showing
- **Wait for generation**: Large PDFs take time
- **Check browser cache**: Clear cache and reload
- **Try smaller thumbnail size**: Change in preferences

---

## Keyboard Shortcuts (Coming Soon)

- `Ctrl/Cmd + S`: Download PDF
- `Ctrl/Cmd + Z`: Undo last operation
- `Ctrl/Cmd + Y`: Redo operation
- `Escape`: Close modal dialogs

---

## Best Practices

### 1. Start with Base Report
Always generate from Exports tab rather than uploading manually when possible

### 2. Work on Copies
Original PDFs are preserved, so experiment freely

### 3. Check Page Count
Verify page count matches expectations before downloading

### 4. Name Workspaces Clearly
Use descriptive names like "Final_Report_with_Appendices"

### 5. Download Frequently
Save important versions as you work

---

## FAQ

**Q: Can I undo operations?**
A: Full undo/redo coming in next release. For now, original PDF is always preserved.

**Q: Is there a file size limit?**
A: Browser memory is the only limit. Recommend keeping under 100MB for best performance.

**Q: Can I edit encrypted PDFs?**
A: No, encrypted PDFs must be decrypted first.

**Q: Where are my workspaces stored?**
A: In your project's Supabase storage, accessible only by you.

**Q: Can I share workspaces?**
A: Download and share the final PDF. Workspace sharing coming in future release.

**Q: How long are workspaces kept?**
A: Workspaces are kept until manually deleted. Auto-cleanup after 30 days of inactivity (configurable).

---

## Support

For issues or questions:
1. Check this user guide
2. Check INSPECTPDF_TECHNICAL_SPECIFICATION.md for details
3. Contact your administrator

---

## What's Next

Upcoming features in development:
- Full undo/redo system
- Drag-and-drop page reordering
- Batch processing
- Bookmark editing
- PDF optimization
- Collaborative editing

---

**Happy PDF Editing!** 🎉
