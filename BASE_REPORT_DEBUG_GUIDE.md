# Base Report Export - Debug & Test Guide

## Issue Description
The "Download Base Report" button shows "Generating..." but the report never downloads.

## Debugging Steps Implemented

### 1. Enhanced Error Logging
Added comprehensive console logging at every step:
- ✅ Report generation start
- ✅ Introduction data fetch
- ✅ Executive summary data fetch
- ✅ Database queries (members, inspections, NCRs, etc.)
- ✅ PDF document creation
- ✅ Page footer addition
- ✅ File save operation
- ✅ Error handling with stack traces

### 2. Error Detection Points
The system now checks for errors at:
- Database query failures (members, inspections, NCRs, project details)
- RPC function failures (introduction, executive summary)
- PDF generation failures
- File save failures

## Testing Instructions

### Step 1: Open Browser Console
1. Navigate to the project's Exports tab
2. Open browser DevTools (F12 or Right-click → Inspect)
3. Go to the Console tab
4. Clear any existing logs

### Step 2: Click "Download Base Report"
Watch the console for log messages in this sequence:

#### Expected Success Flow:
```
🔄 Starting base report generation for project: <project-id>
📊 Calling generateAuditReport...
📝 Starting audit report generation...
🔍 Fetching introduction and executive summary data...
📊 Introduction data: Retrieved (or Failed/Null)
📊 Executive summary data: Retrieved (or Failed/Null)
🗄️ Fetching database records...
✅ Database records fetched successfully
🏢 Organization Settings: {...}
📊 Report Data Summary:
  - Members: X
  - Inspections: Y
  - NCRs: Z
  ...
📄 Adding footers to all pages...
📄 Total pages: X, Footer: <company-name>
✅ PDF document generation complete, returning document object
✅ Report generated successfully, saving file...
✅ File saved: PRC_InspectionReport_<ProjectName>_<Date>.pdf
🏁 Report generation complete, resetting state
```

#### Common Failure Scenarios:

**Scenario 1: RPC Function Failure**
```
⚠️ Error generating introduction: <error>
Introduction error details: <message> <stack>
```
**Fix**: Check if `get_introduction_data` RPC function exists in database

**Scenario 2: Database Query Failure**
```
❌ Error fetching members: <error>
Failed to fetch members: <message>
```
**Fix**: Check database permissions and RLS policies

**Scenario 3: Missing Data**
```
📊 Introduction data: Failed/Null
📊 Executive summary data: Failed/Null
```
**Fix**: The report will still generate but without these sections (gracefully degraded)

**Scenario 4: PDF Save Failure**
```
✅ Report generated successfully, saving file...
❌ Error generating report: <error>
```
**Fix**: Check browser permissions, pop-up blockers

### Step 3: Verify Download
If successful, you should:
1. See the file download in your browser's download bar
2. File name: `PRC_InspectionReport_<ProjectName>_<YYYYMMDD>.pdf`
3. File should open and contain:
   - Cover page
   - Section 1: Introduction
   - Section 2: Executive Summary
   - Section 3: Standards
   - Section 4: DFT Summary Table
   - Section 5: NCRs (if any)
   - Section 6: Detailed Inspection Records

## Common Issues & Solutions

### Issue 1: Button Stays in "Generating..." State
**Symptoms**: Button disabled, shows "Generating..." indefinitely
**Diagnosis**: Check console for error messages
**Solution**:
- Look for the last log message before it stopped
- Check the specific error in the console
- Verify database connectivity
- Check RPC functions exist

### Issue 2: "Failed to fetch" Errors
**Symptoms**: Console shows network errors
**Diagnosis**: Database connection or RLS policy issue
**Solution**:
- Verify Supabase connection in `.env` file
- Check RLS policies allow authenticated users to read data
- Verify user is logged in

### Issue 3: Empty or Incomplete PDF
**Symptoms**: PDF downloads but is blank or missing sections
**Diagnosis**: Check data availability logs
**Solution**:
- Verify project has members/inspections/data
- Check executive summary and introduction RPC functions
- Review data summary logs for zero counts

### Issue 4: "project_export_attachments does not exist"
**Symptoms**: Warning in console about missing table
**Diagnosis**: Table was removed or not yet created
**Solution**:
- This is non-fatal, attachments will be empty
- System gracefully handles missing table

## Database Requirements

### Required Tables:
- ✅ `projects` - with organization relationship
- ✅ `members` - project members
- ✅ `inspections` - with environmental readings
- ✅ `ncrs` - non-conformance reports
- ✅ `inspection_readings` - quantity readings
- ✅ `organizations` - company settings with logo

### Required RPC Functions:
- `get_introduction_data(p_project_id)` - Returns introduction section data
- `get_executive_summary_data(p_project_id)` - Returns executive summary data

### Optional Tables:
- `project_export_attachments` - for merged pack feature
- `company_settings` - fallback for organization settings

## Error Codes Reference

| Error Message | Cause | Fix |
|--------------|-------|-----|
| "Failed to fetch members" | Database query failed | Check RLS policies |
| "Failed to fetch inspections" | Database query failed | Check RLS policies |
| "Failed to fetch project details" | Database query failed | Verify project ID |
| "relation does not exist" | Missing table | Check database schema |
| "function does not exist" | Missing RPC | Create RPC function |
| "Unknown error" | Unexpected failure | Check full error stack |

## Next Steps After Testing

1. **If report generates successfully**: Verify all sections contain expected data
2. **If report fails**: Share console log output for specific diagnosis
3. **If partially works**: Check which sections are missing and review specific logs

## Support Information

When reporting issues, please provide:
1. Full console log output (copy all logs)
2. Browser and version
3. Project ID being tested
4. Any error messages or stack traces
5. Screenshot of console if possible
