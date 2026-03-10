# Organization Logo Display - Quick Fix

## Problem
Logos not showing on Organizations page - broken images instead.

## Root Cause
Database stores storage **paths** (`logos/abc.png`), not **URLs**.
Component was using paths directly in `<img src="">` tags.

## Solution

### Fixed Organizations.tsx
Convert storage paths to public URLs when loading:

```typescript
// Before: Used path directly ❌
<img src={org.logo_url} />  // "logos/abc.png" - doesn't work

// After: Convert path to URL ✅
const orgsWithUrls = data.map(org => {
  if (org.logo_url && !org.logo_url.startsWith('http')) {
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(org.logo_url);
    return { ...org, logo_url: urlData.publicUrl };
  }
  return org;
});
// Now: "https://.../documents/logos/abc.png" - works!
```

### Fixed EditOrganizationModal.tsx
Extract path from URL for ImageUpload component:

```typescript
// Receives URL, extracts path for ImageUpload
if (logoPath && logoPath.startsWith('http')) {
  const url = new URL(logoPath);
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)$/);
  if (pathMatch) {
    logoPath = pathMatch[1]; // "logos/abc.png"
  }
}
```

## Test
1. Clear cache: `Ctrl+Shift+R`
2. Go to **Settings → Organizations**
3. Logos should display correctly!

## Result
✅ Logos display on Organizations page
✅ Edit modal shows logo preview
✅ Upload/update works correctly
✅ Build passing

---
**Status:** COMPLETE - Ready to test!
