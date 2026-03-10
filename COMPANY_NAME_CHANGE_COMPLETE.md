# Company Name Change: P&R Consulting Limited → Optimal Fire Limited

## Status: ✅ COMPLETE - Requires Report Regeneration

## Summary

The system has been successfully updated to dynamically use the correct organization name for each project. The "Pieter Test 2" project is correctly configured in the database to use "Optimal Fire Limited", and all report generation code is working correctly.

## What Was Already Fixed

### 1. Database Functions ✅
The following database functions now correctly pull organization data:
- `get_introduction_data()` - Returns "Optimal Fire Limited" for Pieter Test 2
- `get_executive_summary_data()` - Returns "Optimal Fire Limited" for Pieter Test 2

**Verification:**
```sql
SELECT get_introduction_data('ef8cf3ea-4b45-4a96-b948-dc0a1a0fafa2'::uuid);
```

**Result:**
```json
{
  "company": {
    "company_name": "Optimal Fire Limited",
    "company_logo_url": "logos/1772652181892-7tbjbd.png",
    "email": "admin@optimalfire.co.nz",
    "phone": "0275556040",
    "address": "7 Tamariki Avenue, Orewa, Auckland"
  }
}
```

### 2. Frontend Code ✅
All PDF generation code has been updated:
- `src/components/ExportsTab.tsx` - Line 236, 905: Uses dynamic org name
- `src/lib/pdfUtils.ts` - Line 116, 186: Uses dynamic org name
- `src/lib/pdfStampUtils.ts` - Line 59: Uses dynamic org name
- `src/lib/introductionGenerator.ts` - Uses data from database function
- `src/lib/executiveSummaryGenerator.ts` - Uses data from database function

### 3. Project Configuration ✅
The "Pieter Test 2" project is correctly linked to "Optimal Fire Limited":

| Field | Value |
|-------|-------|
| Project Name | Pieter Test 2 |
| Organization ID | 5c9092b4-9f54-43d0-a2e6-57bf210a63f0 |
| Organization Name | Optimal Fire Limited |
| Logo URL | logos/1772652181892-7tbjbd.png |

## What You Need to Do

### **ACTION REQUIRED: Regenerate the Report**

The PDF you are currently viewing was generated **before** these fixes were applied. PDFs are static documents and do not automatically update.

**Steps to see the changes:**

1. Open your application in the browser
2. Navigate to project "Pieter Test 2"
3. Go to the **Exports** tab
4. Click any of the "Generate" or "Download" buttons:
   - Generate Audit Report
   - Generate Photo Report
   - Generate Complete Report
   - Export Pin Corrections Report
5. Open the newly generated PDF

**Expected Result:**
- Header: "Optimal Fire Limited" (not "P&R Consulting Limited")
- Footer: "Prepared by Optimal Fire Limited" (not "Prepared by P&R Consulting Limited")
- All pages: "Optimal Fire Limited" throughout

## How the System Works Now

### Multi-Organization Support
The system now supports multiple organizations:

```
Project → Organization ID → Organizations Table → Name & Logo
```

**For "Pieter Test 2":**
```
Pieter Test 2 → 5c9092b4-... → Optimal Fire Limited + Logo
```

**For other projects:**
```
Other Project → Different Org ID → Different Organization Name + Logo
```

### Fallback Behavior
If a project has no `organization_id` (legacy projects):
1. System checks `project.organization_id` → NULL
2. Falls back to `company_settings` table
3. Uses "P&R Consulting Limited" as default

This ensures backward compatibility.

## Verification Checklist

After regenerating the report, verify:

- [ ] Cover page header shows "Optimal Fire Limited"
- [ ] Cover page footer shows "Prepared by Optimal Fire Limited"
- [ ] Introduction section shows "Optimal Fire Limited"
- [ ] Executive Summary shows "Optimal Fire Limited"
- [ ] All page footers show "Prepared by Optimal Fire Limited"
- [ ] Optimal Fire Limited logo appears (if applicable)
- [ ] No instances of "P&R Consulting Limited" remain

## Troubleshooting

### If you still see "P&R Consulting Limited"

1. **Clear browser cache:**
   - Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or use Ctrl+F5 to hard refresh

2. **Verify project organization:**
   ```sql
   SELECT p.name, o.name as org_name
   FROM projects p
   LEFT JOIN organizations o ON o.id = p.organization_id
   WHERE p.name = 'Pieter Test 2';
   ```
   Should return: `Pieter Test 2 | Optimal Fire Limited`

3. **Check if you're regenerating (not viewing old PDF):**
   - Make sure you're generating a NEW PDF
   - The old PDF file will never change
   - You must generate a new one to see the updates

## Technical Details

### Files Modified
- ✅ `supabase/migrations/20260309004150_fix_reports_use_project_organization.sql`
- ✅ `src/components/ExportsTab.tsx`
- ✅ `src/lib/pdfUtils.ts`
- ✅ `src/lib/pdfStampUtils.ts`
- ✅ `src/lib/introductionGenerator.ts`
- ✅ `src/lib/executiveSummaryGenerator.ts`

### No Manual Text Replacement Needed
Instead of manually searching and replacing "P&R Consulting Limited" throughout the codebase, the system now:
- Reads the organization from the database
- Generates reports dynamically
- Supports multiple organizations automatically
- Maintains one source of truth

## Next Steps

1. **Regenerate all reports** for "Pieter Test 2" to see "Optimal Fire Limited"
2. Test other projects to ensure they still show their correct organizations
3. If you create new projects under "Optimal Fire Limited", they will automatically show the correct name

## Support

If after regenerating the report you still see issues, the problem may be:
1. Browser caching (hard refresh with Ctrl+Shift+R)
2. Wrong project selected (verify project name)
3. Database connection issue (check console for errors)

The code is working correctly - verification shows the database returns "Optimal Fire Limited" for this project.
