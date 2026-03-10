# Quantity Readings Statistical Analysis - Quick Reference

## What Changed?

**Before**: "Export to PDF" button only exported basic member info and readings table

**After**: "Export to PDF" button now automatically includes comprehensive statistical analysis pages with charts and compliance checks

## PDF Structure (Per Member)

### Page 1: Readings Data
```
┌─────────────────────────────────────────┐
│ [Organization Logo]                     │
│                                         │
│ Member: 100EA8-1                        │
│ ├─ Element Type: beam                   │
│ ├─ Section: 310UC137                    │
│ ├─ Required DFT: 450 µm                 │
│ └─ Total Readings: 100                  │
│                                         │
│ Detailed Readings:                      │
│ ┌──────────────────────────────────┐    │
│ │ 1:445 | 2:458 | 3:442 | 4:461 ...│    │
│ │ ...all 100 readings displayed... │    │
│ └──────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Page 2: Statistical Analysis
```
┌─────────────────────────────────────────┐
│ Statistical Analysis: 100EA8-1          │
│                                         │
│ Summary Statistics                      │
│ ┌─────────────────────────────────┐     │
│ │ Count             : 100         │     │
│ │ Mean              : 452.3 µm    │     │
│ │ Maximum           : 475 µm      │     │
│ │ Minimum           : 432 µm      │     │
│ │ Range             : 43 µm       │     │
│ │ Std Deviation (σ) : 12.5 µm     │     │
│ │ Mean - 3σ         : 414.8 µm    │     │
│ │ COV               : 2.8%        │     │
│ └─────────────────────────────────┘     │
│                                         │
│ Compliance Summary                      │
│ ┌─────────────────────────────────┐     │
│ │ Required DFT      : 450 µm      │     │
│ │ Mean ≥ Required   : ✓ PASS      │     │
│ │ Min ≥ 90% Req     : ✓ PASS      │     │
│ │ Mean-3σ ≥ 90% Req : ✓ PASS      │     │
│ │ Overall Status    : ✓ COMPLIANT │     │
│ └─────────────────────────────────┘     │
│                                         │
│ DFT Readings Trend                      │
│ [Line chart showing all 100 readings]   │
│                                         │
│ Reading Distribution                    │
│ [Histogram showing frequency]           │
└─────────────────────────────────────────┘
```

## Statistical Metrics Explained

| Metric | Meaning | Use Case |
|--------|---------|----------|
| **Count** | Number of readings taken | Verify full coverage |
| **Mean** | Average DFT value | Primary compliance check |
| **Max/Min** | Highest/lowest readings | Identify outliers |
| **Range** | Spread of values | Assess consistency |
| **Std Dev (σ)** | Variation from mean | Quality control |
| **Mean - 3σ** | Lower control limit | Statistical compliance |
| **COV %** | Relative variation | Compare consistency across members |

## Compliance Checks

### 1. Mean Check
```
Mean DFT ≥ Required DFT
```
Primary acceptance criterion

### 2. Minimum Check
```
Min DFT ≥ 90% of Required DFT
```
Ensures no critically low spots

### 3. 3-Sigma Check
```
Mean - 3σ ≥ 90% of Required DFT
```
Statistical quality control (99.7% confidence)

### Overall Status
```
COMPLIANT = Mean Check PASS + 3-Sigma Check PASS
```

## How to Use

### Step 1: Generate Readings
1. Go to Members tab
2. Select members (checkbox)
3. Click "Generate Quantity Readings"
4. Configure parameters (readings count, value range)
5. Click "Generate"

### Step 2: Export with Statistics
1. Ensure members with quantity readings are still selected
2. Click "Export to PDF"
3. System automatically detects quantity readings
4. PDF generates with statistical analysis pages

### Step 3: Review Report
- **Page 1**: Verify all readings are present
- **Page 2**: Check compliance status and charts
- Green indicators = Pass
- Red indicators = Fail/Non-compliant

## Chart Interpretations

### Line Chart (Trend)
- **Flat line**: Consistent application
- **Upward/downward trend**: Application drift
- **High volatility**: Inconsistent technique
- **Readings near required line**: Marginal compliance

### Histogram (Distribution)
- **Normal bell curve**: Good quality control
- **Skewed left**: Many low readings (concern)
- **Skewed right**: Many high readings (wastage)
- **Bimodal**: Two different conditions/areas

## Integration Points

### Automatic Detection
The system automatically determines which PDF format to use:

```
IF inspection_readings table has data for selected members
  → Use NEW statistical PDF generator
ELSE
  → Use legacy inspection PDF generator
```

### No Manual Selection Required
Users don't need to choose - the system intelligently routes to the correct generator based on data source.

## File Naming Convention

```
Quantity_Readings_Report_[ProjectName]_[YYYYMMDD].pdf
```

Example:
```
Quantity_Readings_Report_Auckland_Office_Tower_20260310.pdf
```

## Technical Notes

- **Chart Resolution**: 800x400px (high quality for print)
- **Chart Format**: PNG with transparent background
- **Statistical Method**: Sample standard deviation (n-1)
- **Page Size**: A4 portrait
- **Margins**: 15mm all sides
- **Font**: Helvetica (universal compatibility)

## Common Questions

**Q: Can I export individual members separately?**
A: Currently exports all selected members in one PDF. Each member gets their own pages.

**Q: What if I have more than 100 readings?**
A: System handles 1-100 readings per member. Over 100 may require pagination adjustments.

**Q: Can I customize compliance thresholds?**
A: Currently set to 90% for min and 3-sigma checks. Can be modified in code.

**Q: Do charts export to Excel too?**
A: No, charts are PDF-only. Excel export contains raw data tables only.

**Q: What if required DFT is not set?**
A: Statistics still calculate, but compliance section shows "N/A".

## Backward Compatibility

✅ Existing "Generate Test Readings" (simulation mode) still works
✅ Old inspection data exports use legacy format
✅ No changes required to existing workflows
✅ Zero breaking changes to current functionality

---

**Quick Access**: Members Tab → Select Members → Export to PDF
**Data Source**: inspection_readings table (quantity-based readings)
**Charts**: Line chart + Histogram (auto-generated)
**Statistics**: 8 key metrics + 3 compliance checks
