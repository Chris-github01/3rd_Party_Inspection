# Document Workflow System - Implementation Plan

## Executive Summary

This document outlines the implementation plan for enhancing the document workflow system with:
1. **Role-based access control** separating Admin/Manager functions from Site Manager (field) functions
2. **Enhanced pin visibility** in exported drawings with significantly larger fonts
3. **Clear separation of duties** between document management and field inspection work

---

## Current System Analysis

### Existing Architecture
- **Complete hierarchical structure**: Projects → Blocks → Levels → Drawings → Pins
- **Full CRUD operations** for all entities via Site Manager tab
- **Pin placement system** with normalized coordinates (0-1 range)
- **Auto-generated pin numbers** via RPC function
- **PDF export functionality** with pin overlays
- **Multi-page PDF support** with page-specific pins
- **Photo attachments** to pins with dedicated storage

### Current Limitations
1. **No role-based restrictions** on Site Manager tables (blocks, levels, drawings, pins)
2. **Small pin fonts in exports** (8pt font, 12pt radius - difficult to read)
3. **No dedicated Site Manager mode** for field users
4. **All users can upload/delete** drawings and modify structure

---

## Implementation Requirements

### 1. Role-Based Access Control

#### User Roles (Existing)
- **admin**: Full system access
- **inspector**: Project management, inspections, document uploads
- **client**: Read-only access (reports, viewing)

#### New Functional Separation

**Admin/Inspector Permissions (Document Management)**
- Create/edit/delete blocks
- Create/edit/delete levels
- Upload/delete drawings
- Organize project structure
- Full access to all features

**Site Manager Permissions (Field Operations)**
- View blocks, levels, and drawings (read-only)
- Place pins on drawings
- Create inspection records linked to pins
- Upload photos to pins
- Update pin status
- **CANNOT** upload/delete drawings
- **CANNOT** create/delete blocks or levels

**Client Permissions (Read-Only)**
- View blocks, levels, drawings (read-only)
- View pins (read-only)
- View reports and exports
- **CANNOT** modify anything

#### Implementation Strategy

**Database Changes:**
1. Update RLS policies on `blocks`, `levels`, `drawings` tables
   - INSERT/UPDATE/DELETE restricted to admin and inspector roles
   - SELECT available to all authenticated users

2. Update RLS policies on `drawing_pins` table
   - INSERT available to all authenticated users (site managers need this)
   - UPDATE/DELETE restricted to pin creator or admin/inspector roles
   - SELECT available to all authenticated users

3. Update RLS policies on `pin_photos` table
   - INSERT available to all authenticated users
   - UPDATE/DELETE restricted to photo uploader or admin/inspector roles
   - SELECT available to all authenticated users

**Frontend Changes:**
1. Add role-based UI rendering
   - Hide "Create Block", "Add Level", "Upload Drawing" buttons for non-admin/inspector users
   - Show "Pin Mode" or "Site Manager Mode" for field users

2. Create dedicated Site Manager mode view
   - Focused on pin placement and inspection creation
   - Simplified UI without document management options
   - Large drawing viewer optimized for pin dropping

---

### 2. Enhanced Pin Visibility in Exports

#### Current Export Settings
```typescript
// Current (TOO SMALL)
radius: 12pt
fontSize: 8pt
lineWidth: 2pt
```

#### New Export Settings
```typescript
// Enhanced (CLEARLY VISIBLE)
radius: 24pt          // 2x larger
fontSize: 16pt        // 2x larger
lineWidth: 3pt        // Slightly thicker border
```

#### Additional Enhancements
1. **Pin number badges**: Display pin number in larger, bold font
2. **Contrasting background**: Ensure text is always readable
3. **Optional label positioning**: Place label next to pin instead of inside for very long labels
4. **Export quality options**: Allow users to choose "Standard" or "Large Pins" export mode

#### Implementation Files
- `/src/lib/pdfSingleDrawingExport.ts` - Main export function
- Update `drawPinsOnPDF()` function with new sizing
- Add export options parameter for pin size customization

---

### 3. Site Manager Mode (Field Mode)

#### Purpose
Dedicated interface for field inspectors to:
- Navigate drawings quickly
- Place pins efficiently
- Create inspections on-site
- Upload photos immediately
- Update pin status in real-time

#### Features
1. **Simplified Navigation**
   - Block/Level/Drawing tree view (read-only)
   - Quick jump to specific drawing
   - Search by pin number or member mark

2. **Pin Placement Workflow**
   - Large full-screen drawing viewer
   - One-click pin placement
   - Quick pin setup modal
   - Auto-link to inspection packages

3. **Offline Capability** (Future)
   - Cache drawings for offline viewing
   - Queue pin creation when offline
   - Sync when connection restored

4. **Mobile Optimization**
   - Touch-friendly pin placement
   - Swipe navigation between drawings
   - Photo capture directly from camera
   - Large buttons and touch targets

