# Parser Fix Deployment Guide

## 🚀 Quick Deploy Instructions

### What Was Fixed
- ✅ DFT column now extracts correct values (was pulling Hp/A)
- ✅ FRR Minutes column now properly detected
- ✅ Product name (Nullifire SC902) now extracted
- ✅ Member Mark (ITEM CODE) now extracted
- ✅ Comprehensive debug logging added

### Deploy to Render

1. **Navigate to project directory**:
```bash
cd /path/to/project
```

2. **Check the fixes are present**:
```bash
grep -n "member_mark = None" python-parser/parser.py
# Should show the NEW extraction logic around line 986-995

grep -n "Normalize cell text" python-parser/parser.py
# Should show normalization logic around line 911-913
```

3. **Commit and push**:
```bash
git add python-parser/parser.py
git commit -m "Fix parser column extraction: DFT, FRR, Product, Member Mark

- Add cell text normalization (remove newlines, spaces)
- Extract member_mark from ITEM CODE column
- Change MINUTES to MINUTE for flexible matching
- Change MICRONS to MICRON for flexible matching
- Add comprehensive debug logging
- Add fallback for member_mark extraction"

git push origin main
```

4. **Deploy to Render**:
   - Go to Render dashboard
   - Find the Python parser service
   - Click "Manual Deploy" → "Deploy latest commit"
   - Or: The service will auto-deploy if configured

5. **Monitor deployment**:
```bash
# Watch Render logs
render logs python-parser --tail

# Look for:
# - Service started successfully
# - No import errors
# - Debug logging working
```

### Testing After Deployment

1. **Delete test data**:
```sql
-- In Supabase SQL Editor
DELETE FROM loading_schedule_items WHERE import_id IN (
  SELECT id FROM loading_schedule_imports
  WHERE schedule_reference = 'CST-240505A'
);
DELETE FROM loading_schedule_imports
WHERE schedule_reference = 'CST-240505A';
```

2. **Re-upload test PDF**:
   - Go to project → Loading Schedule tab
   - Upload: `CST-240505A_Auckland_Airport_Bulk_Screening_60_min_FRR_SC902.pdf`
   - Wait for parsing to complete

3. **Check parser logs** (Render dashboard):
```
[DEBUG] Altex Parser - Detected product from title: NULLIFIRE SC902
[DEBUG] Altex Parser - Detected FRR from title: 60
[DEBUG] Altex Parser - Detected columns: ['element_name', 'configuration', 'sides', 'hp_a', 'frr', 'dft', 'item_code']
[DEBUG] Row 1: Section=150PFC, Member Mark=150PFC, FRR=60, DFT=918, Product=NULLIFIRE SC902
[DEBUG] Row 2: Section=10UA, Member Mark=10UA, FRR=60, DFT=802, Product=NULLIFIRE SC902
[DEBUG] Row 3: Section=200UB22, Member Mark=200UB22, FRR=60, DFT=1114, Product=NULLIFIRE SC902
[DEBUG] Row 4: Section=100EA8, Member Mark=100EA8, FRR=60, DFT=872, Product=NULLIFIRE SC902
```

4. **Verify data in database**:
```sql
SELECT
  section_size_normalized as section,
  member_mark,
  frr_minutes as frr,
  coating_product as product,
  dft_required_microns as dft
FROM loading_schedule_items
WHERE import_id IN (
  SELECT id FROM loading_schedule_imports
  WHERE schedule_reference = 'CST-240505A'
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY section;
```

**Expected output**:
```
section  | member_mark | frr | product          | dft
---------+-------------+-----+------------------+------
100EA8   | 100EA8      | 60  | NULLIFIRE SC902  | 872
10UA     | 10UA        | 60  | NULLIFIRE SC902  | 802
150PFC   | 150PFC      | 60  | NULLIFIRE SC902  | 918
200UB22  | 200UB22     | 60  | NULLIFIRE SC902  | 1114
```

✅ **SUCCESS**: All columns extracted correctly!

### Rollback (If Needed)

If issues occur:

```bash
git revert HEAD
git push origin main
# Render will auto-deploy the reverted version
```

---

## 🔍 Troubleshooting

### Problem: Columns still NULL

**Check**: Parser logs show column detection?
```
[DEBUG] Altex Parser - Detected columns: [...]
```

If columns missing from list:
- PDF format may have changed
- Column headers may be formatted differently
- Check actual PDF table structure with pdfplumber

### Problem: Wrong DFT values

**Check**: DFT column detected?
```
[DEBUG] Column indices: {'dft': 8, ...}
```

If DFT index is wrong:
- Verify PDF column order
- Check if "DFT" and "MICRON" appear in header
- May need to adjust column detection logic

### Problem: Product still NULL

**Check**: Title extraction working?
```
[DEBUG] Altex Parser - Detected product from title: NULLIFIRE SC902
```

If not detected:
- Check PDF title contains "NULLIFIRE SC902" text
- Verify regex pattern matches product name format
- May need to adjust regex: `r"(NULLIFIRE\s+[A-Z0-9]+)"`

---

## 📞 Support

If issues persist after deployment:

1. **Check Render logs** for Python errors
2. **Check Supabase logs** for database errors
3. **Verify PDF structure** hasn't changed
4. **Test with known-good PDF** (CST-240505A)
5. **Contact**: Development team with logs and sample PDF

---

**Last Updated**: 2026-03-09
**Status**: Ready for deployment
