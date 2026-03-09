# Testing Guide for Report Export Fixes

**Purpose:** Verify all 4 runtime bugs have been fixed
**Time Required:** ~10-15 minutes
**Prerequisites:** Access to running application with Supabase database

---

## Test 1: Organization Selection & Logo

### Step 1: Create Project with Optimal Fire
1. Navigate to Projects page
2. Click "Create New Project"
3. Fill in project details:
   - Name: "Test Organization Selection"
   - Client: "Test Client"
   - **Organization:** Select "Optimal Fire" from dropdown
4. Click "Create Project"

### Step 2: Verify Database
Open Supabase SQL Editor and run:
```sql
SELECT id, name, organization_id
FROM projects
WHERE name = 'Test Organization Selection'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:** `organization_id` column has UUID value (not NULL)

### Step 3: Generate Report
1. Open the project
2. Go to "Exports" tab
3. Click "Download Base Report"
4. Wait for PDF to generate

### Step 4: Verify Report
Open the generated PDF:
- ✅ Cover page header shows **"Optimal Fire Limited"** (NOT "P&R Consulting Limited")
- ✅ Logo appears in top-left of cover page
- ✅ Logo matches Optimal Fire branding

### Step 5: Test P&R Consulting
1. Create another project
2. Name: "Test P&R Organization"
3. **Organization:** Select "P&R Consulting"
4. Download Base Report
5. Verify:
   - ✅ Header shows "P&R Consulting Limited"
   - ✅ P&R Consulting logo appears

**✅ PASS CRITERIA:**
- Selected organization appears in report header
- Correct logo displays for each organization
- No "P&R Consulting" when Optimal Fire selected

---

## Test 2: Member Quantity Workflow

### Step 1: Add Member with Quantity
1. Open any project
2. Go to "Members" tab
3. Click "Add Member" or import from CSV
4. Create member:
   - Member Mark: "TEST-UB250"
   - Section: "250UB37"
   - FRR: 60 minutes
   - Required DFT: 450 μm
   - **Quantity:** 8
5. Save member

### Step 2: Verify Database
```sql
SELECT member_mark, quantity
FROM members
WHERE member_mark = 'TEST-UB250';
```

**Expected:** `quantity = 8`

### Step 3: Generate Quantity Readings
1. Select the member (checkbox)
2. Click "Generate Quantity Readings" button
3. Wait for success message: "Successfully generated readings for 1 member(s) with a total of 8 individual test readings"

### Step 4: Verify Readings in Database
```sql
SELECT
  m.member_mark,
  COUNT(ir.id) as reading_count
