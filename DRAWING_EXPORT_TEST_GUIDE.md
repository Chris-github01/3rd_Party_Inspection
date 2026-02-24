# Drawing Export - Quick Test Guide

**Purpose:** Verify the drawing export fix is working correctly

---

## Quick Test (2 minutes)

### Test Drawing Export

1. **Navigate to Project**
   - Go to Projects page
   - Click on any project with drawings

2. **Open Exports Tab**
   - Click "Exports" tab
   - Find "Complete Inspection Report" section

3. **Generate Report**
   - Click "Generate Complete Report"
   - Wait for PDF to generate (10-15 seconds)

4. **Open PDF and Check**
   - PDF opens automatically
   - Scroll to "Site Drawings with Pin Locations" section
   - **VERIFY:** You see the actual drawing image (not "preview not available")
   - **VERIFY:** Pins appear as colored circles on the drawing
   - **VERIFY:** Pin labels show member marks (not "N/A")

---

## Console Verification

Open browser developer console (F12) and look for these logs:

### ✅ Success Indicators:
```
[getDrawingImageData] Loading drawing d0da569a-..., page 1
[getDrawingImageData] ✅ PDF rendered successfully: 1920x1440
[addMarkupDrawingsSection] Found 4 pins for this drawing
[addMarkupDrawingsSection] ✅ Drawing image loaded successfully
```

### ❌ Error Indicators:
```
[getDrawingImageData] ❌ Error downloading PDF: ...
[addMarkupDrawingsSection] ❌ No image data returned
```

---

## What Fixed

### The Bug:
Pins were filtered by `page_number` instead of `drawing_id`, causing:
- Pins appearing on wrong drawings
- Pins not appearing at all
- Data mismatches

### The Fix:
```typescript
// Changed from:
pins.filter(p => p.page_number === drawing.page_number)

// To:
pins.filter(p => p.drawing_id === drawing.id)
```

---

## If Test Fails

### Check Console for:
1. **Storage errors:** File not found, permission denied
2. **Render errors:** PDF.js failures, canvas issues
3. **Data errors:** No drawings, no pins

### Report:
- Exact error message from console
- Which project/drawing failed
- Screenshot of error in PDF

---

## Expected Behavior

### With Preview (Fast):
- Export takes 2-3 seconds
- Uses stored PNG images
- Console shows: "Preview loaded successfully"

### Without Preview (Slower):
- Export takes 10-15 seconds
- Renders PDF pages on-the-fly
- Console shows: "PDF rendered successfully"

### Both Should Work! ✅

---

## Database Check (Optional)

To verify pins are correctly associated:

```sql
SELECT
  d.id as drawing_id,
  l.name as level_name,
  COUNT(dp.id) as pin_count
FROM drawings d
LEFT JOIN drawing_pins dp ON dp.drawing_id = d.id
LEFT JOIN levels l ON l.id = d.level_id
WHERE d.project_id = 'YOUR_PROJECT_ID'
GROUP BY d.id, l.name;
```

Pin counts in PDF should match database counts.

---

**Status:** Ready to Test
**Expected Result:** Drawings appear in PDF reports with pins correctly positioned
