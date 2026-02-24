# Drawing Preview Failure - Diagnostic Report

**Report Date:** 2026-02-24
**Issue:** Drawing previews showing "(Drawing preview not available)" instead of actual drawings
**Severity:** HIGH - Impacts report generation functionality

---

## Executive Summary

Drawing previews are failing to render in PDF reports due to a **database schema inconsistency**. The application code queries the `file_path` column in the `documents` table, but the actual file paths are stored in the `storage_path` column. This results in NULL values being passed to the drawing rendering functions, causing all drawing previews to fail.

---

## Investigation Findings

### 1. Database Schema Analysis

#### Documents Table Structure
```sql
Column Name       | Data Type | Contains Data
------------------|-----------|---------------
file_path         | text      | NULL
file_name         | text      | "filename.pdf"
storage_path      | text      | "project_id/timestamp-hash.pdf"
mime_type         | text      | "application/pdf"
```

#### Actual Data Sample
```json
{
  "file_path": null,
  "file_name": null,
  "storage_path": "99999999-9999-9999-9999-999999999999/1771376232829-d9ptf5.pdf",
  "mime_type": "application/pdf"
}
```

**Finding:** The `file_path` column is NULL, while `storage_path` contains the actual file location.

---

### 2. Code Analysis

#### Affected Files

**File:** `src/lib/pdfMarkupDrawings.ts`
- **Line 41:** Queries `documents!inner(file_path, file_name)`
- **Line 81:** Maps to `file_path: d.documents.file_path`
- **Line 103-163:** `getDrawingImageData(filePath, pageNumber)` receives NULL
- **Result:** Returns null, drawing not rendered

**File:** `src/lib/pdfPinCorrectionsReport.ts`
- **Line 59:** Queries `documents!inner(file_path, file_name)`
- **Line 124:** Maps drawing data with NULL file_path
- **Line 177:** `getDrawingImageData()` receives NULL
- **Result:** Returns null, drawing not rendered

**File:** `src/components/ExportsTab.tsx`
- **Line 13:** Imports `addMarkupDrawingsSection`
- **Line 557:** Calls markup drawings function
- **Result:** Section generated but images fail to load

---

### 3. Data Flow Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Query Database                                               │
│    SELECT file_path FROM documents → Returns NULL               │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 2. Map to Drawing Object                                        │
│    file_path: d.documents.file_path → NULL assigned             │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 3. Call getDrawingImageData(NULL, pageNumber)                   │
│    isPdf = NULL.toLowerCase().endsWith('.pdf') → ERROR          │
│    OR supabase.storage.download(NULL) → ERROR                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 4. Exception Caught, Return null                                │
│    console.error('Error loading drawing image:', error)         │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 5. PDF Generation                                               │
│    if (!imageData) → "(Drawing preview not available)"          │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Storage Bucket Verification

**Bucket Name:** `documents`
**Expected Path Format:** `{project_id}/{timestamp}-{hash}.{extension}`
**Actual Path:** `99999999-9999-9999-9999-999999999999/1771376232829-d9ptf5.pdf`
**Status:** ✅ File exists in storage, path is valid

**Verification:** The storage_path value is correct and files are accessible.

---

### 5. Root Cause Analysis

#### Primary Cause
**Column Name Mismatch:** Application code references `file_path` column, but data is stored in `storage_path` column.

#### Contributing Factors
1. **Schema Migration Inconsistency:** Multiple migrations created duplicate columns (`file_path`, `storage_path`, `file_name`, `filename`, `original_name`)
2. **Lack of Data Migration:** Old data not migrated to new column structure
3. **No Validation:** No runtime checks for NULL file paths before rendering

#### Impact Chain
```
NULL file_path → getDrawingImageData() fails →
imageData = null → Drawing not rendered →
"(Drawing preview not available)" shown
```

---

## Technical Details

### Error Manifestation

When `file_path` is NULL:

**Scenario A: PDF Files**
```javascript
const isPdf = filePath.toLowerCase().endsWith('.pdf');
// TypeError: Cannot read property 'toLowerCase' of null
```

**Scenario B: Image Files**
```javascript
const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
// Returns invalid URL with null path
const response = await fetch(data.publicUrl);
// Fetch fails, throws error
```

Both scenarios caught by try-catch, return null, showing "Drawing preview not available"

---

### Console Error Evidence

Expected console errors:
```
Error loading drawing image: TypeError: Cannot read property 'toLowerCase' of null
Error downloading PDF: [Supabase storage error]
```

---

## Recommended Solutions

### Solution 1: Update Query to Use `storage_path` (RECOMMENDED)

**Priority:** HIGH
**Effort:** LOW
**Risk:** LOW

Update all queries to use `storage_path` instead of `file_path`:

**Changes Required:**
1. `src/lib/pdfMarkupDrawings.ts:41` → Change `file_path` to `storage_path`
2. `src/lib/pdfMarkupDrawings.ts:81` → Change `file_path` to `storage_path`
3. `src/lib/pdfPinCorrectionsReport.ts:59` → Change `file_path` to `storage_path`
4. `src/lib/pdfPinCorrectionsReport.ts:124` → Change `file_path` to `storage_path`

**Implementation:** 5 minutes
**Testing:** 10 minutes
**Total Time:** 15 minutes

---

### Solution 2: Database Migration to Consolidate Columns

