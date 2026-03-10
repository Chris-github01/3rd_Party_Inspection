# Hidden Export Cards - Summary

## Items Hidden

The following 3 export report cards have been hidden from the Exports tab while remaining in the codebase:

### 1. Full Audit Pack (Merged PDF) ✅
- **Location:** ExportsTab.tsx, line ~1302
- **Method:** Added `hidden` CSS class to outer div
- **Icon:** Layers (yellow/accent)
- **Description:** Complete audit package combining generated report with attachments

### 2. Inspection Report with Photos ✅
- **Location:** ExportsTab.tsx, line ~1434
- **Method:** Added `hidden` CSS class to outer div
- **Icon:** Camera (green)
- **Description:** Basic photo report with selected pins

### 3. Enhanced Photo Report with Pin Details ✅
- **Location:** ExportsTab.tsx, line ~1463
- **Method:** Added `hidden` CSS class to outer div
- **Icon:** Camera (blue) with "NEW" badge
- **Description:** Comprehensive report with larger thumbnails and complete metadata

## Hiding Method

**Approach Used:** CSS `hidden` class
- Items remain in the DOM
- No functionality removed
- Completely invisible to users
- Zero layout space consumed
- Easily reversible

## What Remains Visible

The following export options are still visible to users:
- ✅ Audit Inspection Report (base report)
- ✅ Inspection Report with Photos (RECOMMENDED - emerald/teal gradient)

## Reversal Instructions

To unhide any of these items, simply remove the `hidden` class from the corresponding div:

```typescript
// Hidden (current):
<div className="bg-white rounded-lg border border-slate-200 p-6 hidden">

// Visible (to restore):
<div className="bg-white rounded-lg border border-slate-200 p-6">
```

## Technical Details

- **File Modified:** `/src/components/ExportsTab.tsx`
- **Build Status:** ✅ Successful (no errors)
- **Method:** Tailwind CSS `hidden` utility class
- **Reversible:** Yes - remove `hidden` class
- **Impact:** UI only - no functional changes

## Benefits of This Approach

1. **Non-Destructive** - Code remains intact
2. **Reversible** - Simply remove `hidden` class
3. **Maintainable** - Clear what's hidden
4. **No Side Effects** - Functionality preserved
5. **Clean UI** - Items completely invisible

---

**Date:** March 10, 2026
**Status:** ✅ COMPLETE
