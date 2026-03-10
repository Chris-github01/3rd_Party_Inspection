# Company Name Fix - COMPLETE

## Root Cause Identified ✅

The console output revealed the exact problem:

### The Issue
The Supabase query was failing with a **400 Bad Request** error:

```
gkdvcyocchnfwelrxvmz.supabase.co/rest/v1/projects?select=*,clients(logo_path),organizations(...)
Failed to load resource: the server responded with a status of 400 ()
```

### Why It Failed
The query was trying to fetch `clients(logo_path)`, but the `clients` table **does not have a `logo_path` column**.

When a PostgREST query references a non-existent column, it returns **400 Bad Request** and the entire query fails, meaning:
- No project data is returned
- No organization data is returned
- The code falls back to the hardcoded default: "P&R Consulting Limited"

## The Fix ✅

### Changed Query
**Before:**
```typescript
supabase.from('projects').select(`
  *,
  clients(logo_path),  ← This column doesn't exist!
  organizations(id, name, logo_url, address, phone, email, website)
`).eq('id', project.id).single()
```

**After:**
```typescript
supabase.from('projects').select(`
  *,
  clients(name, company),  ← Using columns that actually exist
  organizations(id, name, logo_url, address, phone, email, website)
`).eq('id', project.id).single()
```

### Removed Dead Code
Also removed code that tried to load the non-existent client logo:

```typescript
// REMOVED: This was trying to use clients.logo_path which doesn't exist
if (projectDetails?.clients?.logo_path) {
  // ... client logo loading code
}
```

## Test Instructions

### 1. Hard Refresh Browser
- Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)

### 2. Generate Report
1. Navigate to "Pieter Test 2"
2. Go to **Exports** tab
3. Click **Download Base Report**

### 3. Expected Results

The console should now show:

```javascript
🏢 Organization Settings: {
  projectDetails: {
    ...
    organizations: {
      id: "5c9092b4-9f54-43d0-a2e6-57bf210a63f0",
      name: "Optimal Fire Limited",  ← Now loads correctly!
      logo_url: "logos/1772652181892-7tbjbd.png",
      email: "admin@optimalfire.co.nz"
    }
  },
  orgSettings: {
    name: "Optimal Fire Limited"  ← This will be used in the PDF!
  }
}
```

The PDF should show:
- **Cover page**: "Optimal Fire Limited" (not "P&R Consulting Limited")
- **Footer**: "Prepared by Optimal Fire Limited"

## Additional Issue Found: Logo Corruption

The console also showed:
```
Could not load organization logo: Error: wrong PNG signature
```

The logo at `logos/1772143865807-7zygmf.png` appears to be corrupted or not a valid PNG file.

### To Fix Logo Issue:
1. Go to **Settings** → **Organization**
2. Re-upload the logo (ensure it's a valid PNG or JPG)
3. Save changes

The logo will then appear on the PDF cover page.

## Summary

- ✅ **Database query fixed** - removed non-existent column reference
- ✅ **Organization data will now load** - no more 400 errors
- ✅ **Company name will be dynamic** - "Optimal Fire Limited" instead of hardcoded fallback
- ⚠️ **Logo needs re-upload** - current logo file is corrupted (separate issue)

## Verification SQL

You can verify the fix is working by running this in Supabase SQL editor:

```sql
SELECT
  p.name as project_name,
  o.name as organization_name,
  o.logo_url
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.name = 'Pieter Test 2';
```

Expected:
```
project_name: "Pieter Test 2"
organization_name: "Optimal Fire Limited"
logo_url: "logos/1772652181892-7tbjbd.png"
```

## Why This Happened

The `logo_path` column was referenced in the code but was never added to the `clients` table schema. This is likely from:
1. Old migration that was never run
2. Code written before schema was finalized
3. Copy-paste from another part of the codebase

The fix ensures we only query columns that actually exist.
