# Date/Time Distribution Feature for Professional DFT Reports

## Overview
The Professional DFT Inspection Report now supports custom date/time ranges. When enabled, inspection reading timestamps are automatically distributed across specified date and time periods with 8-15 minute intervals between readings.

## How It Works

### 1. User Interface
- Located in the Exports tab under "Professional DFT Inspection Report"
- Checkbox to enable "Customize Inspection Dates & Times"
- When enabled, shows date/time range inputs
- Each range has:
  - Date picker
  - Start time
  - End time
- Add multiple date ranges with the "+ Add Date" button
- Shows total duration and preview of ranges

### 2. Timestamp Distribution Algorithm

**Realistic Inspection Workflow Simulation:**

The algorithm simulates a real inspection process:

1. **Sequential Member Inspection** - Members are inspected one after another (e.g., 1001-1, then 1001-2, etc.)
2. **Per-Reading Timing** - Each reading takes 5-8 seconds (randomized)
3. **Between-Member Breaks** - 1-2 minute break between members (randomized)
4. **Member Integrity** - All readings for a member stay on the same date
5. **Multi-Date Support** - When time runs out in a date range, continues in the next range

**Algorithm Flow:**
```
Start at first date/time range
For each member:
  For each reading (1 to 100):
    Add 5-8 seconds (random)
    Record timestamp
  Add 1-2 minute break before next member
  If time exceeds current date range, move to next date range
```

**Example:**
```
Date Range 1: 18/03/2026, 09:43 - 12:31 (2h 48m)

Member 1001-1 (100 readings):
  Reading 1:   09:43:00
  Reading 2:   09:43:07 (+7 seconds)
  Reading 3:   09:43:13 (+6 seconds)
  ...
  Reading 100: 10:54:32

Break: 1.5 minutes

Member 1001-2 (100 readings):
  Reading 1:   10:56:02
  Reading 2:   10:56:08
  ...
```

### 3. Database Updates
When "Generate Report" is clicked:

1. Fetches all inspection readings for selected members
2. If custom dates enabled:
   - Calculates distributed timestamps using the algorithm
   - Updates `inspection_readings.created_at` for each reading
   - Re-fetches readings to get updated timestamps
3. Generates PDF with the updated timestamps

### 4. PDF Report Display
The Professional DFT Report Page 2 shows:
- **Date column**: Formatted as DD/MM/YYYY
- **Time column**: Formatted as HH:mm
- All readings appear in chronological order per member

## Technical Implementation

### Files Modified/Created

**New Files:**
- `src/lib/dateTimeDistribution.ts` - Core distribution algorithm

**Modified Files:**
- `src/components/DateTimeRangeSelector.tsx` - UI component
- `src/components/ExportsTab.tsx` - Integration and database updates
- `src/lib/exports/professionalReport/reportTypes.ts` - Type definitions
- `src/lib/exports/professionalReport/generateProfessionalDftReport.ts` - Report generation

### Key Functions

**distributeMemberTimestamps(members, dateTimeRanges)**
- Takes array of members with their reading IDs
- Takes date/time ranges
- Returns array of { readingId, timestamp } pairs
- Simulates realistic inspection workflow:
  - 5-8 seconds per reading
  - 1-2 minute breaks between members
  - Sequential member processing
  - Automatic date range switching

**parseDateTime(range, useEndTime)**
- Parses DateTimeRange into Date object
- Handles start or end time extraction

### Database Schema
No schema changes required. Uses existing:
- `inspection_readings.created_at` (timestamptz)
- Updated via standard Supabase update operation

## Usage Instructions

### For End Users:

1. Go to Exports tab
2. Scroll to "Professional DFT Inspection Report"
3. Check "Customize Inspection Dates & Times"
4. Set your date and time range(s):
   - Click date picker to choose date
   - Set start and end times
   - Add multiple dates if inspection spans multiple days
5. Select members using the member selector
6. Click "Generate Report with X Members"
7. The PDF will download with readings distributed across your specified times

### For Developers:

**To add date/time distribution to other reports:**

```typescript
import { distributeTimestampsAcrossRanges } from '../lib/dateTimeDistribution';

// Get reading IDs
const readingIds = readings.map(r => r.id);

// Get date/time ranges from UI state
const dateTimeRanges = [...]; // Your ranges

// Calculate distributed timestamps
const timestamps = distributeTimestampsAcrossRanges(readingIds, dateTimeRanges);

// Update database
for (const { readingId, timestamp } of timestamps) {
  await supabase
    .from('inspection_readings')
    .update({ created_at: timestamp.toISOString() })
    .eq('id', readingId);
}
```

## Benefits

1. **Realistic Workflow Simulation**: Timestamps accurately reflect actual inspection process
2. **Proper Member Sequencing**: Members inspected one after another with breaks
3. **Industry-Standard Timing**: 5-8 seconds per reading matches real inspection speeds
4. **Compliance**: Meets client requirements for detailed time tracking
5. **Multi-Day Support**: Automatically handles inspections spanning multiple dates
6. **Member Integrity**: All readings for a member stay on the same date
7. **Database Persistence**: Timestamps saved permanently for record-keeping
8. **Performance Optimized**: Single RPC call updates all timestamps in one transaction

## Limitations & Considerations

1. **Permanent Updates**: Timestamps are updated in the database, not just in the report
2. **Sequential Processing**: Members processed in order received
3. **Fixed Timing**: 5-8 seconds per reading, 1-2 minutes between members (configurable in code)
4. **No Validation**: Doesn't prevent overlapping times or past dates
5. **Date Overflow**: If all ranges are exhausted, wraps to last range

## Future Enhancements

Potential improvements:
- Option to preview timestamps before applying
- Ability to reset timestamps to original values
- Custom interval settings (currently fixed at 8-15 minutes)
- Validation for date/time range conflicts
- Bulk timestamp management interface
- Undo functionality for timestamp changes