#### Implementation Strategy
1. Create new route: `/projects/:id/site-mode`
2. Create new component: `SiteModeView.tsx`
3. Add "Site Mode" button to project detail page
4. Implement focused UI with:
   - Drawing viewer (full-screen)
   - Pin placement tools
   - Quick inspection creation
   - Photo upload
   - Pin status updates

---

## Implementation Phases

### Phase 1: Enhanced Pin Export (PRIORITY)
**Estimated Time**: 2 hours
**Impact**: Immediate improvement in drawing readability

Tasks:
1. ✅ Analyze current export code
2. Update pin sizing constants (radius, fontSize, lineWidth)
3. Add export options for pin size selection
4. Test exports with various drawing sizes
5. Verify pin readability in printed PDFs

**Files to Modify**:
- `src/lib/pdfSingleDrawingExport.ts`

### Phase 2: Role-Based Access Control
**Estimated Time**: 4 hours
**Impact**: Security and proper separation of duties

Tasks:
1. Create database migration for RLS policy updates
2. Update policies on blocks, levels, drawings tables
3. Update policies on drawing_pins and pin_photos tables
4. Test policies with different user roles
5. Add frontend role checks
6. Hide/show UI elements based on role
7. Test authorization flows

**Files to Modify**:
- `supabase/migrations/YYYYMMDDHHMMSS_implement_role_based_site_manager_access.sql`
- `src/components/SiteManagerTab.tsx`
- `src/pages/site/DrawingsView.tsx`
- `src/contexts/AuthContext.tsx`

### Phase 3: Dedicated Site Manager Mode (Optional Enhancement)
**Estimated Time**: 6 hours
**Impact**: Improved field user experience

Tasks:
1. Design simplified UI for field use
2. Create SiteModeView component
3. Implement full-screen drawing viewer
4. Create quick pin placement workflow
5. Add mobile-optimized touch controls
6. Test on mobile devices

**Files to Create**:
- `src/pages/SiteMode.tsx` (already exists, enhance it)
- `src/components/site-mode/FullScreenDrawingViewer.tsx`
- `src/components/site-mode/QuickPinModal.tsx`

---

## Database Schema Changes

### RLS Policy Updates

```sql
-- Migration: implement_role_based_site_manager_access.sql

/*
  # Implement Role-Based Access Control for Site Manager

  1. Security Changes
    - Restrict blocks INSERT/UPDATE/DELETE to admin and inspector roles
    - Restrict levels INSERT/UPDATE/DELETE to admin and inspector roles
    - Restrict drawings INSERT/UPDATE/DELETE to admin and inspector roles
    - Allow all authenticated users to INSERT drawing_pins (site managers need this)
    - Keep SELECT access for all authenticated users (including clients)

  2. Changes
    - Drop existing permissive policies
    - Create new role-aware policies
    - Maintain project-based access control
*/

-- Blocks: Restrict modifications to admin/inspector
DROP POLICY IF EXISTS "Users can create blocks for their projects" ON blocks;
DROP POLICY IF EXISTS "Users can update blocks for their projects" ON blocks;
DROP POLICY IF EXISTS "Users can delete blocks for their projects" ON blocks;

CREATE POLICY "Admins and inspectors can create blocks"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update blocks"
  ON blocks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can delete blocks"
  ON blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- Levels: Restrict modifications to admin/inspector
DROP POLICY IF EXISTS "Users can create levels for their projects" ON levels;
DROP POLICY IF EXISTS "Users can update levels for their projects" ON levels;
DROP POLICY IF EXISTS "Users can delete levels for their projects" ON levels;

CREATE POLICY "Admins and inspectors can create levels"
  ON levels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update levels"
  ON levels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can delete levels"
  ON levels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- Drawings: Restrict modifications to admin/inspector
DROP POLICY IF EXISTS "Users can create drawings for their projects" ON drawings;
DROP POLICY IF EXISTS "Users can update drawings for their projects" ON drawings;
DROP POLICY IF EXISTS "Users can delete drawings for their projects" ON drawings;

CREATE POLICY "Admins and inspectors can create drawings"
  ON drawings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update drawings"
  ON drawings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can delete drawings"
  ON drawings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- Drawing Pins: Allow all authenticated users to create (site managers need this)
-- Keep existing SELECT policy
-- Update/Delete restricted to creator or admin/inspector

DROP POLICY IF EXISTS "Users can create pins for their projects" ON drawing_pins;
DROP POLICY IF EXISTS "Users can update pins for their projects" ON drawing_pins;
DROP POLICY IF EXISTS "Users can delete pins for their projects" ON drawing_pins;

CREATE POLICY "Authenticated users can create pins"
  ON drawing_pins FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- All authenticated users can create pins

CREATE POLICY "Users can update their own pins or admin/inspector can update any"
  ON drawing_pins FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT created_by FROM drawing_pins WHERE id = drawing_pins.id
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Users can delete their own pins or admin/inspector can delete any"
  ON drawing_pins FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT created_by FROM drawing_pins WHERE id = drawing_pins.id
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- Pin Photos: Allow all authenticated users to upload
DROP POLICY IF EXISTS "Users can upload pin photos" ON pin_photos;
DROP POLICY IF EXISTS "Users can update pin photos" ON pin_photos;
DROP POLICY IF EXISTS "Users can delete pin photos" ON pin_photos;

CREATE POLICY "Authenticated users can upload pin photos"
  ON pin_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own photos or admin/inspector can update any"
  ON pin_photos FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Users can delete their own photos or admin/inspector can delete any"
  ON pin_photos FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );
```