FROM members m
LEFT JOIN inspection_readings ir ON ir.member_id = m.id
WHERE m.member_mark = 'TEST-UB250'
GROUP BY m.member_mark;
```

**Expected:** `reading_count = 8`

### Step 5: Check Reading Details
```sql
SELECT generated_id, dft_average, status
FROM inspection_readings ir
JOIN members m ON m.id = ir.member_id
WHERE m.member_mark = 'TEST-UB250'
ORDER BY sequence_number;
```

**Expected:** 8 rows with IDs like:
- TEST-UB250-001
- TEST-UB250-002
- ...
- TEST-UB250-008

### Step 6: Generate Report
1. Go to "Exports" tab
2. Click "Download Base Report"
3. Open PDF

### Step 7: Verify Report Sections

**Section 4: DFT Summary by Member**
- Find row for "TEST-UB250"
- ✅ "Readings" column shows **8** (NOT 1)
- ✅ Average, Min, Max calculated from all 8 readings
- ✅ Status shows PASS or FAIL based on actual data

**New Section: Quantity-Based Inspection Readings**
- ✅ Section exists in report (after Testing Data section, before NCRs)
- ✅ Shows "Member: TEST-UB250"
- ✅ Shows "Total Readings: 8"
- ✅ Table lists all 8 readings with:
  - ID (TEST-UB250-001 through TEST-UB250-008)
  - Reading 1, Reading 2, Reading 3
  - Average
  - Status (PASS/FAIL with color coding)

**✅ PASS CRITERIA:**
- DFT summary shows correct reading count (8)
- Detailed section shows all 8 individual readings
- Statistics match (avg, min, max)
- IDs are sequential and correctly formatted

---

## Test 3: Page Overflow Protection

### Step 1: Create Project with Many Members
1. Import CSV with 20+ members
2. Add inspections for multiple members
3. Create NCRs if possible

### Step 2: Generate Long Report
1. Go to "Exports" tab
2. Download Base Report
3. Open PDF

### Step 3: Verify Page Breaks
Scroll through entire PDF checking:
- ✅ No text runs off bottom of page
- ✅ No text overlaps header/footer areas
- ✅ Section headers not orphaned (always have content below on same page)
- ✅ Tables split cleanly (no rows cut in half)
- ✅ Consistent bottom margin (~1cm) on all pages
- ✅ Page numbers sequential and correct

### Step 4: Check Critical Sections
**Section 1: Introduction**
- ✅ Long paragraphs wrap properly
- ✅ No text overflow

**Section 2: Executive Summary**
- ✅ Multi-paragraph content breaks cleanly

**Section 4: DFT Summary Table**
- ✅ Table spans multiple pages if needed
- ✅ Header row repeats on each page
- ✅ No rows split mid-way

**Section 5: Testing Data**
- ✅ Large data tables paginate correctly

**Section 6: Quantity Readings**
- ✅ Multiple members split across pages correctly

**✅ PASS CRITERIA:**
- No content overflows page edges
- All sections readable
- Professional layout throughout
- No orphaned headers

---

## Test 4: Logo Loading Fallback

### Purpose: Verify multi-bucket logo loading

### Step 1: Check Logo Storage
```sql
SELECT id, name, logo_url FROM organizations;
```

Note the logo_url format for each organization.

### Step 2: Test Different Logo Formats

**Format 1: Full URL (https://example.com/logo.png)**
1. Update organization to use full URL
2. Generate report
3. ✅ Verify logo loads

**Format 2: Storage Path (logos/optimal-fire.png)**
1. Ensure logo in 'organization-logos' bucket
2. Generate report
3. ✅ Verify logo loads

**Format 3: Storage Path in Different Bucket**
1. Move logo to 'project-documents' bucket
2. Generate report
3. ✅ Verify logo still loads (fallback works)

**Format 4: Missing Logo**
1. Set logo_url to non-existent file
2. Generate report
3. ✅ Verify report still generates (logo silently omitted)
4. ✅ Check console for warning message

**✅ PASS CRITERIA:**
- Logo loads from full URLs
- Logo loads from multiple storage buckets
- Fallback mechanism tries all buckets
- Missing logo doesn't crash report generation

---

## Test 5: Backwards Compatibility

### Step 1: Test Projects Without Organization
1. Manually create project without organization_id:
```sql
INSERT INTO projects (name, client_name, organization_id)
VALUES ('Legacy Project', 'Test Client', NULL);
```

2. Generate report for this project
3. ✅ Verify report uses company_settings as fallback
4. ✅ Verify report shows default company name

### Step 2: Test Members Without Quantity Readings
1. Create member without generating quantity readings
2. Add manual inspection data instead
3. Generate report
4. ✅ Verify inspection data appears in report
5. ✅ Verify no errors about missing quantity data

### Step 3: Test Old Inspection Data
1. Use project with existing inspection_member_sets data
2. Generate report
3. ✅ Verify old "Testing Data - Datasets" section still appears
4. ✅ Verify simulated member sets still display

**✅ PASS CRITERIA:**
- Projects without organizations still work
- Members without quantity readings still work
- Old inspection data formats still supported
- No breaking changes observed

---

## Quick Smoke Test (2 minutes)

If short on time, run this abbreviated test:

1. **Create project** with Optimal Fire
2. **Add member** with quantity = 5
3. **Generate quantity readings**
4. **Download report**
5. **Verify:**
   - ✅ "Optimal Fire Limited" in header
   - ✅ Logo visible
   - ✅ DFT summary shows "Readings: 5"
   - ✅ Quantity readings section shows 5 rows
   - ✅ No page overflow

---

## Troubleshooting

### Issue: Organization Not Showing
**Debug:**
```sql
SELECT p.name, p.organization_id, o.name as org_name
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.name = 'Your Project Name';
```

If `organization_id` is NULL, organization wasn't saved during project creation.

### Issue: Logo Not Loading
**Debug:**
1. Open browser DevTools console
2. Generate report
3. Look for: `"Could not load organization logo"`
4. Check logo_url in database
5. Verify logo exists in storage bucket

### Issue: Quantity Readings Not Showing
**Debug:**
```sql
SELECT COUNT(*) FROM inspection_readings
WHERE project_id = 'your-project-id';
```

If count = 0, readings weren't generated. Re-run "Generate Quantity Readings".

### Issue: Page Overflow
**Debug:**
1. Check PDF on different viewer (Adobe, Chrome, Firefox)
2. Some viewers have rendering issues
3. If consistent across viewers, report issue with:
   - Project ID
   - Number of members
   - Number of readings

---

## Reporting Test Results

### If All Tests Pass ✅
Application is ready for production use with report export fixes.

### If Tests Fail ❌
Report the following:
1. Which test failed (Test 1-5)
2. Exact step where failure occurred
3. Expected vs actual result
4. Screenshots of issue
5. Browser console errors (F12 → Console)
6. Database query results

---

## Expected Test Duration

| Test | Time Required |
|------|---------------|
| Test 1: Organization & Logo | 3 minutes |
| Test 2: Member Quantity | 4 minutes |
| Test 3: Page Overflow | 3 minutes |
| Test 4: Logo Fallback | 2 minutes |
| Test 5: Backwards Compatibility | 3 minutes |
| **Total** | **~15 minutes** |

---

## Success Criteria Summary

**All 4 Issues Must Be Resolved:**

1. ✅ **Organization Selection**
   - Selected organization appears in report
   - No fallback to default when org selected

2. ✅ **Logo Rendering**
   - Organization logo displays correctly
   - Multi-bucket fallback works

3. ✅ **Member Quantity**
   - Quantity readings appear in DFT summary
   - Detailed section shows all readings
   - Count matches user input

4. ✅ **Page Overflow**
   - No content runs off pages
   - Clean page breaks throughout
   - Professional layout maintained

**If all 4 criteria met:** ✅ **TESTING COMPLETE - FIXES VERIFIED**

---

**Document Version:** 1.0
**Last Updated:** 2026-03-09
**Test Environment:** Production-ready build
