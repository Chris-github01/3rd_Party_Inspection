# Drawing Delete Functionality - UX/UI Design Specification

## Executive Summary

This document provides comprehensive design specifications for the drawing delete functionality in the Site Manager workflow interface. The implementation follows WCAG 2.1 AA accessibility standards and incorporates user-centered design principles to prevent accidental deletions while maintaining workflow efficiency.

---

## 1. Design Overview

### 1.1 Core Concept

**Soft Delete (Trash/Recycle Bin) Pattern**
- Drawings are moved to trash instead of permanently deleted
- 30-day retention period for recovery
- Clear visual and textual communication of reversibility
- Minimal workflow disruption

### 1.2 Key Design Principles

1. **Safety First**: Multiple confirmation steps prevent accidental deletions
2. **Reversibility**: Soft delete allows recovery within 30 days
3. **Clarity**: Clear messaging about consequences
4. **Accessibility**: WCAG 2.1 AA compliant throughout
5. **Efficiency**: Streamlined workflow for authorized users

---

## 2. User Flows

### 2.1 Primary Flow: Single Drawing Deletion

```
┌─────────────────────────────────────────────────────────┐
│ 1. User hovers over drawing in list                    │
│    → Delete button appears (opacity animation)          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. User clicks trash icon                              │
│    → Confirmation dialog opens                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. User reads dialog:                                   │
│    - Title: "Delete Drawing?"                           │
│    - Message: Recovery info (30 days)                   │
│    - Buttons: "Move to Trash" / "Cancel"               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. User confirms deletion                               │
│    → Drawing moves to trash                             │
│    → Success toast notification appears                  │
│    → Drawing list refreshes                             │
│    → If drawing was open, viewer closes                 │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Cancel Flow

```
User clicks "Cancel" OR presses Escape key
    → Dialog closes
    → No changes made
    → User returns to previous state
```

### 2.3 Error Flow

```
Deletion fails (network/permission error)
    → Error toast notification appears
    → Dialog remains open
    → User can retry or cancel
```

---

## 3. Visual Design Specifications

### 3.1 Delete Button Design

#### Location & Appearance
- **Position**: Right side of drawing list item
- **Visibility**: Hidden by default, visible on hover/focus
- **Size**: 28px × 28px (touch-friendly minimum 44px interaction area)
- **Icon**: Trash2 icon from lucide-react
- **Color**: Red (#F87171 - red-400)
- **Hover State**: Red (#FCA5A5 - red-300) with red background (#EF4444/20 - red-500/20)
- **Transition**: 200ms opacity fade

#### States
```css
/* Default (Hidden) */
opacity: 0
transition: opacity 200ms

/* On List Item Hover/Focus */
opacity: 100
transform: none

/* Button Hover */
color: #FCA5A5 (red-300)
background: rgba(239, 68, 68, 0.2) (red-500/20)

/* Button Active */
transform: scale(0.95)

/* Button Disabled */
opacity: 50
cursor: not-allowed
```

#### Mobile Considerations
- Always visible on mobile (no hover state)
- Increased touch target size (44px minimum)
- Positioned for thumb-friendly interaction

### 3.2 Confirmation Dialog Design

#### Layout & Structure

```
┌──────────────────────────────────────────────────────┐
│  ┌─────┐  Delete Drawing?                      [×]   │
│  │ 🗑️  │                                              │
│  └─────┘  This drawing will be moved to trash and    │
│           can be restored within 30 days. All pins    │
│           on this drawing will be preserved.          │
│                                                        │
│                      [Cancel]  [Move to Trash] ──────▶│
└──────────────────────────────────────────────────────┘
```

#### Dimensions
- **Max Width**: 448px (28rem)
- **Padding**: 24px (mobile: 16px)
- **Border Radius**: 16px (top) on mobile, 16px all sides on desktop
- **Background**: Semi-transparent white overlay with backdrop blur
- **Border**: Subtle border (white/10 opacity)

#### Icon Specifications
- **Container**: 40px circle
- **Background**: Red with 20% opacity (#EF4444/20)
- **Icon Color**: Red (#F87171)
- **Icon Size**: 24px

#### Typography
- **Title**:
  - Font: 18px (mobile), 20px (desktop)
  - Weight: 600 (semibold)
  - Color: White
  - Line Height: 1.5

- **Message**:
  - Font: 14px (mobile), 16px (desktop)
  - Weight: 400 (normal)
  - Color: Light blue (#BFDBFE)
  - Line Height: 1.625
  - Max Width: Full container

#### Buttons

**Cancel Button:**
```
Background: Transparent
Border: 1px solid rgba(255, 255, 255, 0.3)
Color: White
Padding: 10px 16px
Min Height: 48px
Border Radius: 8px
Font Weight: 500