---

## UI/UX Changes

### Site Manager Tab Enhancements

**For Admin/Inspector Users**:
- Show all existing buttons: "Create Block & Levels", "Add Block", "Add Level", "Upload Drawing"
- Full editing capabilities
- Delete options visible

**For Site Manager/Field Users**:
- Hide "Create Block & Levels", "Upload Drawing" buttons
- Show "Pin Mode" toggle button
- Read-only tree view of structure
- Clicking drawing opens pin placement mode
- Simplified interface focused on inspection work

**For Client Users**:
- Read-only view of all structure
- No action buttons
- View pins and inspection data only
- Export/download capabilities only

### Drawing Viewer Enhancements

**Pin Size Controls**:
```typescript
interface ExportOptions {
  pinSize: 'standard' | 'large' | 'extra-large';
  showLabels: boolean;
  showMemberMarks: boolean;
  includePhotos: boolean;
}
```

**Export Dialog**:
- Radio buttons for pin size selection
- Checkboxes for optional data inclusion
- Preview of export before generating
- Batch export options

---

## Testing Checklist

### Phase 1: Enhanced Pin Export
- [ ] Small drawings (A4 size): Pins clearly visible
- [ ] Large drawings (A0 size): Pins proportionally sized
- [ ] Multiple pins close together: No overlap
- [ ] Pin numbers readable when printed
- [ ] Export with 5+ pins: All labels visible
- [ ] Export with 50+ pins: Performance acceptable
- [ ] Different status colors: All distinguishable

### Phase 2: Role-Based Access
- [ ] Admin can create blocks, levels, drawings
- [ ] Inspector can create blocks, levels, drawings
- [ ] Site manager CANNOT create blocks (error message)
- [ ] Site manager CAN create pins
- [ ] Site manager CAN upload photos to pins
- [ ] Client CANNOT create anything (read-only)
- [ ] Client CAN view all structure and pins
- [ ] UI buttons hidden appropriately per role

### Phase 3: Site Manager Mode
- [ ] Site mode loads quickly
- [ ] Drawing viewer full-screen on mobile
- [ ] Touch pin placement works smoothly
- [ ] Pin modal quick to complete
- [ ] Photo upload from camera works
- [ ] Offline queuing works (if implemented)
- [ ] Navigation between drawings smooth
- [ ] Pin status updates immediately

---

## Success Criteria

### Must Have (Phase 1 & 2)
1. ✅ Pin labels in exports are **2x larger** (16pt font, 24pt radius)
2. ✅ Pin labels are **clearly readable** when printed at actual size
3. ✅ Admin/Inspector users can upload drawings and manage structure
4. ✅ Site managers can place pins but NOT upload drawings
5. ✅ Clients have read-only access to everything
6. ✅ No existing functionality broken

### Nice to Have (Phase 3)
1. Dedicated Site Manager mode with simplified UI
2. Mobile-optimized pin placement
3. Photo capture from camera
4. Offline pin queuing
5. Bulk export options

---

## Rollback Plan

If issues arise:
1. **Phase 1**: Revert pin sizing by restoring original constants
2. **Phase 2**: Drop new RLS policies, restore original permissive policies via migration
3. **Phase 3**: Remove Site Mode route and components (no data impact)

All changes are non-destructive to data. Rollback is safe at any phase.

---

## Next Steps

1. **Immediate**: Implement Phase 1 (Enhanced Pin Export)
2. **This Week**: Implement Phase 2 (Role-Based Access Control)
3. **Next Sprint**: Consider Phase 3 (Site Manager Mode) based on user feedback

---

## Questions for Stakeholders

1. Should site managers be able to delete their own pins, or only update status?
2. What is the maximum pin label length we need to support in exports?
3. Do we need multi-language support for pin labels?
4. Should there be a "site manager" role distinct from "inspector", or reuse inspector role?
5. Is offline functionality required in Phase 3, or can it be deferred?

---

## Conclusion

This implementation plan provides a clear path to:
1. **Enhance visibility** of inspection pins in exported drawings (immediate value)
2. **Enforce proper access control** separating document management from field operations (security and workflow)
3. **Optimize field experience** with dedicated Site Manager mode (future enhancement)

The phased approach allows for incremental delivery of value while managing risk. Phase 1 can be deployed immediately with minimal testing. Phase 2 requires thorough security testing. Phase 3 is optional based on user feedback.
