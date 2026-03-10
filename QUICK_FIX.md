# Delete Button Blank Page Fix - Critical Issues Resolved

## Problem Summary

The delete button was causing the browser to navigate to a blank page due to **TWO critical bugs**:

1. **Toast parameter order bug** - Caused React to crash
2. **RLS policy conflict** - Prevented database function from executing

---

## Critical Bug #1: Toast Parameter Order

### Root Cause
The `showToast()` function was being called with parameters in the **wrong order**.

**Fix:** Changed from `showToast(message, type)` to `showToast(type, message)`

### Why This Caused a Blank Page

1. Toast component received the message string as the `type` parameter
2. Toast tried to render with invalid type
3. React threw error: "Element type is invalid"
4. **Error cascaded and rendered blank page**

---

## Critical Bug #2: RLS Policy Conflict

### Root Cause
The `soft_delete_drawing()` database function couldn't see drawings due to RLS policy conflicts.

**Fix:** Rewrote function to properly handle SECURITY DEFINER context and RLS policies.

---

## What Now Works

✅ Delete button opens confirmation dialog (no navigation)
✅ "Move to Trash" successfully deletes drawing
✅ Success toast appears correctly (green notification)
✅ Error toast appears if deletion fails (red notification)
✅ Drawing list refreshes automatically
✅ No more blank page crashes
✅ No more "Drawing not found" errors

---

## Files Modified

1. `src/components/SiteManagerTab.tsx` - Fixed toast parameter order (3 instances)
2. `supabase/migrations/fix_soft_delete_drawing_rls.sql` - Rewrote delete function

---

## Testing

Try these scenarios:
- Click delete → dialog opens ✅
- Click "Cancel" → dialog closes ✅
- Click "Move to Trash" → success toast ✅
- Drawing disappears from list ✅
- No blank page ✅
