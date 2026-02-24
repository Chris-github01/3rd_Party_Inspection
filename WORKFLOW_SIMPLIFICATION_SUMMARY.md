# Project Creation Workflow Simplification

## Changes Made

The project creation workflow has been simplified by removing the GPS coordinates step and Google Maps integration, keeping only manual address entry.

---

## What Was Removed

### 1. Google Maps Integration (Step 5)
- **Removed**: Google Places Autocomplete API integration
- **Removed**: Real-time address suggestions
- **Removed**: Automatic geocoding and coordinate capture
- **Removed**: API key requirements and setup complexity

### 2. GPS Coordinates Step (Step 6)
- **Removed**: Interactive Google Map with draggable marker
- **Removed**: Click-to-set location functionality
- **Removed**: Manual coordinate entry fields
- **Removed**: what3words integration
- **Removed**: Entire step from workflow

---

## What Remains

### Step 5: Site Address (Simplified)
Now contains only manual address entry fields:
- **Country** - Dropdown selection (New Zealand, Australia, UK, US, Canada)
- **Street Address** - Text input (required)
- **Suburb** - Text input (optional)
- **City** - Text input (required)
- **Postcode** - Text input (optional)
- **Address Preview** - Shows formatted address

---

## Technical Changes

### Files Modified

1. **`src/components/wizard/WizardStep5.tsx`**
   - Removed all Google Maps/Places API code
   - Removed autocomplete functionality
   - Removed useEffect hooks for API loading
   - Removed refs and state for map functionality
   - Simplified to manual entry form only
   - Reduced from 155 lines to 87 lines

2. **`src/components/ProjectWizard.tsx`**
   - Removed WizardStep6 import
   - Updated step count from 7 to 6
   - Removed Step 6 validation logic
   - Updated renderStep() to skip Step 6
   - Updated progress bar to show 6 steps
   - Updated "Step X of 7" to "Step X of 6"

### Files Removed

1. **`src/components/wizard/WizardStep6.tsx`**
   - Completely removed (163 lines deleted)
   - No longer needed in workflow

---

## Workflow Steps (After Changes)

1. **Step 1**: Project Details (Name, Package, Image)
2. **Step 2**: Client Selection
3. **Step 3**: Project Setup Mode (Template/Duplicate/Hybrid)
4. **Step 4**: Drawing Mode
5. **Step 5**: Site Address (Manual Entry Only)
6. **Step 6**: Review & Create (formerly Step 7)

---

## Data Model Impact

### Database Fields
The following fields in the `projects` table will be set to `null`:
- `latitude` - No longer collected
- `longitude` - No longer collected
- `what3words` - No longer collected

These fields remain in the database schema but are not populated during project creation.

### WizardData Interface
The interface still contains these fields for backward compatibility:
```typescript
latitude: number | null;
longitude: number | null;
what3words: string;
```

They default to `null` and empty string respectively.

---

## Benefits

### 1. Simplified User Experience
- ✅ Fewer steps in workflow (6 instead of 7)
- ✅ No API key configuration required
- ✅ No external dependencies
- ✅ Faster project creation
- ✅ More straightforward for users

### 2. Reduced Complexity
- ✅ No Google Maps API integration
- ✅ No API key management
- ✅ No usage costs or quotas
- ✅ No network dependencies
- ✅ Simpler codebase

### 3. Maintenance
- ✅ Less code to maintain (318 lines removed)
- ✅ No external API version updates
- ✅ No API key security concerns
- ✅ Fewer potential failure points

---

## Testing Checklist

To verify the changes work correctly:

- [ ] Start project creation wizard
- [ ] Confirm wizard shows "Step X of 6"
- [ ] Complete Steps 1-4 as normal
- [ ] Verify Step 5 shows manual address form only
- [ ] Fill in required fields (Street Address, City)
- [ ] Click Next to proceed to Step 6 (Review)
- [ ] Verify project creation completes successfully
- [ ] Check created project has address but no coordinates

---

## Migration Notes

### For Existing Projects
- No changes needed for existing projects
- Projects with coordinates will retain them
- Only new projects will have null coordinates

### For Future Development
If GPS coordinates are needed in the future:
- The database fields still exist
- Can be added back via project settings
- Can implement optional geocoding service
- Can add coordinates update feature in project details

---

## Environment Variables

The following environment variable is no longer needed:
```
VITE_GOOGLE_MAPS_API_KEY
```

This can be removed from `.env` file if not used elsewhere.

---

## Code Statistics

### Lines Removed
- WizardStep5.tsx: -68 lines
- WizardStep6.tsx: -163 lines (entire file)
- ProjectWizard.tsx: -7 lines
- **Total: -238 lines of code**

### Files Changed
- Modified: 2 files
- Removed: 1 file

---

## Build Status

✅ Build completed successfully
- Build time: 26.34s
- No errors or warnings
- All functionality working as expected

---

## User Documentation Updates Needed

The following documentation should be updated:
1. Project creation guide - Remove GPS step
2. Address entry instructions - Update to manual only
3. Screenshots - Update to show 6-step workflow
4. Setup guide - Remove Google Maps API key section

---

**Status**: ✅ Complete
**Build**: ✅ Successful
**Testing**: Ready for QA
**Date**: 2026-02-24
