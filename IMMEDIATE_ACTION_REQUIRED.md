# IMMEDIATE ACTION REQUIRED

## What You Need to Do Right Now

I've added debugging to identify why the PDF still shows "P&R Consulting Limited". Follow these exact steps:

### Step 1: Hard Refresh Your Browser
1. Press **Ctrl+Shift+R** (or **Cmd+Shift+R** on Mac)
2. This clears the cache and loads the new code

### Step 2: Open Developer Console
1. Press **F12** on your keyboard
2. Click the **Console** tab

### Step 3: Generate the Report
1. Go to project "Pieter Test 2"
2. Click the **Exports** tab
3. Click the "Download Base Report" button (or any report button)

### Step 4: Check the Console
Look for this message in the console:

```
🏢 Organization Settings: { ... }
```

### Step 5: Send Me the Output
**Copy the entire console output** and paste it here, especially the part that shows:
- `projectDetails`
- `organizations`
- `orgSettings`
- `fallback`

## Why This is Needed

The code IS checking for the organization and SHOULD be using "Optimal Fire Limited", but something is preventing it from working. The console output will tell me exactly what's going wrong:

**Possible Issues:**
1. The project's `organization_id` is not being fetched
2. The organization JOIN is returning NULL
3. The field names don't match
4. An RLS policy is blocking the data
5. You're viewing an old cached PDF file

## What the Console Should Show (If Working):

```javascript
🏢 Organization Settings: {
  projectDetails: {
    id: "ef8cf3ea-4b45-4a96-b948-dc0a1a0fafa2",
    name: "Pieter Test 2",
    organization_id: "5c9092b4-9f54-43d0-a2e6-57bf210a63f0",
    organizations: {
      id: "5c9092b4-9f54-43d0-a2e6-57bf210a63f0",
      name: "Optimal Fire Limited",  ← This is what we need!
      logo_url: "logos/1772652181892-7tbjbd.png",
      email: "admin@optimalfire.co.nz"
    }
  },
  orgSettings: {
    name: "Optimal Fire Limited"  ← This should be used in the PDF!
  }
}
```

## If Console Shows NULL

If the console shows `organizations: null`, then the database query isn't returning the organization data, and I'll need to fix the query or database schema.

## Alternative: Quick Database Check

You can also run this in your Supabase SQL editor:

```sql
SELECT
  p.id,
  p.name,
  p.organization_id,
  o.name as org_name,
  o.logo_url
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.name = 'Pieter Test 2';
```

If this returns:
- `organization_id`: NULL → **The project isn't linked to an organization**
- `org_name`: NULL → **The organization doesn't exist or can't be joined**
- `org_name`: "Optimal Fire Limited" → **Database is correct, frontend issue**

## Once I Have the Console Output

I'll be able to:
1. Identify the exact issue in seconds
2. Provide the specific fix
3. Explain why it's happening
4. Ensure it works for all your projects

**Please complete these steps and send me the console output.**
