# Drawing Pins SQL Syntax Error Fix

## Problem
The PDF report was not displaying the drawings/pins section even though the code was added.

## Root Cause
**SQL Syntax Error** in the RPC functions causing them to fail completely:

```
ERROR: column "dp.pin_number" must appear in the GROUP BY clause
or be used in an aggregate function
```

The issue was in the SQL query structure:
```sql
-- BROKEN: ORDER BY inside jsonb_agg() without proper subquery
SELECT jsonb_agg(jsonb_build_object(...))
FROM drawing_pins dp
...
ORDER BY dp.pin_number  -- ❌ Causes GROUP BY error
```

This prevented the RPC functions from executing at all, so no drawing pins data was returned.

## Solution Applied

**File**: `supabase/migrations/fix_drawing_pins_sql_syntax_error.sql`

Fixed both RPC functions by wrapping the aggregation in a proper subquery:

```sql
-- FIXED: Use subquery with ORDER BY before aggregation
SELECT jsonb_agg(pin_data)
FROM (
  SELECT jsonb_build_object(...) as pin_data
  FROM drawing_pins dp
  ...
  ORDER BY dp.pin_number NULLS LAST, dp.created_at  -- ✅ Works correctly
) pins
```

### Changes Made:

1. **get_executive_summary_data()**:
   - Wrapped pin aggregation in subquery
   - Added `NULLS LAST` to handle pins without numbers
   - Added secondary sort by `created_at` for consistent ordering

2. **get_introduction_data()**:
   - Fixed drawings_list aggregation the same way
   - Added proper ordering by block, level, and page number

3. **ExportsTab.tsx**:
   - Added console logging to show drawings/pins count
   - Helps verify data is being retrieved

## Testing

### Before Fix:
```bash
ERROR: 42803: column "dp.pin_number" must appear in the GROUP BY clause
```

### After Fix:
```json
{
  "total_pins": 4,
  "total_drawings": 1,
  "pins_summary": [
    {
      "pin_number": "1001-1",
      "label": "1001-1 Beam",
      "steel_type": "Beam",
      "member_mark": "R60",
      "block_name": "Home",
      "level_name": "Ground Floor",
      "status": "pass",
      "has_photos": false
    },
    // ... 3 more pins
  ]
}
```

✅ RPC function executes successfully
✅ Returns complete drawing pins data
✅ PDF section will now display correctly

## Verification

```bash
npm run build
✓ built in 23.38s
```

## Result

The drawings and pin locations section will now appear in the PDF report with:
- Complete table of all pins
- Pin numbers, types, and locations
- Member associations
- Status indicators (color-coded)
- Photo attachment flags

The SQL syntax error has been resolved and the data flow is now complete.
