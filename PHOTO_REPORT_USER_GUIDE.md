# Inspection Report with Photos - User Guide

## Overview

The Inspection Report with Photos feature allows you to generate comprehensive PDF reports that include all photos attached to inspection pins. This guide explains how to use this feature effectively.

## What This Feature Does

The Photo Report generator creates professional PDF documents that include:

- **Pin Information**: Pin number, steel type, label, status
- **Member Details**: Member mark, section size, FRR rating, coating product, required DFT
- **All Attached Photos**: Every photo uploaded to each selected pin
- **Photo Captions**: Any captions you added to the photos
- **Automatic Pagination**: Photos and content flow across multiple pages
- **Page Numbers**: Footer with "Page X of Y" on every page
- **Professional Formatting**: Clean, organized layout with headers and sections

## How to Generate a Photo Report

### Step 1: Navigate to Exports Tab

1. Open your project
2. Click on the **"Exports"** tab (download icon in the navigation)
3. Scroll down to find the **"Inspection Report with Photos"** section (green camera icon)

### Step 2: Select Pins to Include

You'll see a list of all inspection pins that have been created for your project.

**Each pin card shows:**
- Pin number (e.g., "PIN-001")
- Label/description
- Steel type
- Status (Pass, Repair Required, In Progress, Not Started)
- Member mark
- Section size
- **Photo count** (shows how many photos are attached)

**Selection Options:**

- **Select Individual Pins**: Click on any pin card to select it
  - Selected pins have a blue border and checkmark
  - Click again to deselect

- **Select All**: Click the "Select All" button in the top-right
  - This selects every inspection pin at once
  - Button changes to "Deselect All" when all are selected

- **Selection Counter**: The interface shows "X selected for report"

### Step 3: Generate the Report

1. Once you've selected at least one pin, a button appears at the bottom:
   **"Generate Report with X Members"**

2. Click this button to start generating the PDF

3. You'll see a loading indicator:
   **"Generating report with photos..."** with a spinning animation

4. The report will automatically download when complete

### Step 4: Review the Downloaded PDF

The PDF will be named:
```
Inspection_Report_Photos_<ProjectName>_<YYYYMMDD>.pdf
```

Example: `Inspection_Report_Photos_Alfriston_Commercial_Tower_20260301.pdf`

## Report Structure

### Cover Page
- **Title**: "Inspection Report with Photos"
- **Project Name**: Your project name
- **Generation Date**: When the report was created
- **Member Count**: How many pins are included

### For Each Pin

The report includes a section for each selected pin:

#### Pin Header (Blue Background)
- Pin number and steel type in white text
- Example: "PIN-001 - Column"

#### Pin Details
- **Label**: Description/location of the pin
- **Member Mark**: Reference from loading schedule
- **Section Size**: Steel section dimensions
- **FRR**: Fire Resistance Rating
- **Coating Product**: Fire protection material used
- **Required DFT**: Target dry film thickness in microns
- **Status**: Current inspection status

#### Photos Section

For each photo attached to the pin:

1. **Photo Image**
   - Displayed at 80mm wide × 60mm high
   - High quality rendering
   - Maintains aspect ratio

2. **Caption** (if provided)
   - Appears in italic text below the photo
   - Limited to 80mm width for readability

3. **Automatic Spacing**
   - Photos are separated with appropriate spacing
   - New pages are added automatically when needed

#### No Photos Message

If a pin has no photos attached, the report shows:
- "No photos attached" in italic text
- The pin is still included with all its details

### Footer
- Every page has a centered footer: "Page X of Y"
- Helps with navigation in long reports

## Tips for Best Results

### Before Generating Reports

1. **Add Photos to Pins**
   - Go to Site Mode → Drawings
   - Click on a pin → Click "Add Photo"
   - Upload photos from your device
   - Add descriptive captions to help identify what each photo shows

2. **Update Pin Information**
   - Ensure pin labels are descriptive
   - Link pins to the correct members
   - Update status as inspections are completed

3. **Review Photo Quality**
   - Use clear, well-lit photos
   - Ensure photos are relevant to the inspection
   - Remove duplicate or unnecessary photos

### Selecting Pins

**For Quick Reports:**
- Select only pins that have photos attached
- The photo count indicator helps identify which pins have photos

**For Complete Documentation:**
- Select all pins to create a comprehensive record
- Pins without photos will show "No photos attached" but include all other details

**For Specific Areas:**
- Select only pins from a particular block or level
- Use the pin labels to identify location

### Managing Large Reports

**If you have many pins with photos:**

