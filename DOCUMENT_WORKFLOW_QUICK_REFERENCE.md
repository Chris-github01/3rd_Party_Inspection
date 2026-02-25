# Document Workflow System - Quick Reference Guide

## For Project Managers (Admin/Inspector)

### Setting Up Project Structure

**1. Create Blocks**
```
Site Manager Tab → Add Block button
- Enter block name (e.g., "Tower A", "East Wing")
- Add description (optional)
- Blocks represent building sections
```

**2. Add Levels to Blocks**
```
Site Manager Tab → Expand block → Add Level button
- Enter level name (e.g., "Ground Floor", "Level 3")
- Add description (optional)
- Set order_index for sorting
- Levels represent floors within blocks
```

**3. Upload Drawings**
```
Site Manager Tab → Upload icon next to level
- Select PDF or image file (PNG, JPG)
- Drawings appear under the level
- Multi-page PDFs create multiple drawings
```

### Managing Pins

**Place Inspection Pin**
```
1. Click on drawing to open viewer
2. Click "Add Pin" button (crosshair cursor)
3. Click exact location on drawing
4. Fill pin details:
   - Pin number (auto-generated)
   - Steel type (Beam, Column, Plate, etc.)
   - Link to member (optional)
   - Status (Not Started, In Progress, Pass, Repair Required)
5. Save pin
```

**Export Drawing with Pins**
```
1. Open drawing in viewer
2. Click "Export PDF" button in toolbar
3. File downloads with all pins overlaid
4. Pin labels are large (24pt) and clearly visible
5. Use for field reference or client deliverables
```

---

## For Field Inspectors (Site Manager Role)

### What You Can Do

✅ **View project structure** - See all blocks, levels, and drawings
✅ **Place inspection pins** - Drop pins on drawings at inspection locations
✅ **Upload photos** - Attach photos to pins from camera or device
✅ **Update pin status** - Change status as inspection progresses
✅ **Create inspections** - Link inspections to pin locations
✅ **View and download** - Access all project data

### What You Cannot Do

❌ **Create/delete blocks** - Structure managed by project managers
❌ **Create/delete levels** - Structure managed by project managers
❌ **Upload/delete drawings** - Documents managed by project managers
❌ **Delete other users' pins** - Can only modify your own pins

### Your Workflow

**Field Inspector Mode Interface**
```
Site Manager Tab shows:
- "Field Inspector Mode" message
- Tree view of blocks/levels/drawings (read-only)
- Click drawing to open viewer
- No "Add Block" or "Upload Drawing" buttons
```

**Placing Pins On-Site**
```
1. Navigate to correct drawing
2. Click drawing to open full viewer
3. Click "Add Pin" for crosshair cursor
4. Tap/click inspection location
5. Quick form appears:
   - Pin number: Auto-filled (e.g., "1001-1")
   - Steel type: Select from dropdown
   - Member: Link if known
   - Status: Choose "Not Started" initially
6. Save pin

Pin appears immediately on drawing with blue color (Not Started)
```

**Adding Photos**
```
1. Click on pin you just created
2. Pin detail modal opens
3. Click camera icon or "Upload Photo"
4. Options:
   - Take photo (mobile devices)
   - Choose from gallery/files
5. Add caption (optional)
6. Photo attaches to pin automatically
```

**Updating Status**
```
1. Click pin on drawing
2. Pin detail modal opens
3. Click status button:
   - Blue: Not Started
   - Orange: In Progress
   - Green: Pass
   - Red: Repair Required
4. Status updates immediately
5. Pin color changes on drawing
```

---

## Pin Number System

### Format
```
[Project Number]-[Sequential Number]

Examples:
- 1001-1  (First pin in project 1001)
- 1001-2  (Second pin in project 1001)
- 1001-25 (Twenty-fifth pin in project 1001)
```

### Auto-Generation
- Pin numbers assigned automatically
- Sequential within project
- Cannot be manually changed (ensures uniqueness)
- Used for tracking and reporting

---

## Steel Type Options

Available selections for pins:

| Code | Description | Common Use |
|------|-------------|------------|
| Beam | Universal Beam | Horizontal structural members |
| Column | Universal Column | Vertical structural members |
| Plate | Steel Plate | Flat structural elements |
| Angle | Angle Section | L-shaped profiles |
| Channel | Channel Section | U-shaped profiles |
| Tube | Hollow Section | Rectangular/square tubes |
| CHS | Circular Hollow Section | Round tubes |
| RHS | Rectangular Hollow Section | Rectangular tubes |
| SHS | Square Hollow Section | Square tubes |
| Other | Other Steel Type | Miscellaneous |

---

## Pin Status Colors

### Visual Reference

🔵 **Blue - Not Started**
- Initial status when pin created
- Inspection not yet begun
- Waiting for inspector assignment

🟠 **Orange - In Progress**
- Inspection currently underway
- Measurements being taken
- Photos being uploaded

🟢 **Green - Pass**
- Inspection complete
- Meets all requirements
- No remedial work needed

🔴 **Red - Repair Required**
- Inspection complete
- Does not meet requirements
- Remedial work needed
- NCR may be raised

### Status Workflow
```
Not Started → In Progress → Pass ✅
                ↓
         Repair Required → [Re-inspect after repair]
```

---

## Keyboard Shortcuts (Drawing Viewer)

| Action | Shortcut |
|--------|----------|
| Zoom In | `+` or `=` |
| Zoom Out | `-` |
| Reset Zoom | `0` or `Ctrl+0` |
| Next Page | `→` or `Page Down` |
| Previous Page | `←` or `Page Up` |
| Close Viewer | `Esc` |
| Add Pin Mode | `P` |

---

## Mobile Usage Tips

