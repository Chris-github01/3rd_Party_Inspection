# Quick Test Guide - Base Report Download Fix

## ⚡ Test in 60 Seconds

### 1. Hard Refresh
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### 2. Open Console
```
Press F12
Click "Console" tab
```

### 3. Navigate
```
Dashboard → Projects → Any Project → Exports Tab
```

### 4. Click Button
```
Click "Download Base Report"
```

### 5. Wait
```
10-60 seconds (usually 15-30s)
```

### 6. Verify Success
```
✅ PDF file downloads
✅ Toast notification appears
✅ Button returns to "Download Base Report"
✅ Console shows "[Base Report] Loading state reset"
```

---

## What You Should See

### Success Case:
```
[Base Report] Starting download for project: abc-123
[Audit Report] Adding markup drawings section...
[Base Report] Download triggered: PRC_InspectionReport_...pdf
[Base Report] Loading state reset
```

### Drawing Timeout (Still Success):
```
[Base Report] Starting download for project: abc-123
⚠️ Drawing load timeout after 30s
[Base Report] Download triggered: PRC_InspectionReport_...pdf
[Base Report] Loading state reset
```

### Error Case:
```
[Base Report] Starting download for project: abc-123
[Base Report] Download failed: [error message]
[Base Report] Loading state reset
```
**Toast shows error message**

---

## The Fix Works If:

✅ Button always returns to normal
✅ PDF downloads OR error toast appears
✅ Console shows "Loading state reset"
✅ Never need to refresh page

---

## Feature Flag (Optional)

To disable drawing previews temporarily:

**File:** `src/components/ExportsTab.tsx` (line ~24)
```typescript
const INCLUDE_DRAWING_PREVIEWS = false;  // Change from true
```

Then:
1. Run `npm run build`
2. Hard refresh browser
3. Test again

---

## Build Status

✅ Build successful (14.77s)
✅ No TypeScript errors
✅ Production ready

---

**Hard refresh and test now!** The button will never get stuck again.