- **Split into Multiple Reports**: Generate separate reports for different areas
  - Example: One report per floor or block
  - Smaller files are easier to email and review

- **Be Selective**: Only include pins that need photo documentation
  - Use filters like status or photo count

- **Check File Size**: Large reports with many high-resolution photos may take longer to generate

## Understanding Photo Loading

### How Photos Are Retrieved

1. **Storage Location**: Photos are stored in the `pin-photos` storage bucket
2. **Signed URLs**: The system creates temporary secure URLs to access photos
3. **Download Process**: Photos are downloaded and converted to data URLs
4. **PDF Embedding**: Photos are embedded directly in the PDF (not linked)

### What This Means

- ✅ **Self-Contained**: PDFs include all photos - no internet needed to view
- ✅ **Shareable**: You can email or share PDFs with anyone
- ✅ **Permanent**: Photos are saved in the PDF even if original files are deleted
- ⏱️ **Generation Time**: More photos = longer generation time (normal)

## Troubleshooting

### No Pins Appear in Selector

**Possible Causes:**
- No inspection pins have been created yet
- Pins don't have pin numbers assigned

**Solution:**
1. Go to Site Mode → Drawings
2. Upload drawings
3. Add pins with the "Inspection" type
4. Assign pin numbers to each pin

### "No Inspected Members" Message

**This means:**
- No pins with `pin_type = 'inspection'` exist
- Or no pins have pin numbers

**Solution:**
1. Check your pins in Site Mode
2. Ensure they're marked as "Inspection" type
3. Assign pin numbers (e.g., PIN-001, PIN-002)

### Photos Not Showing in PDF

**Possible Causes:**
1. Photos failed to upload
2. Storage permissions issue
3. Network error during report generation

**Solution:**
1. Check the pin in Site Mode - verify photos display there
2. Try generating the report again
3. Check browser console for error messages
4. Contact support if issue persists

### "Error generating photo report"

**Common Causes:**
- Network connectivity issue
- Database query timeout (too many pins)
- Storage access problem

**Solutions:**
1. Check your internet connection
2. Try selecting fewer pins at once
3. Refresh the page and try again
4. Check browser console for specific error details

### Report Takes Long Time to Generate

**Expected Behavior:**
- 1-5 pins with photos: 5-10 seconds
- 10-20 pins with photos: 15-30 seconds
- 20+ pins with photos: 30-60 seconds

**Why It Takes Time:**
- Each photo must be downloaded from storage
- Photos are converted to data URLs
- PDF is built page by page
- Multiple photos per pin multiply the time

**If Unusually Slow:**
1. Check internet connection speed
2. Try with fewer pins first
3. Close other browser tabs
4. Clear browser cache

### PDF Fails to Download

**Solutions:**
1. Check browser's download settings
2. Ensure popup blocker isn't blocking the download
3. Check if your downloads folder is full
4. Try a different browser

## Advanced Features

### Photo Organization

**Sort Order:**
- Photos appear in the order determined by `sort_order` field
- Then by creation date (oldest first)
- Consistent ordering across multiple report generations

### Photo Captions

**Best Practices:**
- Keep captions concise (1-2 sentences)
- Describe what the photo shows
- Include relevant details (location, issue, measurement)

**Examples:**
- "North face showing intumescent coating application"
- "DFT reading of 425µm at grid line B3"
- "Surface preparation - blast cleaned to SA 2.5"

### Filtering and Selection Strategies

**By Status:**
- Select only "Pass" pins for compliance reports
- Select only "Repair Required" for deficiency lists

**By Photos:**
- Generate reports only for pins with photos attached
- Look for photo count > 0 in the interface

**By Area:**
- Use pin labels to identify location
- Select all pins from a specific block or level

## Integration with Other Reports

### Complete Audit Report

The Photo Report complements the main Audit Inspection Report:

- **Audit Report**: Overall compliance, executive summary, inspection data tables
- **Photo Report**: Detailed visual evidence for each inspection point

**Recommended Workflow:**
1. Generate the base Audit Inspection Report
2. Generate the Photo Report with selected pins
3. Include both in your final deliverable package

### Merged Pack

The Photo Report can be manually added to merged packs:

1. Generate Photo Report separately
2. Generate Merged Pack with appendices
3. Manually merge PDFs if needed (using external tools)

## Data Privacy and Security

### Photo Storage
- Photos are stored in Supabase Storage
- Only authenticated users can access
- RLS (Row Level Security) policies protect access
- Each project's photos are isolated

### Report Sharing
- PDFs can be safely shared - photos are embedded
- No authentication needed to view downloaded PDFs
- Consider your organization's document sharing policies