### Touch Gestures
- **Single tap** - Select pin or place new pin
- **Double tap** - Zoom in on location
- **Pinch** - Zoom in/out
- **Drag** - Pan around drawing
- **Long press** - Open pin detail (if pin exists)

### Best Practices
- Use landscape orientation for better visibility
- Enable location services for GPS tagging (if supported)
- Upload photos immediately (don't wait)
- Update status as you work (real-time sync)
- Check for good network connection before starting

### Offline Mode (Future)
- Drawings cached for offline viewing
- Pins queued when offline
- Auto-sync when connection restored
- Status indicator shows online/offline

---

## Troubleshooting

### Cannot Place Pin
**Problem:** Clicking drawing does nothing
**Solutions:**
- Click "Add Pin" button first (crosshair cursor must appear)
- Ensure drawing fully loaded (wait for rendering)
- Try refreshing page
- Check if you're logged in

### Pin Not Appearing After Save
**Problem:** Pin saved but not visible on drawing
**Solutions:**
- Refresh the drawing viewer
- Check pin was saved (look in database/list view)
- Verify coordinates are within drawing bounds (0-1 range)
- Check browser console for errors

### Cannot Upload Photo
**Problem:** Photo upload fails or hangs
**Solutions:**
- Check file size (max 10MB recommended)
- Verify image format (JPG, PNG supported)
- Check network connection
- Try smaller image or compress
- Check storage quota

### Permission Denied Error
**Problem:** "Permission denied" when trying to create block/level/drawing
**Expected:** Field inspectors cannot create structure
**Solutions:**
- Contact project manager to create structure
- Verify your role is correct (user_profiles table)
- Focus on pin placement (your primary function)

### Pin Labels Not Visible in Export
**Problem:** Exported PDF has pins but labels are missing or tiny
**Solutions:**
- Ensure using latest version (labels now 16pt)
- Clear browser cache
- Re-export the drawing
- Check PDF viewer zoom settings (should be 100%)

---

## Data Limits and Guidelines

### File Sizes
- **Drawings**: Max 50MB per file (PDF or image)
- **Photos**: Max 10MB per photo (compress if larger)
- **Projects**: Unlimited drawings and pins

### Recommended Limits
- **Pins per drawing**: 50-100 (more is possible but may appear crowded)
- **Photos per pin**: 5-10 (more is possible but slows loading)
- **Drawing resolution**: 150-300 DPI for best balance

### Performance Tips
- Use compressed PDFs when possible
- Resize photos before upload (1920x1080 sufficient)
- Close drawings when not in use (free up memory)
- Clear browser cache periodically

---

## Export Formats

### Available Exports

**Single Drawing PDF**
```
Site Manager → Open drawing → Export PDF button
- Includes drawing image
- All pins overlaid with large labels (24pt)
- Color-coded by status
- Footer with project/block/level/page info
```

**Complete Report** (from Exports tab)
```
Multiple format options:
- PDF: Full inspection report with drawings
- Excel: Data tables with pin details
- Word: Formatted document with photos
- Markup Drawings: All drawings in single PDF
```

### Export Settings
- Pin size: 24pt radius (2x previous size)
- Font size: 16pt bold (2x previous size)
- Border: 3pt white outline
- Colors: Status-based (Green/Red/Orange/Blue)

---

## Best Practices

### For Project Setup
1. Create logical block structure (match actual building)
2. Name levels clearly (Ground Floor, Level 1, Roof)
3. Upload drawings in order (sequential numbering)
4. Use consistent naming conventions
5. Test pin placement before field work starts

### For Field Inspections
1. Review drawing before arriving on site
2. Create pins as you inspect (don't wait)
3. Upload photos immediately (network permitting)
4. Update status in real-time (don't batch)
5. Add notes/captions to photos for clarity
6. Link pins to members when known

### For Quality Control
1. Review all pins before exporting
2. Check pin positions are accurate
3. Verify status colors are correct
4. Ensure all required photos attached
5. Export and review PDF before distribution

---

## Support Contacts

**Technical Issues**
- Check browser console for error messages
- Note exact steps to reproduce issue
- Include screenshots if possible
- Contact system administrator

**Training Requests**
- Request on-site training for field teams
- Schedule remote training sessions
- Access video tutorials (if available)
- Review this quick reference guide

**Feature Requests**
- Submit through project management
- Describe use case and benefit
- Provide examples if possible
- Check roadmap for planned features

---

## Quick Tips

💡 **Double-click a block** to expand and view levels
💡 **Pin numbers are auto-generated** - no need to think about numbering
💡 **Colors update instantly** when you change status
💡 **Photos sync automatically** - no manual save needed
💡 **Export early and often** - keep client deliverables current
💡 **Use steel type dropdown** - ensures consistency
💡 **Link to members** when available for better traceability
💡 **Status reflects reality** - update as work progresses, not all at end

---

## Glossary

**Block** - A section or part of a building (e.g., Tower A, West Wing)
**Level** - A floor within a block (e.g., Ground Floor, Level 3)
**Drawing** - An architectural or structural plan (PDF or image)
**Pin** - An inspection marker placed on a drawing at specific location
**Pin Number** - Unique identifier for each pin (e.g., 1001-1)
**Steel Type** - Category of structural steel (Beam, Column, Plate, etc.)
**Status** - Current state of inspection (Not Started, In Progress, Pass, Repair Required)
**Member** - A specific structural element from the loading schedule
**Inspection** - A formal inspection record linked to a pin
**Export** - Generate PDF or other format with pins included
**RLS** - Row Level Security (database access control)
**Site Manager** - User role for field inspectors (limited permissions)

---

**Version:** 1.0
**Last Updated:** 2026-02-25
**For Questions:** Contact your project administrator
