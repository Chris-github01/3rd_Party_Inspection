# Loading Schedule Import - Testing Guide

## What Was Fixed

### Issues Identified:
1. **Edge function error**: "Failed to parse schedule: Edge Function returned a non-2xx status code"
2. **Import error**: "Failed to load imports: TypeError: Failed to fetch"

### Root Causes:
1. **401 Unauthorized error** - Edge function had JWT verification enabled but wasn't properly handling user authentication
2. **Incorrect relationship query** in edge function (using `document:documents(*)` syntax that doesn't work in Deno)
3. **Missing storage policies** for the `parsing-artifacts` bucket
4. **Insufficient error logging** to diagnose issues

### Fixes Applied:

#### 1. Edge Function (`parse-loading-schedule`)
- ✅ **Fixed authentication** - Disabled JWT verification and added manual auth checks inside function
- ✅ Validates user authentication using the Authorization header
- ✅ Uses service role client for database operations (bypasses RLS)
- ✅ Uses user client to verify the requesting user is authenticated
- ✅ Changed to fetch import and document records separately (no joins)
- ✅ Added comprehensive console logging at every step
- ✅ Improved error handling with detailed error messages
- ✅ Added explicit version to supabase-js import (`@2.57.4`)
- ✅ Better error context in responses (includes error stack)

#### 2. Database
- ✅ Added storage policies for `parsing-artifacts` bucket
- ✅ Policies allow service role (edge functions) to manage artifacts
- ✅ Policies allow authenticated users to read/upload artifacts

#### 3. Frontend (`LoadingScheduleTab.tsx`)
- ✅ Enhanced error logging with full error details
- ✅ Better error messages shown to users
- ✅ Proper handling of failed imports (don't auto-select)
- ✅ Log parse results for successful operations

## How to Test

### Step 1: Check Edge Function Logs

The edge function now logs every step. You'll see:
```
Parse loading schedule function invoked
Auth header present: true
User authenticated: abc-123-def...
Request body: { importId: "..." }
Fetching import record: ...
Import record found: {...}
Document found: {...}
Downloading file from storage: ...
File downloaded, size: ...
Parsing CSV file
CSV lines: ...
CSV headers: ["member_mark", "section", ...]
Extracted items: ...
Uploading artifact to storage
Inserting items into database
Final status: completed
Parse complete
```

### Step 2: Use the Sample CSV

Use the provided `sample_loading_schedule.csv`:
```csv
member_mark,section,frr,dft,coating,element_type,schedule_ref
B10,610UB125,60,850,Nullifire SC601,beam,LS-001
C5,310UC137,90,1200,Nullifire SC601,column,LS-002
B11,410UB54,60,750,Nullifire SC601,beam,LS-003
C6,310UC137,90,1200,Nullifire SC601,column,LS-004
BR1,150x150x10RHS,60,650,Nullifire SC601,brace,LS-005
B12,530UB82,60,800,Nullifire SC601,beam,LS-006
```

### Step 3: Upload Process

1. **Navigate** to any project
2. **Click** the "Loading Schedule" tab
3. **Click** "Upload Loading Schedule" button
4. **Select** the `sample_loading_schedule.csv` file
5. **Wait** for the upload and parsing to complete (shows "Uploading..." then processes)

### Step 4: Verify Results

**Expected Results:**
- ✅ Status changes to "Completed" or "Needs Review"
- ✅ Shows 6 items extracted
- ✅ All items have high confidence (90%+)
- ✅ Each item shows:
  - Member mark (B10, C5, B11, C6, BR1, B12)
  - Section size (normalized, e.g., "610UB125")
  - FRR (60 or 90 minutes)
  - DFT (650-1200 microns)
  - Coating (Nullifire SC601)
  - Element type (beam, column, brace)

### Step 5: Check Browser Console

Open browser console (F12) and check for:
- ✅ No red errors
- ✅ Successful parse logs
- ✅ "Successfully parsed X items" message

### Step 6: Sync to Member Register

1. **Click** "Approve & Create Member Register"
2. **Verify** that members are created in the "Member Register" tab
3. **Check** that each member has:
   - Member mark
   - Section size
   - FRR format
   - Coating product
   - Required DFT

## Troubleshooting

### If You Still Get Errors:

1. **Check Browser Console** (F12):
   - Look for detailed error messages
   - Check the "Parse response" log entry
   - Copy any error stack traces

2. **Check Supabase Edge Function Logs**:
   - Go to Supabase Dashboard
   - Navigate to Edge Functions → parse-loading-schedule
   - Check the logs for detailed execution trace

3. **Verify Storage Bucket**:
   - Go to Supabase Dashboard → Storage
   - Check that `parsing-artifacts` bucket exists
   - Verify policies are applied

4. **Check Database Tables**:
   - Verify `loading_schedule_imports` table exists
   - Verify `loading_schedule_items` table exists
   - Check RLS policies are enabled

### Common Issues:

**"401 Unauthorized" or "Edge Function returned a non-2xx status code"**
- This was the main issue - now fixed!
- Edge function now handles authentication manually
- Make sure you're logged in to the application
- Check that the Authorization header is being sent with the request

**"Failed to fetch document"**
- Document record might not exist
- Check that the file uploaded successfully to storage

**"Failed to download file"**
- Storage path might be incorrect
- Check storage bucket permissions

**"DOWNLOAD_ERROR"**
- File might not exist in storage
- Check the storage path in the documents table

**"TypeError: Failed to fetch"**
- Edge function might not be deployed
- Check network tab for the actual error response
- Verify CORS headers are present

## What to Look For in Logs

### Successful Parse (Console):
```
Invoking parse-loading-schedule with importId: abc-123...
Parse response: {
  data: {
    success: true,
    importId: "abc-123...",
    status: "completed",
    itemsExtracted: 6,
    needsReview: false
  },
  error: null
}
Successfully parsed 6 items
```

### Failed Parse (Console):
```
Parse error: { message: "...", context: {...} }
Failed to parse schedule: [detailed error message]
```

Look for the specific error in the console - it will tell you exactly what went wrong.

## Edge Function Version

The edge function is now using:
- `jsr:@supabase/functions-js/edge-runtime.d.ts`
- `npm:@supabase/supabase-js@2.57.4`
- Deno's built-in `Deno.serve` (not imported)

## Storage Policies

The following policies are now active on `parsing-artifacts`:
1. Service role can manage all artifacts (for edge functions)
2. Authenticated users can read artifacts
3. Authenticated users can upload artifacts

## Next Steps After Successful Parse

1. Review the extracted items in the table
2. Edit any items that need corrections
3. Click "Approve & Create Member Register"
4. Verify members are created in Member Register tab
5. Use the members in Site Manager for drawing pins
