# Complete Workflow Guide - Fire Protection Inspection System

**Version:** 2.0
**Last Updated:** February 24, 2026
**Status:** Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Quick Start Guide](#quick-start-guide)
3. [Detailed Workflow Steps](#detailed-workflow-steps)
4. [Common Use Cases](#common-use-cases)
5. [Troubleshooting](#troubleshooting)
6. [Technical Reference](#technical-reference)

---

## System Overview

### What This System Does

This is a comprehensive fire protection inspection management system that helps you:
- Import and manage structural fire protection loading schedules
- Track steel members requiring fire protection
- Conduct on-site inspections with mobile access
- Record DFT (Dry Film Thickness) measurements
- Generate professional inspection reports
- Manage non-conformance reports (NCRs)
- Maintain complete audit trails

### Key Features

- **Multi-format Import**: CSV, XLSX, and PDF loading schedules
- **Automated Member Registration**: Extract members from schedules automatically
- **Spatial Management**: Organize by blocks, levels, and drawing locations
- **Mobile Site Mode**: Field inspection on tablets/phones
- **Report Generation**: Professional PDFs with photos and data
- **Role-based Access**: Admin, Inspector, and Viewer roles

---

## Quick Start Guide

### New Project Setup (5 Minutes)

Follow these steps to set up a new project from scratch:

#### Step 1: Create Project (1 min)
1. Log in to the system
2. Click **"Projects"** in sidebar
3. Click **"+ Create Project"** button
4. Fill in:
   - **Project Name**: e.g., "City Tower Commercial Development"
   - **Client**: Select or create new client
   - **Project Reference**: e.g., "CT-2026-001"
   - **Location**: Full address
   - **Contractor**: Main contractor name
5. Click **"Create"**

#### Step 2: Upload Documents (2 min)
1. Open your new project
2. Go to **"Documents"** tab
3. Click **"Upload Document"**
4. Select document type and upload:
   - Structural drawings (PDF)
   - Fire protection schedules
   - Any reference documents

#### Step 3: Import Loading Schedule (2 min)
1. Go to **"Loading Schedule"** tab
2. Click **"📤 Upload Loading Schedule"**
3. Select your file (CSV recommended for best results)
4. Wait for parsing to complete
5. Review extracted items
6. Click **"✅ Approve & Create Member Register"**

**You're now ready to start inspections!**

---

## Detailed Workflow Steps

### Workflow Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Project Lifecycle                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Project Setup          [5 min]                      │
│     └─ Create project                                   │
│     └─ Upload documents                                 │
│                                                          │
│  2. Data Import            [10 min]                     │
│     └─ Upload loading schedule                          │
│     └─ Review & approve items                           │
│     └─ Create member register                           │
│                                                          │
│  3. Spatial Configuration  [30 min]                     │
│     └─ Create blocks & levels                           │
│     └─ Upload drawings                                  │
│     └─ Pin members to locations                         │
│                                                          │
│  4. Field Inspections      [Ongoing]                    │
│     └─ Use Site Mode on tablet                          │
│     └─ Record DFT readings                              │
│     └─ Capture photos                                   │
│     └─ Create NCRs if needed                            │
│                                                          │
│  5. Report Generation      [10 min]                     │
│     └─ Review all data                                  │
│     └─ Generate reports                                 │
│     └─ Export to PDF                                    │
│                                                          │
│  6. Project Closeout       [5 min]                      │
│     └─ Final approval                                   │
│     └─ Archive project                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## STEP 1: Project Setup

### Create New Project

**Location:** Dashboard → Projects → Create Project

**Required Information:**
- Project Name
- Client (select existing or create new)
- Project Reference Number
- Location/Address
- Main Contractor
- Start Date

**Optional Information:**
- Project Manager
- Site Contact
- Contract Value
- Expected Completion Date

**Best Practices:**
- Use clear, descriptive project names
- Include location in project name for easy identification
- Use consistent reference number format (e.g., YEAR-CLIENT-NUMBER)

### Initial Document Upload

**Location:** Project → Documents Tab

**What to Upload:**
1. **Drawings** (Type: Drawing)
   - Structural plans
   - Architectural drawings
   - Fire protection layouts

2. **Schedules** (Type: Fire Schedule / Steel Schedule)
   - Fire protection loading schedule
   - Steel member schedule
   - Any specification sheets

3. **Reference Documents** (Type: Other)
   - Contract documents
   - Specifications
   - Approved product data sheets (PDS)

**File Format Support:**
- PDF (recommended for drawings)
- CSV (recommended for schedules)
- XLSX (Excel spreadsheets)
- Images (JPG, PNG for reference photos)

**Upload Process:**
1. Select document type from dropdown
2. Click "Choose file" button
3. Select file from your computer
4. File uploads automatically
5. Appears in documents list immediately

---

## STEP 2: Loading Schedule Import & Member Registration

### Understanding Loading Schedules

A loading schedule contains the engineering data for fire protection:
- **Member marks** (e.g., B10, C5, COL-A1)
- **Section sizes** (e.g., 610UB125, 310UC97, 200x200SHS)
- **FRR requirements** (Fire Resistance Rating: 60, 90, 120 minutes)
- **Coating products** (e.g., Nullifire SC601, Isolatek DC/F)
- **Required DFT** (Dry Film Thickness in microns)

### Import Process

**Location:** Project → Loading Schedule Tab

#### Option A: CSV Import (Recommended - Most Reliable)

**CSV Format Example:**
```csv
member_mark,section,frr_minutes,coating_product,dft_required_microns,element_type,level,block
B10,610UB125,90,SC601,425,beam,L2,A
B11,310UC97,60,SC601,325,beam,L2,A
C5,200x200SHS,120,SC601,550,column,L1,B
```

**Required Columns:**
- `section` or `section_size` - Steel section (MUST HAVE)
- `frr_minutes` or `frr` - Fire resistance rating (MUST HAVE)

**Optional Columns:**
- `member_mark` - Member identifier
- `coating_product` or `product` - Product name
- `dft_required_microns` or `dft` - Required thickness
- `element_type` or `type` - beam/column/brace
- `level` - Floor level
- `block` - Building block

**Steps:**
1. Go to Loading Schedule tab
2. Click "📤 Upload Loading Schedule"
3. Select your CSV file
4. System parses file immediately
5. Review extracted items table

#### Option B: Excel/XLSX Import

**Requirements:**
- First row must be headers
- Column names should match CSV format above
- Avoid merged cells
- Keep data clean (no extra formatting)

**Steps:**
1. Upload XLSX file
2. Edge Function processes file
3. Parsing takes 10-30 seconds
4. Review extracted data

#### Option C: PDF Import (Requires Python Parser)

**Limitations:**
- Requires external Python parser service
- Results may need manual review
- Best for simple table-based PDFs

**Process:**
1. Upload PDF file
2. System sends to Python parser
3. Parser extracts tables and data
4. Returns structured JSON
5. High confidence items auto-approved
6. Low confidence items flagged for review

### Review Extracted Items

**Item Status Indicators:**
- ✓ **Green checkmark**: High confidence, ready to approve
- ⚠ **Warning icon**: Needs manual review
- ❌ **Error icon**: Failed to parse, requires correction

**Review Checklist:**
- [ ] Section sizes are correct format
- [ ] FRR values are valid (60, 90, 120, etc.)
- [ ] Member marks are unique
- [ ] DFT values are reasonable (typically 300-800 microns)
- [ ] Product names are spelled correctly

**Editing Items:**
1. Click pencil icon on any row
2. Edit the fields
3. Click "Save" or press Enter
4. Item confidence updated

### Create Member Register

**When you're ready:**
1. Review summary: "Extracted Items (47) - 12 items need review"
2. Edit any items with warnings
3. Click **"✅ Approve & Create Member Register"**

**What Happens:**
- System calls Edge Function `sync-members-from-loading-schedule`
- Creates member records in database
- Links to loading schedule items
- Populates:
  - Member mark
  - Section size
  - FRR requirement
  - Coating system
  - Required DFT
  - Element type
  - Block/Level (if provided)

**Result:**
- Members appear in "Member Register" tab
- Ready for location assignment
- Ready for inspections

---

## STEP 3: Spatial Configuration (Site Manager)

### Understanding Spatial Hierarchy

```
Project
  └─ Block A (Building Section)
      ├─ Ground Floor (Level)
      │   ├─ Drawing 1 (PDF Page 1)
      │   │   ├─ Pin 1 → Member B10
      │   │   └─ Pin 2 → Member B11
      │   └─ Drawing 2 (PDF Page 2)
      │       └─ Pin 3 → Member C5
      └─ Level 1 (Floor)
          └─ Drawing 3
              └─ Pin 4 → Member B12
```

### Create Blocks & Levels

**Location:** Project → Documents Tab → Project Structure Section

#### Create Your First Block

1. Click **"Create Block & Levels"**
2. Enter block information:
   - **Block Name**: e.g., "Block A", "East Wing", "Tower 1"
   - **Description**: Optional details
3. Define levels (floors):
   - **Number of levels**: e.g., 5
   - **Level names**: Auto-generated or custom
     - Auto: "Ground Floor", "Level 1", "Level 2"...
     - Custom: "Basement", "Lobby", "Mezzanine"...
4. Click **"Create"**

**Example Block Structure:**

**Block A - Main Tower:**
- Ground Floor
- Level 1
- Level 2
- Level 3
- Roof

**Block B - Annex:**
- Ground Floor
- Level 1

### Upload Drawings to Site Manager

**Location:** Project → Site Manager Tab

**Process:**
1. Select a Block → Level from left panel
2. Click **"📤 Upload Drawing"**
3. Select PDF file (can be multi-page)
4. System:
   - Uploads to storage
   - Creates drawing records per page
   - Links to selected level
   - Generates preview images

**Drawing Types:**
- Structural plans
- Floor layouts
- Section views
- Detail drawings

### Add Pins to Drawings

**What are Pins?**
- Visual markers on drawings
- Link members to physical locations
- Can attach photos
- Support multiple types (inspection, NCR, reference)

**Adding a Pin:**
1. Open a drawing in Site Manager
2. Click location on drawing
3. Fill in pin details:
   - **Member**: Select from dropdown
   - **Pin Type**: Inspection / NCR / Reference
   - **Label**: Display text
   - **Notes**: Additional info
4. Click **"Add Pin"**

**Pin Types:**
- 📍 **Inspection**: Regular inspection point
- ⚠️ **NCR**: Non-conformance location
- ℹ️ **Reference**: Reference marker

**Pin Features:**
- Drag to reposition
- Click to view/edit details
- Attach multiple photos
- Link to inspection records
- Export in reports

---

## STEP 4: Member Register Management

### Understanding the Member Register

**Location:** Project → Member Register Tab

**What You See:**
- Complete list of all structural members
- Status indicators
- Location assignments
- Inspection history
- Action buttons

### Member Information

Each member record contains:

**Identification:**
- Member Mark (e.g., B10)
- Element Type (beam/column/brace)
- Section Size (e.g., 610UB125)

**Location:**
- Block (e.g., Block A)
- Level (e.g., Level 2)
- Grid Reference

**Fire Protection:**
- FRR Required (minutes)
- Coating System/Product
- Required DFT (microns)

**Status Tracking:**
- Not Started (gray)
- In Progress (blue)
- Pass (green)
- Repair Required (red)
- Closed (dark)

### Managing Members

#### Add Member Manually

1. Click **"+ Add Member"**
2. Fill in form:
   - Member Mark (required)
   - Element Type (required)
   - Section Size (required)
   - Location details
   - FRR requirements
   - Coating information
3. Click **"Save"**

#### Import Members from CSV

1. Click **"📤 Import CSV"**
2. Select CSV file with format:
```csv
member_mark,element_type,section,level,block,frr_minutes,coating_system,required_dft_microns
B10,beam,610UB125,L2,A,90,SC601,425
```
3. Review import preview
4. Click **"Confirm Import"**

#### Edit Member

1. Click pencil icon on member row
2. Update any fields
3. Click **"Save"**

#### Delete Member

1. Click trash icon
2. Confirm deletion
3. Member and linked data removed

#### Export Members

1. Click **"📥 Export CSV"**
2. File downloads with all member data
3. Open in Excel/Google Sheets

### Bulk Operations

**Select Multiple Members:**
1. Check checkbox on left of each row
2. Or click "Select All" checkbox in header

**Bulk Actions Available:**
- Update status
- Assign to block/level
- Delete multiple
- Export selected

---

## STEP 5: Inspections

### Inspection Types

**DFT Inspection** (Most Common):
- Measure dry film thickness
- Record 100+ readings per member
- Calculate statistics
- Determine pass/fail

**Visual Inspection:**
- Surface condition
- Application quality
- Damage assessment
- Photo documentation

**NCR Inspection:**
- Non-conformance identified
- Corrective action required
- Follow-up tracking

### Creating an Inspection

**Location:** Project → Inspections Tab

**Method 1: From Inspections Tab**

1. Click **"+ Create Inspection"**
2. Select member
3. Fill in inspection details:
   - **Inspector**: Auto-filled from login
   - **Date/Time**: Auto-filled (can edit)
   - **Location**: Auto-filled from member
   - **Appearance**: dropdown or text
   - **Result**: Pass/Fail/Pending
4. Add DFT readings (see below)
5. Attach photos
6. Add comments
7. Click **"Save"**

**Method 2: From Site Mode (Recommended for Field Work)**

1. Click **"Site Mode"** button
2. Navigate to pin location
3. Tap pin
4. Select **"Create Inspection"**
5. Record data on mobile device
6. Photos auto-attach to pin
7. Submit when complete

### Recording DFT Readings

**Manual Entry:**
1. In inspection form, scroll to DFT section
2. Enter readings one by one
3. System calculates statistics automatically

**Batch Entry:**
1. Click **"Batch Input"**
2. Paste comma-separated values
3. Or upload CSV file with readings

**Simulation Mode** (for testing/demo):
1. Enable "Simulation Mode"
2. Set parameters:
   - Required thickness: 425
   - Lowest value: 400
   - Highest value: 550
   - Number of readings: 100
3. Click **"Generate"**
4. System creates realistic test data

**Readings Display:**
- Table view with all values
- Statistics panel:
  - Min, Max, Average
  - Standard deviation
  - Pass/Fail percentage
  - Overall result
- Chart view (optional)

### Inspection Status Workflow

```
Not Started → In Progress → Pass/Fail → Approved → Closed
```

**Status Meanings:**
- **Not Started**: No inspection created yet
- **In Progress**: Inspection ongoing, data being collected
- **Pass**: DFT meets requirements
- **Fail**: DFT below requirements, repair needed
- **Repair Required**: Remedial work in progress
- **Approved**: QA review complete
- **Closed**: Final status, archived

### Photo Documentation

**Best Practices:**
- Take "before" photos
- Capture overall view
- Detail shots of issues
- "After" photos for repairs
- Include measurement device in frame

**Attaching Photos:**
1. In inspection form, click "📷 Add Photo"
2. Select from:
   - Take photo (mobile)
   - Upload from device
   - Select from project photos
3. Add caption/description
4. Photos auto-embed in reports

---

## STEP 6: Non-Conformance Reports (NCRs)

### When to Create an NCR

Create an NCR when you find:
- DFT below specification
- Surface contamination
- Damage to coating
- Incorrect product applied
- Application defects
- Missing fire protection

### Creating an NCR

**Location:** Project → NCRs Tab

1. Click **"+ Create NCR"**
2. Fill in NCR form:
   - **NCR Number**: Auto-generated (e.g., NCR-001)
   - **Member/Location**: Select affected member
   - **Issue Type**: Select from dropdown
     - Insufficient DFT
     - Surface contamination
     - Damage
     - Wrong product
     - Other
   - **Description**: Detailed issue description
   - **Severity**: Minor / Major / Critical
   - **Raised By**: Auto-filled
   - **Date Raised**: Auto-filled
3. Attach photos
4. Click **"Create"**

### NCR Workflow

```
Raised → Acknowledged → Corrective Action → Verification → Closed
```

**Status Updates:**
1. **Raised**: NCR created, contractor notified
2. **Acknowledged**: Contractor confirms receipt
3. **Corrective Action**: Repair work in progress
4. **Verification**: Re-inspection scheduled
5. **Closed**: Issue resolved, verified, approved

### NCR Management

**Tracking:**
- All NCRs listed in NCRs tab
- Filter by status, severity, date
- Sort by any column
- Export to CSV/PDF

**Notifications:**
- Email alerts (if configured)
- Dashboard notifications
- Status change updates

**Closeout Requirements:**
- Re-inspection report
- Before/after photos
- Updated DFT readings
- Approval signature

---

## STEP 7: Report Generation

### Available Reports

**1. Complete Inspection Report**
- Full project overview
- All members and inspections
- Photos and drawings
- Statistics and summaries
- Appendices with detailed data

**2. Executive Summary**
- High-level overview
- Key statistics
- Pass/fail summary
- Critical issues only
- Ideal for management

**3. Introduction Section**
- Project details
- Scope of work
- Standards referenced
- Methodology
- Quality plan

**4. Member-Specific Reports**
- Single member detail
- All readings
- Photos
- Location drawings
- History

**5. NCR Report**
- All non-conformances
- Status tracking
- Corrective actions
- Photo evidence

### Generating Reports

**Location:** Project → Exports Tab

**Process:**
1. Select report type
2. Choose options:
   - Date range
   - Include photos (yes/no)
   - Include drawings (yes/no)
   - Members to include (all or selected)
   - Appendices to include
3. Click **"Generate PDF"**
4. System compiles report (may take 30-60 seconds)
5. PDF downloads automatically
6. Saved to project export attachments

### Report Customization

**Company Branding:**
- Go to Settings → Organization
- Upload company logo
- Set company details:
  - Name
  - Address
  - Contact info
  - Certifications
- All reports auto-include branding

**Report Templates:**
- Go to Settings → Report Templates
- Create custom templates
- Define sections to include
- Set default options
- Save for reuse

### Export Attachments

**Purpose:**
- Include additional documents in reports
- Add certifications
- Include calibration records
- Attach product data sheets

**Adding Attachments:**
1. Go to Export Attachments tab
2. Click **"+ Add Attachment"**
3. Fill in details:
   - **Title**: Document name
   - **Category**: Certification / Calibration / PDS / Other
   - **Appendix Letter**: A, B, C, etc.
   - **Include in Report**: Yes/No
4. Upload file or select from documents
5. Click **"Save"**

**Attachment Categories:**
- **Appendix A**: Material certifications
- **Appendix B**: Calibration certificates
- **Appendix C**: Product data sheets
- **Appendix D**: Test reports
- **Appendix E**: Environmental records

---

## STEP 8: Site Mode (Mobile Field Use)

### What is Site Mode?

Site Mode is a simplified, mobile-optimized interface for field inspections:
- Touch-friendly large buttons
- Offline capability (future)
- Quick photo capture
- Easy member selection
- Fast data entry

### Accessing Site Mode

1. Open project
2. Click **"📱 Site Mode"** button (top right)
3. Interface switches to mobile view
4. Use on tablet or phone

### Site Mode Features

**Drawings View:**
- Visual floor plans
- Tap pins to inspect
- Zoom and pan
- Quick photo attachment

**Pins List:**
- All inspection points
- Filter by status
- Search by member
- Sort by location

**Inspection Packages:**
- Group related inspections
- Day-by-day organization
- Batch operations
- Progress tracking

**Pin Inspection:**
- Simplified inspection form
- Voice input support
- Quick photo capture
- Offline queue (future)

### Mobile Best Practices

**Before Going to Site:**
- [ ] Sync all project data
- [ ] Download drawings
- [ ] Charge device fully
- [ ] Test camera
- [ ] Check storage space

**During Inspection:**
- Take photos before measurements
- Record readings immediately
- Add notes while fresh
- Mark pins as inspected

**After Site Visit:**
- Upload all data
- Review photos for quality
- Complete any missing fields
- Submit for approval

---

## Common Use Cases

### Use Case 1: New Project from Scratch

**Scenario:** You've won a contract for a new building inspection.

**Steps:**
1. Create project (5 min)
2. Upload structural drawings (10 min)
3. Upload loading schedule CSV (2 min)
4. Approve and create members (1 min)
5. Create blocks and levels (15 min)
6. Upload drawings to site manager (20 min)
7. Pin members to locations (45 min)
8. Start inspections (ongoing)

**Total Setup Time:** ~2 hours

**Result:** Fully configured project ready for field work

---

### Use Case 2: Quick Schedule Import Only

**Scenario:** You only need to import a loading schedule and create member list.

**Steps:**
1. Create project
2. Go directly to Loading Schedule tab
3. Upload CSV
4. Approve items
5. Export member list

**Time:** 10 minutes

**Result:** Member register ready for external use

---

### Use Case 3: Inspection-Only Project

**Scenario:** Members already known, just need to record inspections.

**Steps:**
1. Create project
2. Import member CSV directly
3. Start creating inspections
4. Record DFT readings
5. Generate report

**Time:** 5 minutes setup + inspection time

**Result:** Fast inspection tracking

---

### Use Case 4: Report Generation from Existing Data

**Scenario:** All inspections complete, need final reports.

**Steps:**
1. Review all inspection statuses
2. Add export attachments (certs, calibrations)
3. Go to Exports tab
4. Configure report options
5. Generate PDF

**Time:** 15 minutes

**Result:** Professional report ready for client

---

## Troubleshooting

### Common Issues & Solutions

#### "Engineering Data Unavailable" on Loading Schedule Tab

**Problem:** Loading Schedule tab shows blocking message

**Solution:**
- This has been fixed in latest update
- Refresh your browser (Ctrl+F5 or Cmd+Shift+R)
- Loading Schedule should now be accessible immediately

---

#### No Documents Showing in Documents Tab

**Problem:** Uploaded documents don't appear

**Possible Causes:**
1. User profile not loaded
2. Permission issue
3. Documents belong to different project

**Solution:**
- Check you have admin or inspector role
- Look for yellow warning banner showing your role
- Refresh page to reload profile
- Contact admin to verify role assignment

---

#### Loading Schedule Parse Failed

**Problem:** Upload completes but shows error

**Common Errors:**
- `NO_STRUCTURAL_ROWS_DETECTED`: No valid data found
- `PYTHON_PARSER_NOT_DEPLOYED`: PDF parser unavailable
- `INVALID_FILE_FORMAT`: Unsupported file type

**Solutions:**
- **No valid data**: Ensure file has section sizes and FRR values
- **Parser unavailable**: Use CSV format instead
- **Invalid format**: Convert to CSV/XLSX

---

#### Member Register Empty After Import

**Problem:** Loading schedule imported but no members created

**Cause:** Forgot to click "Approve & Create Member Register"

**Solution:**
1. Go back to Loading Schedule tab
2. Review extracted items
3. Click **"✅ Approve & Create Member Register"**
4. Check Member Register tab

---

#### Can't Add Pins to Drawings

**Problem:** Click on drawing but nothing happens

**Possible Causes:**
1. Drawing not fully loaded
2. No members available to link
3. JavaScript error

**Solutions:**
- Wait for drawing to fully render
- Ensure members exist in Member Register
- Check browser console for errors (F12)
- Try different browser

---

#### Photos Not Uploading

**Problem:** Photo upload fails or hangs

**Causes:**
- File too large (>10MB)
- Unsupported format
- Network issue
- Storage quota exceeded

**Solutions:**
- Compress large images
- Use JPG or PNG format
- Check internet connection
- Contact admin about storage quota

---

#### Report Generation Failed

**Problem:** PDF generation errors or incomplete

**Common Issues:**
- Too many photos (timeout)
- Missing data references
- Insufficient permissions

**Solutions:**
- Generate report with fewer photos
- Verify all data is valid
- Try generating sections separately
- Check browser console for errors

---

### Getting Help

**Technical Support:**
- Email: support@optimalfire.co.nz
- Phone: (Your support number)

**Documentation:**
- User guides: `/docs` folder
- Video tutorials: (Your video link)
- FAQ: (Your FAQ link)

**Reporting Bugs:**
- Provide screenshot
- Describe steps to reproduce
- Note browser and OS
- Check console for errors (F12)

---

## Technical Reference

### Database Schema Summary

**Core Tables:**
- `projects` - Project master data
- `clients` - Client information
- `members` - Structural members registry
- `inspections` - Inspection records
- `dft_readings` - DFT measurement data

**Document Tables:**
- `documents` - File uploads
- `loading_schedule_imports` - Import tracking
- `loading_schedule_items` - Parsed schedule data

**Spatial Tables:**
- `blocks` - Building sections
- `levels` - Floor levels
- `drawings` - Drawing references
- `drawing_pins` - Location markers

**Support Tables:**
- `ncrs` - Non-conformance reports
- `export_attachments` - Report appendices
- `fire_protection_materials` - Product master data
- `steel_members_library` - Section size library

### API Endpoints

**Edge Functions:**
- `parse-loading-schedule` - Parse XLSX/PDF files
- `sync-members-from-loading-schedule` - Create members from import
- `parse-pdf` - Generic PDF parsing

**RPC Functions:**
- `calculate_project_workflow_state` - Workflow status
- `get_workflow_blocking_reasons` - Tab blocking logic
- `get_introduction_data` - Report introduction data
- `get_executive_summary_aggregate` - Summary statistics

### File Storage

**Buckets:**
- `documents` - All project documents
- `photos` - Inspection photos
- `drawings` - Drawing files
- `parsing-artifacts` - Parser intermediate files

**Naming Conventions:**
- Documents: `{project_id}/{timestamp}-{filename}`
- Photos: `photos/{pin_id}/{timestamp}-{filename}`
- Drawings: `drawings/{project_id}/{level_id}/{filename}`

### User Roles & Permissions

**Admin:**
- Full system access
- Create/edit/delete all data
- Manage users
- Configure system settings
- Generate reports
- Approve inspections

**Inspector:**
- Create/edit inspections
- Record measurements
- Upload photos
- Create NCRs
- Generate reports
- Cannot manage users

**Viewer:**
- Read-only access
- View all data
- View reports
- Cannot edit
- Cannot upload

### Security Features

**Row Level Security (RLS):**
- All tables protected
- Users see only their projects
- Automatic user context
- No SQL injection possible

**Authentication:**
- Email/password login
- Session management
- Automatic timeout
- Secure password reset

**Data Protection:**
- Encrypted at rest
- Encrypted in transit (HTTPS)
- Regular backups
- Audit logging

---

## Best Practices Summary

### Project Management

✅ **DO:**
- Use clear, consistent naming
- Upload documents early
- Review imported data before approving
- Keep notes up to date
- Regular backups via export

❌ **DON'T:**
- Delete members with existing inspections
- Skip workflow steps
- Ignore warnings
- Forget to save changes
- Upload extremely large files

### Data Entry

✅ **DO:**
- Double-check section sizes
- Verify FRR requirements
- Use standard product names
- Add detailed notes
- Include photos for everything

❌ **DON'T:**
- Use special characters in member marks
- Leave required fields empty
- Copy/paste without reviewing
- Skip calibration records
- Mix measurement units

### Field Inspections

✅ **DO:**
- Use Site Mode on tablet
- Take photos before measuring
- Record readings immediately
- Mark location on drawings
- Review data same day

❌ **DON'T:**
- Rely on memory
- Skip photo documentation
- Work offline without sync
- Ignore outlier readings
- Rush through checklist

### Report Generation

✅ **DO:**
- Review all data first
- Include all required appendices
- Add company branding
- Proofread before sending
- Keep copies of final reports

❌ **DON'T:**
- Generate without review
- Forget certifications
- Omit critical photos
- Skip approval process
- Send draft reports

---

## Quick Reference Card

### Essential Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Save form | Ctrl+S | Cmd+S |
| Close modal | Esc | Esc |
| Refresh page | Ctrl+R | Cmd+R |
| Hard refresh | Ctrl+F5 | Cmd+Shift+R |
| Search | Ctrl+F | Cmd+F |
| Open dev tools | F12 | Cmd+Option+I |

### File Format Quick Guide

| Document Type | Best Format | Alternative | Max Size |
|--------------|-------------|-------------|----------|
| Loading Schedule | CSV | XLSX, PDF | 10 MB |
| Drawings | PDF | - | 50 MB |
| Photos | JPG | PNG | 10 MB |
| Reports | PDF | - | No limit |
| Data Export | CSV | XLSX | No limit |

### Status Color Guide

| Color | Meaning | Action Required |
|-------|---------|----------------|
| 🟢 Green | Pass / Complete | None |
| 🔵 Blue | In Progress | Continue work |
| 🟡 Yellow | Warning / Review | Check data |
| 🔴 Red | Fail / Critical | Immediate action |
| ⚫ Gray | Not Started | Begin work |

---

## Support & Resources

### Training Resources

**Video Tutorials:**
1. Getting Started (10 min)
2. Loading Schedule Import (15 min)
3. Site Manager Setup (20 min)
4. Field Inspections (25 min)
5. Report Generation (15 min)

**Documentation:**
- This workflow guide
- Technical specification
- API reference
- Database schema

**Sample Files:**
- `sample_loading_schedule.csv` - Example CSV format
- `sample_members_import.csv` - Member import template

### Contact Information

**Technical Support:**
- Email: support@optimalfire.co.nz
- Phone: [Your phone]
- Hours: 8am-5pm NZST Mon-Fri

**Emergency Support:**
- After hours: [Emergency number]
- Critical issues only

### Version History

**v2.0** - February 24, 2026
- Fixed Loading Schedule workflow blocking
- Added user profile auto-creation
- Updated DocumentsTab column references
- Enhanced workflow guide

**v1.0** - February 16, 2026
- Initial release
- Full workflow implementation
- All core features complete

---

## Conclusion

This system provides a complete solution for fire protection inspection management, from data import through final reporting. Follow the workflow steps in order for best results, and don't hesitate to contact support if you encounter any issues.

**Remember:** The system is designed to make your work easier. If something seems too complicated or doesn't make sense, it's probably a bug or documentation issue - please let us know!

---

**Document Version:** 2.0
**Last Updated:** February 24, 2026
**Next Review:** Monthly
**Owner:** P&R Consulting Limited
**Status:** ✅ Production Ready
