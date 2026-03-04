# Quick Start: Deploy Updated Parser

## What's Ready

✅ **Altex Parser** - Fixed and ready (was already implemented)
✅ **AkzoNobel Parser** - Newly implemented and ready
✅ **Auto-detection** - Parser automatically detects format
✅ **Build verified** - TypeScript compilation successful

## Deployment Steps

### Option 1: Deploy to Render (Recommended)

1. **Access Render Dashboard**
   ```
   Go to: https://dashboard.render.com
   Find: loading-schedule-parser (or similar name)
   ```

2. **Copy Parser Files**
   The updated files in `python-parser/` directory need to be deployed:
   - `parser.py` - Main parser with both Altex and AkzoNobel support
   - `main.py` - FastAPI server (unchanged)
   - `requirements.txt` - Dependencies (unchanged)

3. **Deploy on Render**
   - Click "Manual Deploy" → "Deploy latest commit"
   - OR: Click "Clear build cache & deploy"
   - Wait 2-3 minutes for deployment

### Option 2: Deploy from Git

If your project is in a Git repository:

```bash
# Stage the parser updates
git add python-parser/parser.py

# Commit
git commit -m "feat: Add AkzoNobel parser + improve Altex parser"

# Push (Render will auto-deploy if connected)
git push origin main
```

## Test After Deployment

### 1. Health Check

```bash
curl https://your-parser-service.onrender.com/health
```

Expected:
```json
{
  "status": "healthy",
  "version": "2.0.0-sb-wf-support"
}
```

### 2. Test Altex Format

Upload: `CST-250911A_Scott_Point_Road_Interior_Enclosed_Steel_-_30_min_FRR_SC601.pdf`

Expected result:
```
✅ 7 items extracted
✅ Schedule Reference: CST-250911A
✅ Project: Scott Point Road, Interior Enclosed Steel - 30 min FRR
✅ Coating: NULLIFIRE SC601
✅ Supplier: Altex Coatings Limited
✅ Format: altex
```

### 3. Test AkzoNobel Format

Upload: `AN022478_-_FR_Coatings_Ltd_-_Dio_-_Interchar_3120_-_30_&_60_Minute_FRR_Options.pdf`

Expected result:
```
✅ 22 items extracted (11 from 60min + 11 from 30min)
✅ Reference: AN022478-Rev 01-Option 01
✅ Project: Diocesan Shrewsbury Block Redevelopment
✅ Coating: Interchar 3120
✅ Supplier: AkzoNobel
✅ Format: akzonobel
✅ DFT conversions: 5.045mm → 5045µm, 2.362mm → 2362µm
✅ FRR conversions: R60 → 60min, R30 → 30min
```

## What Each Parser Does

### Altex Parser
- **Detects**: "Altex Coatings Limited", "Nullifire", "P.O. Box 142"
- **Extracts**:
  - Section sizes: 360UB45, 460UB75, 16mmPlate
  - FRR from header OR rows: 30, 60, 90, 120 minutes
  - DFT in microns: 225, 312
  - Schedule reference: CST-250911A format
  - Coating system: Nullifire SC601

### AkzoNobel Parser
- **Detects**: "Client Schedule", "Protective Coatings", "Parts List", "Hazard Rating"
- **Extracts**:
  - Members: "AU SHS 89x89x6.0" → "SHS 89x89x6.0"
  - Hazard rating: "R60" → 60 minutes, "R30" → 30 minutes
  - DFT conversion: 5.045mm → 5045 microns
  - Reference: AN022478-Rev 01 format
  - Coating system: Interchar 3120
  - Handles both 60min and 30min FRR sections

## Troubleshooting

### "No structural members detected"

**For Altex**:
- Ensure section sizes are present (UB, UC, SHS, RHS, Plate)
- Check if PDF is text-based (not scanned)
- Verify FRR is in header or rows

**For AkzoNobel**:
- Check "Parts List" table exists
- Verify "Member" column is present
- Check "Hazard Rating" has R60/R30 values
- Ensure DFT column has numeric values

### Parser Not Updating

**Solution**: Clear Render build cache
1. Render Dashboard → Your service
2. Settings → "Clear build cache & deploy"
3. Wait for fresh build (~3-5 minutes)

### Wrong Format Detected

Check the error message - it will show:
- `document_format: "akzonobel"` or `"altex"` or `"generic"`

If wrong:
- AkzoNobel needs 2+ markers: "client schedule", "protective coatings", "parts list"
- Altex needs 2+ markers: "altex coatings", "nullifire", "tauranga"

## File Locations

```
python-parser/
├── parser.py          ← UPDATED (both parsers)
├── main.py            ← Unchanged (FastAPI server)
├── requirements.txt   ← Unchanged (dependencies)
└── README.md          ← Documentation
```

## Documentation

**Detailed guides available:**
- `PARSER_DEPLOYMENT_GUIDE.md` - Full deployment instructions
- `AKZONOBEL_PARSER_IMPLEMENTATION.md` - AkzoNobel parser details
- `ALTEX_PARSER_UPDATE_COMPLETE.md` - Altex parser improvements

## Support

If issues persist:
1. Check Render service logs for Python errors
2. Verify PDF is text-based (can you select text?)
3. Test with sample files provided
4. Check error message for specific guidance

---

**Status**: ✅ Ready to deploy

Deploy the parser to Render and both Altex and AkzoNobel loading schedules will work automatically!