### Photo Retention
- Photos remain in storage unless explicitly deleted
- Reports are generated on-demand (not stored)
- You can regenerate reports anytime

## Best Practices

### For Inspectors

1. **Take Photos During Inspection**
   - Upload photos immediately after taking them
   - Add captions while details are fresh
   - Include context photos (wide shots) and detail photos (close-ups)

2. **Organize as You Go**
   - Create pins before site visit
   - Upload photos to correct pins
   - Update status after each inspection

3. **Quality Over Quantity**
   - Take clear, well-lit photos
   - Avoid blurry or dark images
   - 2-4 photos per pin is usually sufficient

### For Project Managers

1. **Regular Reporting**
   - Generate weekly photo reports for progress tracking
   - Include in client communications
   - Archive reports for project records

2. **Selective Reporting**
   - Create focused reports for specific issues
   - Separate compliant vs non-compliant reports
   - Custom reports for different stakeholders

3. **Quality Control**
   - Review photo reports before sending to clients
   - Ensure captions are professional
   - Check that all photos are relevant

### For Documentation

1. **Comprehensive Records**
   - Generate final report with all pins
   - Include in project closeout package
   - Store in document management system

2. **Version Control**
   - Date in filename helps track versions
   - Generate new reports after remedial work
   - Keep historical reports for comparison

## Technical Details

### System Requirements

**Browser Compatibility:**
- Chrome 90+ (Recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**File Size Limits:**
- Individual photo: 5MB max
- Total report size: Depends on photo count and quality
- Typical: 2-10 MB for 10-20 pins with 2-3 photos each

### Performance Optimization

**The system automatically:**
- Loads photos asynchronously
- Shows progress indicator
- Handles pagination efficiently
- Manages memory for large reports

**Photo Processing:**
- Signed URLs valid for 1 hour
- Photos converted to JPEG for PDF embedding
- Automatic compression for reasonable file sizes

## Support and Feedback

### Getting Help

If you encounter issues:
1. Check this guide for troubleshooting steps
2. Review the browser console for error messages
3. Contact your system administrator
4. Provide specific details: which pins, how many photos, error messages

### Feature Requests

The Photo Report feature is continuously improving. Future enhancements may include:
- Custom photo layouts
- Photo annotations/markup
- Batch photo upload
- Photo comparison (before/after)
- Custom report templates

## Example Workflow

### Complete Inspection Process

**Week 1: Setup**
1. Create project and add loading schedule
2. Upload drawings in Site Mode
3. Create inspection pins on drawings
4. Assign pin numbers and link to members

**Week 2-4: Field Inspections**
1. Visit site with tablet/phone
2. Use Site Mode to view pins
3. Take photos of each inspection point
4. Upload photos with captions immediately
5. Update pin status (Pass/Fail)

**Week 5: Reporting**
1. Go to Exports tab
2. Select all pins for comprehensive report
3. Generate "Inspection Report with Photos"
4. Review PDF for completeness
5. Generate "Audit Inspection Report" for compliance data
6. Combine both reports for client deliverable

**Week 6: Follow-up**
1. For failed items, generate focused photo report
2. Share with contractor for remedial work
3. After repairs, inspect again and upload new photos
4. Generate updated report showing compliance

## Summary

The Inspection Report with Photos feature provides:

✅ **Professional Documentation**: High-quality PDF reports with embedded photos

✅ **Easy to Use**: Simple selection interface, one-click generation

✅ **Comprehensive**: Includes all pin details, member information, and photos

✅ **Flexible**: Select specific pins or generate complete reports

✅ **Shareable**: Self-contained PDFs that include all photos

✅ **Reliable**: Automatic pagination, error handling, consistent formatting

**Key Takeaway**: This feature transforms your site photos into professional inspection documentation that can be shared with clients, contractors, and regulatory authorities.

## Quick Reference

### Generate Photo Report - Steps

1. Navigate to project → **Exports** tab
2. Scroll to **"Inspection Report with Photos"** section
3. **Select pins** you want to include
4. Click **"Generate Report with X Members"**
5. Wait for **"Generating report with photos..."** to complete
6. PDF downloads automatically

### Photo Count Indicator

Each pin shows photo count - helps you:
- Identify which pins have visual documentation
- Decide which pins to include in reports
- Track inspection completeness

### File Naming

```
Inspection_Report_Photos_<ProjectName>_<YYYYMMDD>.pdf
```

Always includes project name and date for easy organization.

---

**Need Help?** Check the troubleshooting section or contact support with specific error messages.
