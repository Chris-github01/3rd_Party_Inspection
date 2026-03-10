# Company Name Change Diagnostic Guide

## Status: Debugging Required

I've added diagnostic logging to identify why "P&R Consulting Limited" still appears in your reports.

## Steps to Diagnose

### 1. Refresh Your Browser
First, clear the browser cache and reload:
- Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
- This ensures you're running the latest compiled code

### 2. Open Browser Console
- Press **F12** to open Developer Tools
- Click the **Console** tab

### 3. Generate a Report
1. Navigate to project "Pieter Test 2"
2. Go to the **Exports** tab
3. Click any "Download" or "Generate" button
4. Watch the console for debug output

### 4. Check Console Output

You should see a log message like this:

```
🏢 Organization Settings: {
  projectDetails: {...},
  organizations: {...},
  orgSettings: {...},
  fallback: {...}
}
```

**Please send me a screenshot or copy of this console output.**

## What to Look For

### ✅ Good Output (Working):
```javascript
orgSettings: {
  id: "5c9092b4-9f54-43d0-a2e6-57bf210a63f0",
  name: "Optimal Fire Limited",
  logo_url: "logos/1772652181892-7tbjbd.png",
  email: "admin@optimalfire.co.nz",
  phone: "0275556040"
}
```

### ❌ Bad Output (Problem):
```javascript
orgSettings: null
// or
orgSettings: {
  company_name: "P&R Consulting Limited"
}
// or
organizations: null
```

## Possible Issues

### Issue 1: organizations is NULL
**Symptom:** `projectDetails.organizations` is null or undefined

**Cause:** The project doesn't have an `organization_id` set

**Fix:**
```sql
UPDATE projects
SET organization_id = '5c9092b4-9f54-43d0-a2e6-57bf210a63f0'
WHERE name = 'Pieter Test 2';
```

### Issue 2: RLS Policy Blocking Data
**Symptom:** Query succeeds but `organizations` field is empty

**Cause:** Row Level Security policy preventing read access

**Check:**
```sql
SELECT p.*, o.*
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.name = 'Pieter Test 2';
```

### Issue 3: Wrong Field Names
**Symptom:** Organization data exists but has wrong field structure

**Cause:** Database schema mismatch

**Verify Schema:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organizations';
```

## Database Verification

Run these queries to verify the data is correct:

```sql
-- Check project has organization_id
SELECT
  p.id,
  p.name as project_name,
  p.organization_id,
  o.name as org_name
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.name = 'Pieter Test 2';
```

Expected result:
```
project_name: "Pieter Test 2"
organization_id: "5c9092b4-9f54-43d0-a2e6-57bf210a63f0"
org_name: "Optimal Fire Limited"
```

## Next Steps

Once you provide the console output, I can:
1. Identify the exact issue
2. Provide the specific fix
3. Explain why it's happening

## Quick Test

You can also test the database function directly in SQL:

```sql
SELECT get_introduction_data('ef8cf3ea-4b45-4a96-b948-dc0a1a0fafa2'::uuid);
```

This should return:
```json
{
  "company": {
    "company_name": "Optimal Fire Limited",
    "company_logo_url": "logos/1772652181892-7tbjbd.png",
    ...
  }
}
```

If this works but the PDF still shows "P&R Consulting Limited", then the issue is in how the frontend processes this data.
