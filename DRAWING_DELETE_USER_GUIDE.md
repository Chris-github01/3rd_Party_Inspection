# Drawing Delete Feature - User Guide

## Quick Start

### How to Delete a Drawing

1. **Navigate to Site Manager** tab in your project
2. **Expand a block** to view levels
3. **Hover over a drawing** in the list
4. **Click the red trash icon** that appears
5. **Confirm deletion** in the dialog
6. Done! Drawing is moved to trash

---

## Detailed Instructions

### Step 1: Locate the Drawing

Navigate to your project's **Site Manager** tab where you'll see the site structure on the left side:

```
Site Structure
├─ Block 1
│  ├─ Ground Floor
│  │  ├─ Drawing 1 ←── Hover here
│  │  └─ Drawing 2
│  └─ Level 1
└─ Block 2
```

### Step 2: Reveal Delete Button

**Desktop:**
- Hover your mouse over the drawing name
- A red trash icon will fade in on the right side

**Mobile:**
- The trash icon is always visible
- Tap the trash icon directly

### Step 3: Confirm Deletion

A confirmation dialog will appear asking:

**"Delete Drawing?"**

The message explains:
- Drawing will be moved to trash
- Can be restored within 30 days
- All pins on the drawing are preserved

### Step 4: Choose Action

**To Delete:**
- Click "Move to Trash" button (red)
- Drawing is immediately moved to trash
- Success message appears: "Drawing moved to trash. It can be restored within 30 days."

**To Cancel:**
- Click "Cancel" button, or
- Press the Escape key, or
- Click the X button in the top-right

---

## Important Information

### What Happens When You Delete a Drawing?

✅ **Safe Actions:**
- Drawing is hidden from the main view
- All pins on the drawing are preserved
- Drawing data is kept for 30 days
- Can be restored within 30 days (future feature)

❌ **What is NOT Deleted:**
- Pins placed on the drawing
- Inspection data linked to the drawing
- Original PDF document
- Related metadata

### Recovery Period

- **30-day grace period**: Drawings remain in trash for 30 days
- **Automatic purge**: After 30 days, drawings may be permanently deleted
- **Restoration**: Contact administrator to restore within 30 days (manual process currently)

### Who Can Delete Drawings?

Only users with the following permissions:
- **Project Administrators**
- **Organization Owners**
- **Users with "Manage Structure" permission**

Field Inspectors and Read-only users **cannot** delete drawings.

---

## Keyboard Shortcuts

| Action | Keyboard Shortcut |
|--------|-------------------|
| Close dialog | **Escape** |
| Navigate dialog buttons | **Tab** |
| Confirm deletion | **Enter** (when button focused) |
| Cancel deletion | **Escape** |

---

## Common Questions

### Q: What if I delete the wrong drawing?

**A:** Contact your project administrator immediately. They can restore the drawing from the database within 30 days.

### Q: Will deleting a drawing delete my inspection data?

**A:** No! All pins and inspection data are preserved. Only the drawing visibility is affected.

### Q: Can I undo a delete?

**A:** Currently, you need to contact an administrator to restore a deleted drawing. An automated restore feature is coming soon.

### Q: What happens after 30 days?

**A:** Drawings in trash for more than 30 days may be permanently deleted. Make sure to restore any needed drawings before this period expires.

### Q: Why don't I see the delete button?

**A:** Check if:
1. You have "Manage Structure" permission
2. You're viewing the correct project
3. The drawing still exists (wasn't already deleted)
4. You're logged in with the correct account

### Q: Can I delete multiple drawings at once?

**A:** Bulk delete is planned for a future update. Currently, you can only delete one drawing at a time.

---

## Troubleshooting

### Delete Button Doesn't Appear

**On Desktop:**
- Make sure you're hovering directly over the drawing name
- Try clicking on the drawing first, then hovering again
- Refresh the page

**On Mobile:**
- The button should always be visible
- If not, try refreshing the page
- Check if you have the required permissions

### Confirmation Dialog Doesn't Open

**Solutions:**
1. Check browser console for errors (F12)
2. Refresh the page
3. Clear browser cache
4. Try a different browser

### Delete Operation Fails

**Possible Causes:**
1. **Network Error**: Check your internet connection
2. **Permission Error**: Contact your administrator
3. **Drawing Already Deleted**: Refresh the list

**What to Do:**
- The error message will explain the issue
- Try again after fixing the issue
- Contact support if problem persists

### Drawing Still Appears After Deletion

**Solutions:**
1. Refresh the page
2. Navigate away and back to Site Manager
3. Log out and log back in

---

## Best Practices

### Before Deleting

1. **Verify** you're deleting the correct drawing
2. **Check** if anyone is currently working on it
3. **Document** why you're deleting it (for audit purposes)
4. **Inform** team members if it's a shared drawing

### After Deleting

1. **Verify** the drawing was removed from the list
2. **Check** the success message appeared
3. **Document** the deletion for your records
4. **Inform** relevant stakeholders

### Accidental Deletion Prevention

- Read the confirmation message carefully
- Take your time with the confirmation dialog
- Double-check the drawing name/number
- Consider taking a screenshot before deleting

---

## Future Features

### Coming Soon

1. **Trash View**
   - See all deleted drawings
   - Restore drawings yourself
   - Permanent delete option

2. **Bulk Delete**
   - Select multiple drawings
   - Delete in one action
   - Progress indicator

3. **Undo Button**
   - Immediate undo within 10 seconds
   - One-click restore
   - No need to contact admin

4. **Activity Log**
   - View deletion history
   - See who deleted what
   - Export audit reports

---

## Support

### Need Help?

**Technical Issues:**
- Check this guide first
- Try troubleshooting steps
- Contact IT support

**Permission Issues:**
- Contact your project administrator
- Request "Manage Structure" permission
- Explain why you need delete access

**Recovery Requests:**
- Contact administrator ASAP
- Provide drawing ID or name
- Explain why it needs to be restored

---

## Summary

**Deleting a drawing is:**
- ✅ Safe (30-day recovery)
- ✅ Reversible (admin can restore)
- ✅ Non-destructive (pins preserved)
- ✅ Controlled (permission required)
- ✅ Audited (all deletions tracked)

**Remember:**
- Hover to reveal delete button
- Read confirmation carefully
- Drawing stays in trash for 30 days
- Contact admin to restore

---

*Last Updated: March 2026*
*Version: 1.0.0*
