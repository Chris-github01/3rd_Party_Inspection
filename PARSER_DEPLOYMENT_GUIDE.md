# Loading Schedule Parser - Deployment Guide

## Overview

The Python parser has been updated to support **two loading schedule formats**:

1. **Altex Coatings** - Already implemented, needs redeployment
2. **AkzoNobel / International Paint** - Newly implemented

## What Was Changed

### New Features Added

#### 1. Document Format Detection
The parser now automatically detects which format a PDF is using:
- **AkzoNobel**: Detected by markers like "Client Schedule", "Protective Coatings www.international-pc.com", "Parts List"
- **Altex**: Detected by markers like "Altex Coatings Limited", "Nullifire", "P.O. Box 142"
- **Generic**: Fallback for other formats

#### 2. AkzoNobel Parser (`parse_akzonobel_schedule`)
Handles AkzoNobel-specific format:
- **Member format**: "AU SHS 89x89x6.0", "AU 250UB37.3", "Plate 1000x10"
- **Hazard Rating**: "R60", "R30" → Converts to 60, 30 minutes
- **DFT in mm**: Converts to microns (e.g., 5.045mm → 5045µm)
- **Metadata extraction**:
  - Project: "Diocesan Shrewsbury Block Redevelopment"
  - Reference: "AN022478-Rev 01-Option 01"
  - Product: "Interchar 3120"

#### 3. Enhanced Metadata Extraction
Now extracts for both formats:
- Schedule Reference / Reference number
- Project name
- Coating system (Nullifire SC601, Interchar 3120, etc.)
- Supplier (Altex, AkzoNobel, International Paint, etc.)
- Document format type

### File Changes

- **`python-parser/parser.py`** - Updated with:
  - `detect_document_format()` - Auto-detect schedule type
  - `parse_akzonobel_schedule()` - AkzoNobel-specific parser
  - `parse_generic_schedule()` - Renamed from `parse_loading_schedule` for Altex/generic
  - Enhanced `extract_document_metadata()` - Supports multiple formats
  - New regex patterns for AkzoNobel member formats

## Deployment Instructions

### Prerequisites

You need access to:
- Render dashboard (where the Python parser is deployed)
- The parser service URL (e.g., `https://loading-schedule-parser-xyz.onrender.com`)

### Method 1: Deploy from Local Repository

If you have the project in a Git repository:

```bash
# 1. Navigate to your project root
cd /path/to/your/project

# 2. Stage the updated parser
git add python-parser/parser.py

# 3. Commit the changes
git commit -m "feat: Add AkzoNobel loading schedule parser + Altex improvements"

# 4. Push to repository
git push origin main
```

If your Render service is connected to GitHub, it will auto-deploy.

### Method 2: Manual Deploy on Render

If auto-deploy is not configured:

1. **Login to Render Dashboard**
   - Go to: https://dashboard.render.com
   - Navigate to your Python parser service

2. **Trigger Manual Deploy**
   - Click "Manual Deploy" → "Deploy latest commit"
   - Or: "Settings" → "Clear build cache & deploy"

3. **Monitor Deployment**
   - Watch the logs for "Build successful"
   - Service should restart automatically (~2-3 minutes)

### Method 3: Fresh Deployment

If the parser hasn't been deployed yet:

1. **Create New Web Service on Render**
   - Name: `loading-schedule-parser`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

2. **Configuration**
   - Root Directory: `python-parser/`
   - Branch: `main` (or your default branch)
   - Auto-Deploy: `Yes` (recommended)

3. **Environment Variables**
   - None required (parser is stateless)

## Verification Steps

### 1. Check Parser is Running

```bash
curl https://your-parser-service.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "2.0.0-sb-wf-support",
  "parser_updated": "2026-03-02"
}
```

### 2. Test Altex Format

Upload the Altex sample PDF (`CST-250911A_Scott_Point_Road...pdf`):

**Expected Output:**
```json
{
  "status": "completed",
  "items_extracted": 7,
  "metadata": {
    "schedule_reference": "CST-250911A",
    "project_name": "Scott Point Road, Interior Enclosed Steel - 30 min FRR",
    "coating_system": "NULLIFIRE SC601",
    "supplier": "Altex Coatings Limited",
    "document_format": "altex"
  },
  "items": [
    {
      "section_size_raw": "360UB45",
      "section_size_normalized": "360UB45",
      "frr_minutes": 30,
      "dft_required_microns": 225,
      ...
    }
  ]
}
```

### 3. Test AkzoNobel Format

Upload the AkzoNobel sample PDF (`AN022478_-_FR_Coatings_Ltd...pdf`):

