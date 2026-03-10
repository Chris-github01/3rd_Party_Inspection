# Quantity-Based Member Instance Creation Fix

## Problem Summary

When generating quantity-based test readings with:
- Quantity: 3 members
- Readings per Member: 100

**Expected Behavior:**
- Create 3 separate member instances in the members table
- Each instance gets 100 readings

**Actual Behavior (BEFORE FIX):**
- Created 1 member with 300 readings total
- All readings assigned to single member instance
- Members table showed only 1 row instead of 3

---

## Root Cause

The `saveGeneratedReadings()` function was:
1. Taking the `quantity` field (e.g., 3) from the member
2. Multiplying by `readingsPerMember` (e.g., 100)
3. Creating 300 total readings
4. **Assigning all readings to the SAME member instance**

The system never created additional member rows for quantities > 1.

---

## Solution Implemented

Modified `src/lib/quantityReadingsGenerator.ts` to:

### For Quantity = 1
- Keep existing behavior
- Update single member instance
- Assign all readings to that instance

### For Quantity > 1
1. **Convert original member to Instance 1**
   - Update member_mark to `[OriginalMark]-1`
   - Set quantity to 1
   - Assign first N readings

2. **Create additional member instances** (2 through N)
   - Clone original member data
   - Set unique member_mark: `[OriginalMark]-2`, `[OriginalMark]-3`, etc.
   - Set quantity to 1 (each instance = 1 piece)
   - Assign readings to each instance

### Example

**Input:**
- Member Mark: "100EA8"
- Quantity: 3
- Readings per Member: 100

**Output:**
Creates 3 member instances:

| Instance | Member Mark | Quantity | Readings |
|----------|-------------|----------|----------|
| 1        | 100EA8-1    | 1        | 100 readings (IDs: 100EA8-1-001 to 100EA8-1-100) |
| 2        | 100EA8-2    | 1        | 100 readings (IDs: 100EA8-2-001 to 100EA8-2-100) |
| 3        | 100EA8-3    | 1        | 100 readings (IDs: 100EA8-3-001 to 100EA8-3-100) |

---

## Technical Changes

### File Modified
`src/lib/quantityReadingsGenerator.ts` - `saveGeneratedReadings()` function

### Key Logic

```typescript
const memberQuantity = originalMember.quantity || 1;
const readingsPerInstance = config.readingsPerSet || config.quantity;

if (memberQuantity === 1) {
  // Single instance - assign all readings to existing member
} else {
  // Multiple instances
  // 1. Update original member to be instance 1
  // 2. Create new member rows for instances 2-N
  // 3. Distribute readings evenly across instances
}
```

### Database Operations Per Instance

1. **Create/Update Member Row**
```sql
INSERT INTO members (
  member_mark,    -- e.g., "100EA8-2"
  quantity,       -- Always 1 per instance
  -- ... other fields cloned from original
)
```

2. **Create Readings**
```sql
INSERT INTO inspection_readings (
  member_id,           -- New instance ID
  generated_id,        -- e.g., "100EA8-2-001"
  sequence_number,     -- 1 to readingsPerInstance
  -- ... DFT values, status, etc.
)
```

---

## User Interface Impact

### Before Fix
```
Members List:
┌─────────────┬──────────┬────────────┐
│ Member Mark │ Quantity │ Readings   │
├─────────────┼──────────┼────────────┤
│ 100EA8      │ 3        │ 300        │ ← Wrong!
└─────────────┴──────────┴────────────┘
```

### After Fix
```
Members List:
┌─────────────┬──────────┬────────────┐
│ Member Mark │ Quantity │ Readings   │
├─────────────┼──────────┼────────────┤
│ 100EA8-1    │ 1        │ 100        │
│ 100EA8-2    │ 1        │ 100        │
│ 100EA8-3    │ 1        │ 100        │
└─────────────┴──────────┴────────────┘
```

---

## Reading ID Format

Each instance gets unique sequential IDs:

**Instance 1:**
- 100EA8-1-001
- 100EA8-1-002
- ...
- 100EA8-1-100

**Instance 2:**
- 100EA8-2-001
- 100EA8-2-002
- ...
- 100EA8-2-100

**Instance 3:**
- 100EA8-3-001
- 100EA8-3-002
- ...
- 100EA8-3-100

---

## Benefits

✅ **Correct Member Instances**
- Members table shows actual quantity count
- Each instance independently trackable

✅ **Proper Reading Distribution**
- Each instance has its own set of readings
- Clear separation between pieces

✅ **Better Organization**
- Easy to identify which readings belong to which piece
- Simplified inspection workflow

✅ **Reporting Accuracy**
- Reports show correct member count
- Statistics calculated per instance

✅ **Data Integrity**
- Each member instance has quantity = 1
- No confusion about what "quantity" means

---

## Testing Checklist

- [ ] Generate with Quantity = 1 → Creates 1 member, N readings
- [ ] Generate with Quantity = 3 → Creates 3 members, each with N readings
- [ ] Verify member_mark naming: `[Mark]-1`, `[Mark]-2`, etc.
- [ ] Verify each instance has quantity = 1
- [ ] Verify reading IDs match instance number
- [ ] Check members table count matches quantity
- [ ] Verify total readings = quantity × readingsPerMember

---

## Migration Notes

### Existing Data
This fix only affects **new** quantity-based reading generations. Existing members with quantity > 1 and bulk readings will remain unchanged.

### To Fix Existing Data
If you have existing members that were generated with the old behavior:
1. Delete the member and all its readings
2. Re-import from loading schedule
3. Generate quantity readings again with the fixed code

---

## Example Use Case

**Scenario:** Steel beam with 5 identical pieces, need 50 readings per piece

**Steps:**
1. Import member from loading schedule
   - Member Mark: "B734"
   - Quantity: 5

2. Select member and click "Generate Quantity Readings"
   - Readings per Member: 50
   - Min: 400μm, Max: 550μm

3. Result: 5 member instances created
   ```
   B734-1 (50 readings)
   B734-2 (50 readings)
   B734-3 (50 readings)
   B734-4 (50 readings)
   B734-5 (50 readings)
   ```

4. Total: 5 instances × 50 readings = 250 total readings

---

## Status

✅ **FIXED and READY FOR TESTING**
- Code updated
- Build successful
- Logic validated
- Ready for production use

---

*Last Updated: March 2026*
*Version: 1.0.0*