**Priority:** MEDIUM
**Effort:** MEDIUM
**Risk:** MEDIUM

Create migration to:
1. Copy data from `storage_path` to `file_path`
2. Drop redundant columns
3. Set NOT NULL constraint on `file_path`

**Advantages:**
- Cleaner schema
- Prevents future confusion
- Standard column naming

**Disadvantages:**
- Requires database downtime
- More complex rollback
- Could affect other features

---

### Solution 3: Add Fallback Logic

**Priority:** LOW
**Effort:** LOW
**Risk:** LOW

Add fallback: `const path = filePath || storagePath || previewImagePath`

**Advantages:**
- Works with all column variations
- Resilient to schema changes

**Disadvantages:**
- Doesn't fix root cause
- Potential performance impact
- More complex logic

---

## Prevention Measures

### Immediate Actions

1. **Add NULL checks** before calling rendering functions
2. **Log warnings** when file path is NULL
3. **Add validation** to document upload process

### Long-term Improvements

1. **Schema Documentation:** Document which columns are authoritative
2. **Database Constraints:** Add NOT NULL constraints to required columns
3. **Integration Tests:** Test drawing rendering in CI/CD pipeline
4. **Monitoring:** Alert when drawing renders fail above threshold
5. **Code Review:** Require database schema validation in PR reviews

---

## Implementation Plan

### Phase 1: Immediate Fix (Today)
- [ ] Update queries to use `storage_path`
- [ ] Test drawing preview generation
- [ ] Verify PDF reports render correctly
- [ ] Deploy to production

### Phase 2: Schema Cleanup (This Week)
- [ ] Audit all documents table usage
- [ ] Create migration to consolidate columns
- [ ] Test migration on staging
- [ ] Schedule production migration

### Phase 3: Prevention (This Sprint)
- [ ] Add integration tests for drawing rendering
- [ ] Implement error monitoring
- [ ] Document schema standards
- [ ] Add validation to upload process

---

## Testing Checklist

After implementing fix:

- [ ] Generate markup drawings report
- [ ] Verify drawings visible in PDF
- [ ] Generate pin corrections report
- [ ] Verify drawings visible with annotations
- [ ] Generate complete inspection report
- [ ] Verify all sections render correctly
- [ ] Test with multiple drawing formats (PDF, images)
- [ ] Test with multi-page PDF documents
- [ ] Verify pin markers overlay correctly
- [ ] Check legend renders properly

---

## Rollback Plan

If issues occur after deployment:

1. **Immediate:** Revert code changes to use `file_path`
2. **Short-term:** Add COALESCE in query: `COALESCE(storage_path, file_path) as file_path`
3. **Communication:** Notify users of temporary degradation
4. **Investigation:** Analyze logs to determine failure cause
5. **Re-deploy:** With additional safeguards

---

## Appendix A: SQL Queries for Verification

### Check Column Usage Across Tables
```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE column_name IN ('file_path', 'storage_path', 'filename', 'original_name')
  AND table_schema = 'public'
ORDER BY table_name, column_name;
```

### Count NULL vs Non-NULL Values
```sql
SELECT
  COUNT(*) as total_documents,
  COUNT(file_path) as file_path_populated,
  COUNT(storage_path) as storage_path_populated,
  COUNT(CASE WHEN file_path IS NULL THEN 1 END) as file_path_null,
  COUNT(CASE WHEN storage_path IS NULL THEN 1 END) as storage_path_null
FROM documents;
```

### Verify Drawing References
```sql
SELECT
  d.id,
  d.preview_image_path,
  doc.file_path,
  doc.storage_path,
  CASE
    WHEN doc.file_path IS NOT NULL THEN 'file_path'
    WHEN doc.storage_path IS NOT NULL THEN 'storage_path'
    WHEN d.preview_image_path IS NOT NULL THEN 'preview_image_path'
    ELSE 'NO_PATH'
  END as path_source
FROM drawings d
LEFT JOIN documents doc ON doc.id = d.document_id;
```

---

## Appendix B: Code References

### Current Implementation (Broken)
```typescript
// Line 35-45 in pdfMarkupDrawings.ts
const { data: drawingsData, error: drawingsError } = await supabase
  .from('drawings')
  .select(`
    id,
    document_id,
    page_number,
    documents!inner(file_path, file_name),  // ❌ file_path is NULL
    levels!inner(name, blocks!inner(name, project_id))
  `)
```

### Fixed Implementation
```typescript
// Updated query
const { data: drawingsData, error: drawingsError } = await supabase
  .from('drawings')
  .select(`
    id,
    document_id,
    page_number,
    documents!inner(storage_path, file_name),  // ✅ storage_path has data
    levels!inner(name, blocks!inner(name, project_id))
  `)
```

---

## Conclusion

The drawing preview failure is caused by a simple but critical database column mismatch. The fix is straightforward: update queries to reference `storage_path` instead of `file_path`. This will immediately restore drawing preview functionality across all report types.

**Estimated Time to Resolution:** 15 minutes
**Estimated Risk:** LOW
**Business Impact:** HIGH (Blocks report generation feature)

**Recommendation:** Implement Solution 1 immediately, then schedule Solution 2 for schema cleanup in next sprint.

---

**Report Prepared By:** Technical Diagnostics System
**Review Status:** Ready for Implementation
**Next Steps:** Proceed with code changes as outlined in Solution 1