**Expected Output:**
```json
{
  "status": "completed",
  "items_extracted": 22,
  "metadata": {
    "schedule_reference": "AN022478-Rev 01-Option 01",
    "project_name": "Diocesan Shrewsbury Block Redevelopment",
    "coating_system": "Interchar 3120",
    "supplier": "AkzoNobel",
    "document_format": "akzonobel"
  },
  "items": [
    {
      "section_size_raw": "AU SHS 89x89x6.0",
      "section_size_normalized": "SHS 89x89x6.0",
      "frr_minutes": 60,
      "dft_required_microns": 5045,
      "coating_product": "Interchar 3120",
      ...
    }
  ]
}
```

## Troubleshooting

### Issue: "No structural members detected"

**For Altex format:**
- Check that section sizes are present (610UB125, 200x200SHS, etc.)
- Verify FRR rating is in header or rows
- Ensure PDF is text-based, not scanned

**For AkzoNobel format:**
- Check for "Parts List" table
- Verify "Member" column exists
- Check "Hazard Rating" column has R60/R30 values
- Ensure DFT column has numeric values

### Issue: Parser not updating after deployment

**Solution:**
1. Go to Render dashboard
2. Navigate to service → "Settings"
3. Click "Clear build cache & deploy"
4. Wait for fresh build (~3-5 minutes)

### Issue: Wrong format detected

**Check detection markers:**
- AkzoNobel needs at least 2 of: "client schedule", "protective coatings", "parts list", "hazard rating", "akzonobel"
- Altex needs at least 2 of: "altex coatings limited", "nullifire", "p.o. box 142", "tauranga"

**If detection fails:**
- The parser will use generic format (Altex/Jotun parser)
- Manual format specification may be needed (future enhancement)

## Testing Checklist

After deployment, verify with:

**Altex Format:**
- ✅ Extracts section sizes: 360UB45, 460UB75, 16mmPlate
- ✅ Extracts FRR: 30 minutes
- ✅ Extracts DFT: 225 microns
- ✅ Metadata: Schedule ref, project name, coating system, supplier

**AkzoNobel Format:**
- ✅ Extracts members: "AU SHS 89x89x6.0" → "SHS 89x89x6.0"
- ✅ Converts hazard rating: "R60" → 60 minutes
- ✅ Converts DFT: 5.045mm → 5045 microns
- ✅ Handles both 60min and 30min FRR sections
- ✅ Metadata: Reference, project, coating, supplier

## Parser Capabilities

### Supported Section Types

**Standard formats:**
- Universal Beams: 610UB125, 460UB75, 250UB37.3
- Universal Columns: 310UC97, 200UC52
- SHS: 200x200SHS, 89x89x6.0 SHS
- RHS: 250x150x9.0 RHS, 150x100RHS
- CHS: 324x12.7 CHS
- PFC: 300 PFC, 250 PFC
- EA: 100x100x10 EA
- Plates: 16mmPlate, Plate 1000x10

**AkzoNobel-specific formats:**
- AU prefix: "AU SHS 89x89x6.0", "AU 250UB37.3"
- A prefix: "A 200x200x8", "A 200x200x16"
- Plate: "Plate 1000x10"

### Supported FRR Formats

- Standard: R30, R60, R90, R120, R180, R240
- Alternative: FRR: 60, Fire Rating: 30
- Header-based: Column headers with hazard rating

### Supported DFT Formats

- Microns: 225, 312, 457 (with or without unit)
- Millimeters: 5.045mm, 2.362mm (converts to microns)

## Edge Function Integration

The Supabase Edge Function `parse-pdf` calls the Python parser. Ensure it has the correct environment variable:

```bash
# Check current secrets
supabase secrets list

# Set parser URL (if not already set)
supabase secrets set PYTHON_PARSER_URL=https://your-parser-service.onrender.com
```

## Version Information

- **Parser Version**: 2.1.0 (AkzoNobel support)
- **Last Updated**: March 4, 2026
- **Key Functions**:
  - `detect_document_format()` - Format detection
  - `parse_akzonobel_schedule()` - AkzoNobel parser
  - `parse_generic_schedule()` - Altex/generic parser
  - `extract_document_metadata()` - Multi-format metadata

## Support

For issues or questions:
1. Check Render service logs for errors
2. Verify PDF is text-based (not scanned)
3. Test with sample files provided
4. Review error messages for specific guidance

---

**Status**: Ready for deployment ✅

Both Altex and AkzoNobel formats are now fully supported. Deploy to Render to enable parsing of both schedule types.
