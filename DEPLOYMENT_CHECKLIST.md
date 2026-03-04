# Deployment Checklist - Loading Schedule Parser Update

## Pre-Deployment Status

✅ **Altex Parser** - Fixed and enhanced
✅ **AkzoNobel Parser** - Implemented and tested
✅ **Auto-detection** - Both formats detected automatically
✅ **Build verification** - TypeScript compilation successful
✅ **Documentation** - Complete

## Your Action Items

### 1. Deploy Parser to Render

**Estimated time**: 5-10 minutes

**Steps**:
- [ ] Login to Render dashboard: https://dashboard.render.com
- [ ] Find your Python parser service (likely named "loading-schedule-parser" or similar)
- [ ] Click "Manual Deploy" → "Deploy latest commit"
- [ ] Wait for deployment to complete (~2-3 minutes)
- [ ] Check logs for "Build successful"

**Alternative** (if Git connected):
```bash
git add python-parser/parser.py
git commit -m "feat: Add AkzoNobel parser + improve Altex parser"
git push origin main
```

### 2. Verify Deployment

**Health check**:
- [ ] Run: `curl https://your-parser-service.onrender.com/health`
- [ ] Expect: `{"status": "healthy", "version": "2.0.0-sb-wf-support"}`

### 3. Test Altex Schedule

**File**: `CST-250911A_Scott_Point_Road_Interior_Enclosed_Steel_-_30_min_FRR_SC601.pdf`

- [ ] Upload to Loading Schedule page
- [ ] Verify: 7 items extracted
- [ ] Check: Schedule Reference = "CST-250911A"
- [ ] Check: Project name shown
- [ ] Check: Coating System = "NULLIFIRE SC601"
- [ ] Check: Supplier = "Altex Coatings Limited"

**Expected results**:
```
✅ 360UB45 (Beam, 30min FRR, 225µm DFT)
✅ 460UB75 (Beam, 30min FRR, 225µm DFT)
✅ 460UB67 (Beam, 30min FRR, 225µm DFT)
✅ 250UB31 (Beam, 30min FRR, 225µm DFT)
✅ 460UB67 (Beam, 30min FRR, 225µm DFT)
✅ 16mmPlate (Beam, 30min FRR, 225µm DFT)
✅ 32mmPlate (Beam, 30min FRR, 225µm DFT)
```

### 4. Test AkzoNobel Schedule

**File**: `AN022478_-_FR_Coatings_Ltd_-_Dio_-_Interchar_3120_-_30_&_60_Minute_FRR_Options.pdf`

- [ ] Upload to Loading Schedule page
- [ ] Verify: 22 items extracted (11 from 60min + 11 from 30min)
- [ ] Check: Reference = "AN022478-Rev 01-Option 01"
- [ ] Check: Project = "Diocesan Shrewsbury Block Redevelopment"
- [ ] Check: Coating System = "Interchar 3120"
- [ ] Check: Supplier = "AkzoNobel"
- [ ] Check: DFT values converted: 5045µm, 2362µm, 1999µm, etc.
- [ ] Check: FRR values: 60min for first section, 30min for second section

**Expected sample results**:
```
✅ SHS 89x89x6.0 (60min FRR, 5045µm DFT) [from "AU SHS 89x89x6.0"]
✅ CHS 324x12.7 (60min FRR, 2362µm DFT) [from "AU CHS 324x12.7"]
✅ PFC 300 (60min FRR, 1999µm DFT) [from "AU PFC 300"]
✅ RHS 250x150x9.0 (60min FRR, 3300µm DFT) [from "AU RHS 250x150x9.0"]
✅ 250UB37.3 (60min FRR, 858µm DFT) [from "AU 250UB37.3"]
✅ Plate 1000x10 (60min FRR, 908µm DFT)
... + 16 more items
```

## Troubleshooting

### Problem: Old error message still showing

**Symptom**: "No structural members detected" for Altex schedule

**Cause**: Parser not deployed yet or cached old version

**Solution**:
1. [ ] Render Dashboard → Your service
2. [ ] "Settings" → "Clear build cache & deploy"
3. [ ] Wait 3-5 minutes for fresh build
4. [ ] Re-test upload

### Problem: AkzoNobel schedule not parsing

**Symptom**: "No structural members detected" for AkzoNobel

**Check 1**: Is PDF text-based?
- [ ] Open PDF in viewer
- [ ] Try to select text with cursor
- [ ] If can't select → PDF is scanned (not supported)

**Check 2**: Is parser deployed?
- [ ] Verify deployment status in Render
- [ ] Check logs for errors
- [ ] Try "Clear build cache & deploy"

**Check 3**: Is format detected?
- [ ] Look at error message
- [ ] Should show: `document_format: "akzonobel"`
- [ ] If shows "generic" → detection failed (rare)

### Problem: Wrong DFT values

**Symptom**: DFT shows 5.045 instead of 5045 for AkzoNobel

**Cause**: Parser not deployed or conversion not working

**Solution**:
- [ ] Verify parser deployed successfully
- [ ] Check Render logs for Python errors
- [ ] Re-deploy with cache clear

## Success Indicators

✅ **Deployment successful if**:
- Both sample PDFs upload without errors
- Correct number of items extracted (7 for Altex, 22 for AkzoNobel)
- Metadata fields populated correctly
- DFT values in microns (not mm) for AkzoNobel
- FRR values in minutes (not R-format) for AkzoNobel
- Member names normalized (no "AU" prefix) for AkzoNobel

## Quick Reference

**Render Dashboard**: https://dashboard.render.com
**Parser Service**: Look for "loading-schedule-parser" or similar name
**Health Endpoint**: `https://your-service.onrender.com/health`
**Parse Endpoint**: `https://your-service.onrender.com/parse-loading-schedule`

**Documentation Files**:
- `QUICK_START_PARSER_DEPLOYMENT.md` - Quick start guide
- `PARSER_DEPLOYMENT_GUIDE.md` - Detailed deployment
- `AKZONOBEL_PARSER_IMPLEMENTATION.md` - Technical details
- `PARSER_UPDATE_SUMMARY.md` - What changed

**Sample Files**:
- Altex: `CST-250911A_Scott_Point_Road...pdf`
- AkzoNobel: `AN022478_-_FR_Coatings_Ltd...pdf`

## Timeline

1. **Deploy to Render** - 5 minutes
2. **Wait for build** - 2-3 minutes
3. **Test Altex** - 2 minutes
4. **Test AkzoNobel** - 2 minutes

**Total estimated time**: 10-15 minutes

## After Successful Deployment

✅ You can now parse:
- **Altex Coatings** loading schedules (Nullifire SC601, etc.)
- **AkzoNobel / International Paint** schedules (Interchar 3120, etc.)
- **Generic** loading schedules (Jotun, PPG, etc. using generic parser)

✅ The parser automatically:
- Detects which format the PDF is using
- Routes to the correct parser
- Extracts metadata (project, reference, coating, supplier)
- Converts units (mm → microns for AkzoNobel)
- Normalizes member names (removes prefixes)
- Converts FRR ratings (R60 → 60 minutes)

## Support

If you encounter issues:
1. Check Render service logs for specific errors
2. Review documentation files listed above
3. Verify PDF files are text-based (not scanned)
4. Test with provided sample files first

---

**Current Status**: ⏳ Awaiting deployment to Render

**Next Step**: Deploy parser to Render (Step 1 above)

Once deployed, both Altex and AkzoNobel loading schedules will parse automatically! 🎉
