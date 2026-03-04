# Site Manager Workflow Fix - "Spatial Mapping Unavailable" Issue

## Problem

When users uploaded documents in the Documents tab, the Site Manager tab remained blocked with the message "Spatial Mapping Unavailable" even though drawings had been uploaded.

## Root Cause

**Database Schema Mismatch**: There was a mismatch between the column name used when inserting documents and the column name checked by the workflow validation function.

### The Issue:

1. **Document Upload** (`src/components/DocumentsTab.tsx`):
   - Was inserting with column name `type`
   ```typescript
   await supabase.from('documents').insert({
     type: selectedType,  // ❌ Wrong column name
     // ...
   });
   ```

2. **Workflow Validation** (`calculate_project_workflow_state` function):
   - Was checking for column name `document_type`
   ```sql
   SELECT COUNT(*) INTO drawing_count
   FROM documents
   WHERE project_id = p_project_id
     AND document_type = 'drawing';  -- ✅ Correct column name
   ```

This resulted in:
- Documents being uploaded successfully
- But workflow system couldn't detect them (looking at wrong column)
- Site Manager remaining blocked

## Solution

Updated `src/components/DocumentsTab.tsx` to use the correct column name `document_type`:

### Changes Made:

1. **Document Interface** (line 12):
```typescript
// Before
interface Document {
  id: string;
  type: string;  // ❌
  // ...
}

// After
interface Document {
  id: string;
  document_type: string;  // ✅
  // ...
}
```

2. **Document Insert** (line 188):
```typescript
// Before
const { error: dbError } = await supabase.from('documents').insert({
  project_id: projectId,
  type: selectedType,  // ❌
  filename: fileName,
  // ...
});

// After
const { error: dbError } = await supabase.from('documents').insert({
  project_id: projectId,
  document_type: selectedType,  // ✅
  filename: fileName,
  // ...
});
```

3. **Document Display** (line 790):
```typescript
// Before
const typeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label || doc.type;

// After
const typeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type;
```

## Why This Happened

The database schema was updated in a later migration (`20260216090616_create_inspection_app_core_tables.sql`) which renamed the column from `type` to `document_type`, but the frontend code wasn't updated to match.

### Schema History:

1. **Original Schema** (`20260213211957_create_inspection_app_schema.sql`):
```sql
CREATE TABLE documents (
  type text NOT NULL  -- Original column name
  -- ...
);
```

2. **Updated Schema** (`20260216090616_create_inspection_app_core_tables.sql`):
```sql
CREATE TABLE documents (
  document_type text NOT NULL  -- New column name
  -- ...
);
```

## Workflow Validation Logic

The workflow system checks if Site Manager should be accessible using this logic:

```sql
-- From calculate_project_workflow_state function
SELECT COUNT(*) INTO drawing_count
FROM documents
WHERE project_id = p_project_id
  AND document_type = 'drawing';

has_drawings := drawing_count > 0;
```

```sql
-- From get_workflow_blocking_reasons function
WHEN 'site_manager' THEN
  IF NOT (state->>'drawings_ready')::boolean THEN
    reasons := reasons || jsonb_build_object(
      'type', 'drawings_missing',
      'message', 'Upload Drawings in Documents',
      'action', 'Go to Documents'
    );
  END IF;
```

## Expected Behavior After Fix

1. User uploads a document and selects type "Drawing"
2. Document is inserted with `document_type = 'drawing'`
3. Workflow function counts documents correctly
4. `drawings_ready` becomes `true`
5. Site Manager tab becomes accessible
6. User can create blocks/levels and assign drawings

## Testing

✅ Build successful
✅ No TypeScript errors
✅ Column name matches database schema
✅ Workflow validation will now detect uploaded drawings correctly

## Migration Notes

If you have existing documents in the database that were uploaded with the old `type` column, you may need to run a data migration to copy `type` to `document_type`:

```sql
-- Only needed if you have legacy data
UPDATE documents
SET document_type = type
WHERE document_type IS NULL AND type IS NOT NULL;
```

However, based on the schema migrations, the table should already be using `document_type` as the primary column.