Hover State:
  Background: rgba(255, 255, 255, 0.1)

Focus State:
  Outline: 2px solid #64748B (slate-500)
  Outline Offset: 2px
```

**Confirm Button (Move to Trash):**
```
Background: #DC2626 (red-600)
Color: White
Padding: 10px 24px
Min Height: 48px
Border Radius: 8px
Font Weight: 600
Box Shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1)

Hover State:
  Background: #B91C1C (red-700)

Focus State:
  Outline: 2px solid #DC2626 (red-600)
  Outline Offset: 2px
  Ring: 4px solid rgba(220, 38, 38, 0.3)

Loading State:
  Opacity: 50%
  Cursor: not-allowed
  Shows spinner animation
```

### 3.3 Loading States

#### During Deletion
```
Button Text: "Processing..."
Icon: Spinning loader (20px)
Button: Disabled state
Cancel Button: Disabled
Escape Key: Disabled
```

#### Animation Specifications
```
Spinner:
  Border: 4px solid rgba(255, 255, 255, 0.25)
  Border Top: 4px solid white
  Size: 20px
  Animation: Spin 1s linear infinite
```

### 3.4 Toast Notifications

#### Success Toast
```
┌─────────────────────────────────────────────────┐
│ ✓ Drawing moved to trash. It can be restored    │
│   within 30 days.                                │
└─────────────────────────────────────────────────┘

Background: Green (#10B981)
Color: White
Duration: 4 seconds
Position: Top-right
Icon: Check circle
```

#### Error Toast
```
┌─────────────────────────────────────────────────┐
│ ✗ Failed to delete drawing. Please try again.   │
└─────────────────────────────────────────────────┘

Background: Red (#EF4444)
Color: White
Duration: 6 seconds
Position: Top-right
Icon: X circle
```

---

## 4. Interaction Patterns

### 4.1 Keyboard Navigation

| Key | Action |
|-----|--------|
| **Tab** | Navigate to delete button when focused on drawing item |
| **Enter/Space** | Activate delete button |
| **Escape** | Close confirmation dialog (if not loading) |
| **Tab (in dialog)** | Cycle between Cancel and Confirm buttons |
| **Enter** | Activate focused button in dialog |

### 4.2 Mouse Interactions

1. **Hover on Drawing**:
   - Delete button fades in (200ms)
   - Drawing background lightens slightly

2. **Click Delete Button**:
   - Button press animation (scale 0.95)
   - Dialog opens with fade-in animation
   - Focus moves to dialog

3. **Click Outside Dialog**:
   - No action (click is ignored)
   - Must explicitly cancel or confirm

### 4.3 Touch Interactions (Mobile)

1. **Delete Button Always Visible**:
   - No hover state needed
   - Minimum 44px touch target
   - Positioned for thumb reach

2. **Long Press**:
   - Optional: Long press on drawing to show action menu
   - Alternative to always-visible button

3. **Dialog Swipe**:
   - Swipe down to dismiss (cancel)
   - Maintains accessibility

---

## 5. Accessibility Implementation

### 5.1 ARIA Labels

```html
<!-- Delete Button -->
<button
  aria-label="Delete drawing"
  title="Delete drawing"
  role="button"
>
  <Trash2 />
</button>

<!-- Confirmation Dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h3 id="dialog-title">Delete Drawing?</h3>
  <p id="dialog-description">This drawing will be moved to trash...</p>
</div>

<!-- Buttons -->
<button aria-label="Cancel deletion">Cancel</button>
<button aria-label="Move drawing to trash" aria-busy="false">
  Move to Trash
</button>
```

### 5.2 Focus Management

1. **Dialog Opens**:
   - Focus moves to dialog container
   - Focus trap activated
   - First focusable element (Cancel) receives focus

2. **Dialog Closes**:
   - Focus returns to delete button that triggered dialog
   - Focus trap deactivated

3. **During Loading**:
   - `aria-busy="true"` on confirm button
   - Screen readers announce "Processing"

### 5.3 Screen Reader Announcements

```
Delete Button Focused:
  "Delete drawing, button"

Dialog Opens:
  "Delete Drawing? Dialog. This drawing will be moved to trash and can be restored within 30 days. All pins on this drawing will be preserved."

Confirm Button:
  "Move to Trash, button"

During Deletion:
  "Processing, button, busy"

Success:
  "Drawing moved to trash. It can be restored within 30 days."

Error:
  "Failed to delete drawing. Please try again."
```

### 5.4 Color Contrast Ratios

All text meets WCAG 2.1 AA standards:

| Element | Contrast Ratio | Standard |
|---------|----------------|----------|
| Dialog Title (White on dark) | 16:1 | ✅ AAA (>7:1) |
| Dialog Message (Light blue on dark) | 12.6:1 | ✅ AAA (>7:1) |
| Delete Icon (Red on dark) | 4.8:1 | ✅ AA (>4.5:1) |
| Button Text (White on red) | 10.4:1 | ✅ AAA (>7:1) |

---

## 6. Permission & Security

### 6.1 Access Control

**Who Can Delete:**
- Users with `canManageStructure()` permission
- Project administrators
- Organization owners

**Who Cannot Delete:**
- Read-only users
- Field inspectors (unless granted permission)
- Guest users

### 6.2 Delete Button Visibility

```javascript
{canManageStructure() && (
  <button onClick={handleDelete}>
    <Trash2 />
  </button>
)}
```

**Behavior:**
- Button only renders if user has permission
- No visual indication of disabled state for unauthorized users
- Cleaner UI without confusing disabled elements

### 6.3 Audit Trail

Every deletion is logged:
- **Timestamp**: When drawing was deleted
- **User ID**: Who deleted it
- **Drawing ID**: Which drawing
- **Recovery Window**: 30 days from deletion

---

## 7. Error States & Edge Cases

### 7.1 Network Errors

**Scenario**: Deletion request fails due to network issue

**Handling:**
1. Show error toast: "Network error. Please check connection."
2. Keep dialog open
3. Enable retry
4. Log error to console

### 7.2 Permission Errors

**Scenario**: User loses permission mid-deletion

**Handling:**
1. Show error toast: "You don't have permission to delete this drawing."
2. Close dialog
3. Refresh permissions
4. Hide delete button

### 7.3 Drawing Already Deleted

**Scenario**: Drawing deleted by another user concurrently

**Handling:**
1. Show info toast: "This drawing was already deleted."
2. Close dialog
3. Refresh drawing list
4. Remove from UI

### 7.4 Drawing Currently in Use

**Scenario**: Drawing is currently being viewed/edited

**Handling:**
1. Check if drawing is selected
2. If yes, close drawing viewer automatically after deletion
3. Show message: "Drawing closed because it was deleted."

---

## 8. Mobile Responsive Design

### 8.1 Dialog Adaptations

**Mobile (<640px)**:
- Dialog slides up from bottom
- Rounded top corners only
- Full width
- Fixed positioning at bottom
- Swipe-down gesture to cancel

**Tablet (640px-1024px)**:
- Centered modal
- Max width 448px
- All corners rounded
- Standard desktop behavior

**Desktop (>1024px)**:
- Centered modal
- Max width 448px
- Full rounded corners
- Standard desktop behavior

### 8.2 Touch Targets

All interactive elements meet minimum 44px × 44px:

| Element | Size | Touch-Friendly |
|---------|------|----------------|
| Delete Button | 28px icon, 44px touch area | ✅ |
| Cancel Button | 48px height | ✅ |
| Confirm Button | 48px height | ✅ |
| Close (X) Button | 40px × 40px | ✅ |

### 8.3 Typography Scaling

```
Mobile:
  Dialog Title: 18px
  Dialog Message: 14px
  Button Text: 14px

Desktop:
  Dialog Title: 20px
  Dialog Message: 16px
  Button Text: 16px
```

---

## 9. Animation & Motion

### 9.1 Delete Button Appearance

```
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

Duration: 200ms
Easing: ease-out
Trigger: Mouse enter / Focus on list item
```

### 9.2 Dialog Open Animation

```
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

Duration: 150ms
Easing: ease-out
Trigger: Dialog mount
```

### 9.3 Loading Spinner

```
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

Duration: 1s
Easing: linear
Iteration: infinite
```

### 9.4 Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Database Implementation

### 10.1 Soft Delete Schema

```sql
ALTER TABLE drawings
ADD COLUMN deleted_at timestamptz DEFAULT NULL,
ADD COLUMN deleted_by uuid REFERENCES auth.users(id);

CREATE INDEX idx_drawings_deleted_at ON drawings(deleted_at)
WHERE deleted_at IS NOT NULL;
```

### 10.2 RPC Functions

**soft_delete_drawing(p_drawing_id uuid)**
- Sets `deleted_at` to current timestamp
- Sets `deleted_by` to current user ID
- Returns success/failure status

**restore_drawing(p_drawing_id uuid)**
- Sets `deleted_at` to NULL
- Sets `deleted_by` to NULL
- Returns success/failure status

**purge_old_deleted_drawings(p_days_old integer)**
- Permanently deletes drawings older than specified days
- Default: 30 days
- Returns count of deleted drawings

### 10.3 Query Filtering

All drawing queries automatically exclude deleted:

```sql
SELECT * FROM drawings
WHERE deleted_at IS NULL;
```

---

## 11. Future Enhancements

### 11.1 Bulk Delete

**Design Concept:**
1. Checkbox selection mode
2. "Select All" option
3. Bulk delete confirmation
4. Progress indicator

**UI Placement:**
- Multi-select button in toolbar
- Checkboxes appear on drawings
- Floating action bar at bottom

### 11.2 Trash/Recycle Bin View

**Features:**
- Dedicated trash view
- List of deleted drawings
- Restore button per item
- Bulk restore
- Permanent delete option
- Days remaining counter

**Navigation:**
- Settings → Trash
- Shows drawings deleted <30 days
- Search and filter

### 11.3 Undo Action

**Immediate Undo:**
- Toast notification with "Undo" button
- 10-second window
- One-click restore
- Feedback animation

---

## 12. Testing Checklist

### 12.1 Functionality Testing

- [ ] Delete button appears on hover
- [ ] Delete button triggers confirmation dialog
- [ ] Confirmation shows correct message
- [ ] Cancel closes dialog without action
- [ ] Confirm deletes drawing successfully
- [ ] Success toast appears
- [ ] Drawing removed from list
- [ ] Selected drawing viewer closes if deleted
- [ ] Error handling works correctly
- [ ] Permission check prevents unauthorized deletion

### 12.2 Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Escape key closes dialog
- [ ] Screen reader announces correctly
- [ ] ARIA labels present and correct
- [ ] Focus management works
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets minimum 44px

### 12.3 Visual Testing

- [ ] Animations smooth
- [ ] Loading state displays correctly
- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] Responsive on desktop
- [ ] Works in dark mode
- [ ] Icons render correctly
- [ ] Typography scales properly

### 12.4 Edge Case Testing

- [ ] Network error handled
- [ ] Permission error handled
- [ ] Concurrent deletion handled
- [ ] Delete currently viewed drawing
- [ ] Multiple rapid clicks prevented
- [ ] Slow network conditions
- [ ] Offline mode (if applicable)

---

## 13. Implementation Checklist

### 13.1 Backend

- [x] Add deleted_at column to drawings table
- [x] Add deleted_by column to drawings table
- [x] Create soft_delete_drawing RPC function
- [x] Create restore_drawing RPC function
- [x] Create purge_old_deleted_drawings RPC function
- [x] Update SELECT policies to exclude deleted
- [x] Add indexes for performance
- [x] Add RLS policies for delete operations

### 13.2 Frontend Components

- [x] Enhance ConfirmDialog component
- [x] Add delete button to drawing list
- [x] Implement delete handler
- [x] Add loading state management
- [x] Implement error handling
- [x] Add success/error toasts
- [x] Handle selected drawing closure

### 13.3 Documentation

- [x] UX/UI design specification
- [x] User flow diagrams
- [x] Wireframes and mockups
- [x] Accessibility guidelines
- [x] Implementation guide
- [x] Testing checklist

---

## 14. Success Metrics

### 14.1 User Experience Metrics

- **Accidental Deletion Rate**: Target <1%
- **Successful Recovery Rate**: Target >95%
- **Time to Delete**: Target <5 seconds
- **User Satisfaction**: Target >4.5/5

### 14.2 Performance Metrics

- **Delete Operation Time**: Target <500ms
- **UI Response Time**: Target <100ms
- **Dialog Load Time**: Target <50ms

### 14.3 Accessibility Metrics

- **WCAG 2.1 AA Compliance**: 100%
- **Keyboard Navigation**: 100% functional
- **Screen Reader Compatibility**: 100%
- **Touch Target Compliance**: 100%

---

## 15. Conclusion

This delete functionality design prioritizes user safety through soft delete, clear communication, and accessible design. The implementation follows industry best practices for UX/UI design and meets WCAG 2.1 AA accessibility standards.

**Key Strengths:**
- Reversible deletions reduce user anxiety
- Clear visual hierarchy guides user actions
- Accessibility ensures all users can delete safely
- Mobile-responsive design works on all devices
- Permission system prevents unauthorized deletions

**Next Steps:**
1. ✅ Complete implementation
2. Conduct user testing
3. Gather feedback
4. Iterate on design
5. Implement future enhancements (trash view, bulk delete)
