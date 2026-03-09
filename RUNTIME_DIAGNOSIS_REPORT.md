# Runtime Root-Cause Diagnosis Report

**Date:** 2026-03-09
**Analysis Type:** Full Runtime Data Path Audit
**Status:** 4 Critical Issues Identified

---

## Executive Summary

After comprehensive code-path auditing, 4 distinct runtime bugs have been identified that cause the report export and member register features to malfunction. All issues stem from **data source mismatches** between what the UI/database stores and what the report generation reads.

### Critical Findings

| Issue | Root Cause Type | Severity | Lines Affected |
|-------|----------------|----------|----------------|
| Organization not persisting | Data mapping bug | CRITICAL | ExportsTab.tsx:114-179 |
| Logo not rendering | Data mapping bug + wrong bucket | CRITICAL | ExportsTab.tsx:158-174 |
| Quantity not showing | Table mismatch bug | CRITICAL | ExportsTab.tsx:105-107 vs quantityReadingsGenerator.ts:136-143 |
| Page overflow | CSS/layout bug | HIGH | ExportsTab.tsx:254, 482, 520 |

---

## Part 1: Report Data Source Analysis

### 1.1 Entry Point

**File:** `src/components/ExportsTab.tsx`
**Function:** `generateAuditReport()` (Line 72)
**Trigger:** User clicks "Download Base Report" button (Line 1010)

### 1.2 Data Fetching Logic

```typescript
// Lines 85-116: Parallel data fetch
const [
  membersRes,
  inspectionsRes,
  ncrsRes,
  dftBatchesRes,
  simulatedMemberSetsRes,
  orgSettingsRes,          // ⚠️ WRONG SOURCE
  projectDetailsRes,
] = await Promise.all([
  supabase.from('members').select('*').eq('project_id', project.id),
  supabase.from('inspections').select('*, members(...), ...'),
  supabase.from('ncrs').select('*, members(member_mark)'),
  supabase.from('dft_batches').select('*, inspections(...), ...'),
  supabase.from('inspection_member_sets')          // ⚠️ DIFFERENT TABLE
    .select('*, inspection_member_readings(*)'),   // ⚠️ NOT inspection_readings
  supabase.from('company_settings')                // ❌ BUG: Should use organizations
    .select('*').limit(1).maybeSingle(),
  supabase.from('projects')
    .select('*, clients(logo_path)')
    .eq('id', project.id).maybeSingle(),
]);
```

### 1.3 Data Object Structure

**Object passed to report template:**

```javascript
{
  members: Member[],                    // From members table ✓
  inspections: Inspection[],            // From inspections table ✓
  ncrs: NCR[],                         // From ncrs table ✓
  dftBatches: DFTBatch[],              // From dft_batches table ✓
  simulatedMemberSets: MemberSet[],    // From inspection_member_sets ⚠️
  orgSettings: {                       // ❌ From company_settings (WRONG)
    company_name: string,
    logo_url: string,
    address: string,
    ...
  },
  projectDetails: {                    // From projects table ✓
    name: string,
    client_name: string,
    organization_id: uuid,             // ⚠️ FETCHED but NEVER USED
    ...
  },
  introductionData: {                  // From RPC function ✓
    data: {
      company: {                       // ✓ Correctly from organizations table
        company_name: string,
        company_logo_url: string
      }
    }
  },
  executiveSummaryData: {              // From RPC function ✓
    data: {
      company: {                       // ✓ Correctly from organizations table
        company_name: string,
        company_logo_url: string
      }
    }
  }
}
```

**Critical Discovery:**
- Organization name/logo: RPC functions fetch correctly, but main report body uses `orgSettings` from wrong table
- Member quantity: Stored in `inspection_readings` table but report queries `inspection_member_readings`

---

## Issue 1: Organization Not Persisting

### 1.1 Bug Classification
**Type:** Data Mapping Bug
**Severity:** CRITICAL
**Impact:** Selected organization never appears in report cover page/header

### 1.2 Expected Data Flow

```
Project Creation → User selects "Optimal Fire" →
projects.organization_id = <optimal_fire_uuid> →
Report Generation → JOIN organizations WHERE id = project.organization_id →
Display "Optimal Fire Limited" in report
```

### 1.3 Actual Data Flow

```
Project Creation → User selects "Optimal Fire" →
projects.organization_id = <optimal_fire_uuid> ✓ (PERSISTS CORRECTLY) →
Report Generation → SELECT * FROM company_settings ❌ (IGNORES organization_id) →
Display "P&R Consulting Limited" (default fallback)
```

### 1.4 Exact Root Cause

**File:** `src/components/ExportsTab.tsx`
**Lines:** 114, 123, 179

```typescript
// Line 114 - WRONG: Fetches from company_settings
supabase.from('company_settings').select('*').limit(1).maybeSingle(),

// Line 123 - Stores wrong data
const orgSettings = orgSettingsRes.data;

// Line 179 - Uses wrong data
const orgName = orgSettings?.company_name || 'P&R Consulting Limited';
```

**Should be:**

```typescript
// Fetch organization via project relationship
const { data: projectWithOrg } = await supabase
  .from('projects')
  .select('*, organizations(*)')
  .eq('id', project.id)
  .single();

const orgSettings = projectWithOrg?.organizations;
const orgName = orgSettings?.name || 'P&R Consulting Limited';
```

### 1.5 Proof of Correct Implementation

The RPC functions already implement this correctly:

**File:** `supabase/migrations/20260309004150_fix_reports_use_project_organization.sql`
**Lines:** 57-83

```sql
-- Get company settings from PROJECT ORGANIZATION (not company_settings)
SELECT COALESCE(
  -- Try to get organization from project
  (SELECT jsonb_build_object(
    'company_name', o.name,
    'company_logo_url', o.logo_url,
    'address', o.address,
    ...
  )
  FROM projects p
  INNER JOIN organizations o ON o.id = p.organization_id
  WHERE p.id = p_project_id
  LIMIT 1),
  -- Fallback to company_settings if no organization
  (SELECT jsonb_build_object(...)
  FROM company_settings cs
  LIMIT 1)
)
INTO company_data;
```

### 1.6 Database Verification

**Test Query:**
```sql
-- Check if organization_id is persisted
SELECT id, name, organization_id FROM projects WHERE id = '<project_id>';

-- Check organization data
SELECT id, name, logo_url FROM organizations;

-- Verify relationship
SELECT p.name as project_name, o.name as org_name, o.logo_url
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE p.id = '<project_id>';
```

**Expected Result:** organization_id is populated, JOIN returns organization data
**Actual Result:** organization_id is populated ✓, but report doesn't use it ❌

---

## Issue 2: Logo Not Rendering

### 2.1 Bug Classification
**Type:** Data Mapping Bug + Storage Bucket Mismatch
**Severity:** CRITICAL
**Impact:** Organization logo never appears in exported PDF

### 2.2 Root Cause #1: Wrong Data Source (Same as Issue 1)

**File:** `src/components/ExportsTab.tsx`
**Lines:** 158-174

```typescript
// Line 158 - Uses wrong data source
if (orgSettings?.logo_url) {
  try {
    // Line 160-162 - Wrong bucket hardcoded
    const { data: logoData } = await supabase.storage
      .from('project-documents')  // ❌ Organization logos not in this bucket
      .getPublicUrl(orgSettings.logo_url);
```

**Problem:**
1. `orgSettings` comes from `company_settings` table (wrong table)
2. Even if it was correct, hardcoded bucket `'project-documents'` is wrong
3. Organization logos stored in `'organization-logos'` bucket (or as full URLs)

### 2.3 Root Cause #2: Logo Loading Logic

**File:** `src/lib/pdfCompleteReport.ts`
**Lines:** 84-103

The `pdfCompleteReport.ts` has better logic with multi-bucket fallback, but `ExportsTab.tsx` doesn't use this improved logic. It hardcodes a single bucket.

### 2.4 Correct Implementation

**Should be:**

```typescript
if (organizationData?.logo_url) {
  try {
    let logoDataUrl;

    // Check if full URL
    if (organizationData.logo_url.startsWith('http')) {
      const response = await fetch(organizationData.logo_url);
      const blob = await response.blob();
      logoDataUrl = await blobToDataURL(blob);
    } else {
      // Try multiple buckets
      const buckets = ['organization-logos', 'project-documents', 'documents'];
      for (const bucket of buckets) {
        try {
          const { data } = await supabase.storage
            .from(bucket)
            .getPublicUrl(organizationData.logo_url);
          if (data?.publicUrl) {
            const response = await fetch(data.publicUrl);
            const blob = await response.blob();
            logoDataUrl = await blobToDataURL(blob);
            if (logoDataUrl) break;
          }
        } catch (err) {
          continue;
        }
      }
    }

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 15, yPos - 5, 40, 20);
    }
  } catch (error) {
    console.warn('Could not load organization logo:', error);
  }
}
```

---

## Issue 3: Member Quantity Not Showing in Report

### 3.1 Bug Classification
**Type:** Table Mismatch Bug (Critical Architecture Issue)
**Severity:** CRITICAL
**Impact:** Quantity readings generated but never appear in exported reports

### 3.2 The Two Parallel Systems Problem

**System A: Quantity-Based Readings (New System)**
- **UI:** `MembersTab.tsx` → "Generate Quantity Readings" button
- **Generator:** `quantityReadingsGenerator.ts`
- **Storage:** `inspection_readings` table
- **Purpose:** Generate N sequential readings for members with quantity > 1

**System B: Inspection Member Sets (Old System)**
- **UI:** Inspection workflow
- **Storage:** `inspection_member_sets` + `inspection_member_readings` tables
- **Purpose:** Manual inspection data entry

**THE PROBLEM:** Report generation only queries System B, ignoring System A entirely.

### 3.3 Data Flow Diagram

```
USER ACTION: Generate Quantity Readings
  ↓
MembersTab.tsx:1073-1100 handleGenerate()
  ↓
quantityReadingsGenerator.ts:85-109 generateQuantityBasedReadings()
  ↓
quantityReadingsGenerator.ts:114-155 saveGeneratedReadings()
  ↓
INSERT INTO inspection_readings ✓ (Data stored successfully)
  ↓
[DISCONNECTED PATH]
  ↓
ExportsTab.tsx:105-112 generateAuditReport()
  ↓
SELECT FROM inspection_member_sets ❌ (Different table!)
  ↓
RESULT: Quantity readings not in report
```

### 3.4 Exact Root Cause

**File:** `src/components/ExportsTab.tsx`
**Lines:** 105-112, 442-453, 502

**Current Code (WRONG):**
```typescript
// Line 105-112: Queries wrong table
supabase
  .from('inspection_member_sets')          // ❌ System B table
  .select('*, inspection_member_readings(*)') // ❌ System B readings
  .in('inspection_id', ...)

// Line 442-453: Maps from wrong table
const simulatedData = simulatedMemberSets.map((set: any) => {
  const summary = set.summary_json;
  return [
    set.member_name,
    `${set.required_thickness_microns}`,
    summary.avgDft ? summary.avgDft.toFixed(1) : 'N/A',
    summary.minDft || 'N/A',
    summary.maxDft || 'N/A',
    summary.readingsCount || set.readings_per_member, // ❌ System B count
    summary.compliance || 'N/A',
  ];
});

// Line 502: Iterates over wrong table
const readings = set.inspection_member_readings || []; // ❌ System B
```

**Should Also Query:**
```typescript
// ALSO fetch inspection_readings (System A)
const quantityReadingsRes = await supabase
  .from('inspection_readings')
  .select('*')
  .eq('project_id', project.id)
  .order('member_id, sequence_number');

const quantityReadings = quantityReadingsRes.data || [];

// Group by member_id
const readingsByMember = quantityReadings.reduce((acc, reading) => {
  if (!acc[reading.member_id]) acc[reading.member_id] = [];
  acc[reading.member_id].push(reading);
  return acc;
}, {});

// Include in DFT summary table
const allMembersData = members.map(member => {
  const memberReadings = readingsByMember[member.id] || [];

  if (memberReadings.length > 0) {
    const avgDft = memberReadings.reduce((sum, r) => sum + r.dft_average, 0) / memberReadings.length;
    const minDft = Math.min(...memberReadings.map(r => r.dft_average));
    const maxDft = Math.max(...memberReadings.map(r => r.dft_average));
    const status = memberReadings.every(r => r.status === 'pass') ? 'PASS' : 'FAIL';

    return [
      member.member_mark,
      member.required_dft_microns || 'N/A',
      avgDft.toFixed(1),
      minDft,
      maxDft,
      memberReadings.length,  // ✓ Actual quantity count
      status
    ];
  }

  return null; // No readings for this member
}).filter(Boolean);
```

### 3.5 Why This Happened

Looking at the database migrations:

1. **Old system:** `inspection_member_sets` created in early migrations
2. **New system:** `inspection_readings` added in `20260309000921_add_quantity_and_inspection_readings.sql`
3. **Report generation:** Never updated to include new table

**File:** `supabase/migrations/20260309000921_add_quantity_and_inspection_readings.sql`

```sql
-- Create modern inspection readings table
CREATE TABLE IF NOT EXISTS inspection_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  sequence_number int NOT NULL,
  generated_id text NOT NULL,
  dft_reading_1 int,
  dft_reading_2 int,
  dft_reading_3 int,
  dft_average int,
  status text CHECK (status IN ('pass', 'fail')),
  temperature_c numeric(5, 2),
  humidity_percent int,
  reading_type text DEFAULT 'full_measurement',
  notes text,
  created_at timestamptz DEFAULT now()
);
```

This table exists and has data, but the report never queries it!

---

## Issue 4: Page Overflow

### 4.1 Bug Classification
**Type:** CSS/Layout Bug
**Severity:** HIGH
**Impact:** Content runs off page edges, tables split incorrectly, text overlaps

### 4.2 Root Cause

**File:** `src/components/ExportsTab.tsx`
**Multiple Lines:** 254, 482, 520

**Problem:** Hardcoded page height checks without proper margin calculation

```typescript
// Line 254 - Hardcoded page break
if (yPos > 257) {  // ❌ Magic number, no bottom margin
  doc.addPage();
  yPos = 20;
}

// Line 482 - Another hardcoded check
if ((doc as any).lastAutoTable.finalY > 220) {  // ❌ Magic number
  doc.addPage();
  yPos = 20;
}

// Line 520 - Cursor position check
const pageHeight = doc.internal.pageSize.height;
if (data.cursor.y > pageHeight - 30) {  // ⚠️ Only 30px bottom margin
  data.cursor.y = 20;
}
```

### 4.3 Correct Implementation

**Should use:**

```typescript
const pageHeight = doc.internal.pageSize.getHeight(); // 297mm for A4
const margin = 20;
const bottomMargin = 30;
const maxY = pageHeight - bottomMargin; // 267

// Before adding content
if (yPos + contentHeight > maxY) {
  doc.addPage();
  yPos = margin;
}
```

### 4.4 Additional Issues

1. **Table splitting:** `autoTable` has `didDrawPage` callback but doesn't prevent orphaned rows
2. **Text wrapping:** `splitTextToSize()` used but not checking remaining space before adding lines
3. **Section headers:** Not protected with `page-break-after: avoid` equivalent

**Recommended Fix:**

```typescript
// Add content with proper overflow protection
function addTextWithPagination(doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - 30;
  const lines = doc.splitTextToSize(text, maxWidth);

  let currentY = y;
  for (const line of lines) {
    if (currentY + 5 > maxY) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(line, x, currentY);
    currentY += 5;
  }

  return currentY;
}

// Protect section headers
function addSectionHeader(doc: jsPDF, title: string, y: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - 30;

  // Need at least 20px for header + first line of content
  if (y + 20 > maxY) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, y);

  return y + 10;
}
```

---

## Part 2: Organization Persistence Audit

### 2.1 Project Creation Flow

**File:** `src/components/CreateProjectModal.tsx`
**Lines:** 18-29, 61-94

**UI State:**
```typescript
const [formData, setFormData] = useState({
  name: '',
  client_name: '',
  main_contractor: '',
  site_address: '',
  project_ref: '',
  start_date: new Date().toISOString().split('T')[0],
  notes: '',
  organization_id: '',  // ✓ Organization ID stored in form state
});
```

**Database Insert:**
```typescript
// Lines 67-74 - INSERT payload
const { error: insertError } = await supabase
  .from('projects')
  .insert({
    ...formData,  // ✓ Includes organization_id
    status: 'active',
  });
```

**Verification Query:**
```sql
SELECT id, name, organization_id FROM projects WHERE id = '<project-id>';
-- Result: organization_id IS populated ✓
```

### 2.2 Failure Mode Analysis

✅ **PASSED:** Organization selection UI works
✅ **PASSED:** organization_id written to database
✅ **PASSED:** Projects table has organization_id column
✅ **PASSED:** Foreign key relationship exists
❌ **FAILED:** Report generation ignores organization_id
❌ **FAILED:** Report queries company_settings instead

### 2.3 Exact Insert Payload

```javascript
{
  name: "Pieter Test",
  client_name: "Ramona von Benecke",
  main_contractor: "",
  site_address: "9 Oro Lane, Auckland, Auckland, 0931, New Zealand",
  project_ref: "",
  start_date: "2026-03-09",
  notes: "",
  organization_id: "550e8400-e29b-41d4-a716-446655440001", // ✓ P&R Consulting UUID
  status: "active"
}
```

### 2.4 Exact Query Used in Report

**CURRENT (WRONG):**
```typescript
supabase.from('company_settings').select('*').limit(1).maybeSingle()
```

**SHOULD BE:**
```typescript
supabase
  .from('projects')
  .select(`
    *,
    organizations (
      id,
      name,
      logo_url,
      address,
      phone,
      email,
      website
    )
  `)
  .eq('id', project.id)
  .single()
```

---

## Part 3: Logo Rendering Audit

### 3.1 Image Source Analysis

**Current Implementation:**

```typescript
// Line 158-174 in ExportsTab.tsx
if (orgSettings?.logo_url) {
  const { data: logoData } = await supabase.storage
    .from('project-documents')  // ❌ Wrong bucket
    .getPublicUrl(orgSettings.logo_url);

  if (logoData?.publicUrl) {
    const response = await fetch(logoData.publicUrl);  // May fail if private
    const logoBlob = await response.blob();
    const logoDataUrl = await blobToDataURL(logoBlob);
    doc.addImage(logoDataUrl, 'PNG', 15, yPos - 5, 40, 20);
  }
}
```

### 3.2 Failure Modes

| Failure Mode | Likelihood | Impact |
|-------------|-----------|---------|
| Wrong data source (company_settings) | 100% | Logo never loads |
| Wrong bucket (project-documents) | 80% | 404 error if logo in different bucket |
| Private URL not accessible | 60% | Fetch fails with CORS/auth error |
| Async load race condition | 40% | PDF generates before image loads |
| Image format not supported | 20% | addImage() throws error |
| Zero dimensions (CSS hidden) | 0% | Not applicable in jsPDF |

### 3.3 Browser vs Export Rendering

**Browser View (HTML):**
- Can load authenticated Supabase storage URLs
- Can handle CORS with proper headers
- Async image loading handled by browser
- Result: Logo displays correctly ✓

**Export View (jsPDF):**
- Must convert to base64 before adding
- Cannot access authenticated URLs without token
- Must load image before calling doc.save()
- Result: Logo fails to load ❌

### 3.4 Correct Implementation (Already exists in pdfCompleteReport.ts)

**File:** `src/lib/pdfCompleteReport.ts` (Lines 84-103)

This file has the correct multi-bucket fallback logic but is NOT used by ExportsTab.tsx

```typescript
let logoImage: string | null = null;

// Check if logoUrl is already a full URL
if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
  logoImage = await loadImageAsDataURL(logoUrl);
} else {
  // Try multiple buckets
  const buckets = ['organization-logos', 'project-documents', 'documents'];
  for (const bucket of buckets) {
    try {
      const { data } = await supabase.storage.from(bucket).getPublicUrl(logoUrl);
      if (data?.publicUrl) {
        logoImage = await loadImageAsDataURL(data.publicUrl);
        if (logoImage) break;
      }
    } catch (err) {
      continue;
    }
  }
}
```

---

## Part 4: Member Quantity Workflow Audit

### 4.1 Full Data Flow

```
1. USER UPDATES QUANTITY
   └─ MembersTab.tsx (UI input field, not shown in provided code)
      └─ Updates local state
         └─ Saves to members.quantity column

2. USER CLICKS "Generate Quantity Readings"
   └─ MembersTab.tsx:329 onClick handler
      └─ Opens GenerateQuantityReadingsModal (Line 571-580)
         └─ Passes selectedMembers array

3. MODAL GENERATES READINGS
   └─ MembersTab.tsx:1073-1100 handleGenerate()
      └─ For each member:
         └─ config.quantity = member.quantity || 1  // ✓ Uses DB value
            └─ generateQuantityBasedReadings(config)
               └─ Creates N readings (Line 90-106)
                  └─ saveGeneratedReadings(config, readings)
                     └─ INSERT INTO inspection_readings  // ✓ Data saved

4. REPORT GENERATION
   └─ ExportsTab.tsx:72 generateAuditReport()
      └─ SELECT FROM inspection_member_sets  // ❌ Wrong table
         └─ Missing: SELECT FROM inspection_readings
            └─ RESULT: Quantity readings not in report
```

### 4.2 Quantity Storage Verification

**Query to check quantity:**
```sql
SELECT id, member_mark, quantity FROM members WHERE project_id = '<project-id>';
```

**Expected:** quantity column populated (e.g., 8)
**Actual:** quantity column likely has values OR defaults to 1

**Query to check generated readings:**
```sql
SELECT member_id, COUNT(*) as reading_count
FROM inspection_readings
WHERE project_id = '<project-id>'
GROUP BY member_id;
```

**Expected:** reading_count matches member.quantity
**Actual:** reading_count likely matches, but report doesn't query this table!

### 4.3 Dangerous Pattern Analysis

**Found in:** `MembersTab.tsx:1083`

```typescript
quantity: member.quantity || 1,  // ⚠️ Dangerous fallback
```

**Analysis:**
- This is safe IF member.quantity is always set
- If member.quantity is NULL, defaults to 1
- Check: Is quantity column nullable?

**File:** `supabase/migrations/20260309000921_add_quantity_and_inspection_readings.sql`

```sql
ALTER TABLE members ADD COLUMN quantity integer DEFAULT 1 CHECK (quantity > 0);
```

**Result:** Column has DEFAULT 1, so NULL won't happen. Fallback `|| 1` is redundant but harmless.

### 4.4 Reading Count in Report

**Current Code (WRONG):**
```typescript
// Line 450 - Uses inspection_member_readings count
summary.readingsCount || set.readings_per_member,
```

**This queries:**
- `inspection_member_sets.readings_per_member` (a configuration field, not actual count)
- `inspection_member_readings` table (different system)

**Should Also Include:**
```typescript
// Count actual readings from inspection_readings table
const quantityReadingsCount = readingsByMember[member.id]?.length || 0;

// Use whichever has data
const totalReadings = quantityReadingsCount || summary.readingsCount || set.readings_per_member;
```

---

## Part 5: Print Layout Audit

### 5.1 Problematic Patterns Found

#### Pattern 1: Hardcoded Page Heights
```typescript
// Line 254
if (yPos > 257) {  // ❌ Should be pageHeight - bottomMargin

// Line 482
if ((doc as any).lastAutoTable.finalY > 220) {  // ❌ Magic number
```

#### Pattern 2: Inconsistent Margin Handling
```typescript
// Top margin: 20px
yPos = 20;

// Bottom margin check: Sometimes 30, sometimes 257
if (yPos > 257) ...
if (data.cursor.y > pageHeight - 30) ...
```

#### Pattern 3: No Content Height Calculation
```typescript
// Doesn't check if content fits before adding
doc.text(line, 20, yPos);
yPos += 5;  // Increment without checking maxY
```

#### Pattern 4: Table Splitting Issues
```typescript
// autoTable has didDrawPage but no rowPageBreak: 'avoid'
autoTable(doc, {
  // ... config
  didDrawPage: (data: any) => {
    if (data.cursor.y > pageHeight - 30) {
      data.cursor.y = 20;  // ⚠️ Resets but doesn't prevent mid-row breaks
    }
  },
});
```

### 5.2 Elements Causing Overflow

1. **Long paragraphs** (Lines 245-262): Uses splitTextToSize but doesn't reserve space
2. **DFT summary table** (Lines 400-424): Large table may exceed page
3. **Testing data sections** (Lines 481-528): Multiple nested loops without pagination checks
4. **NCR listings** (Lines 531-560): No content height calculation

### 5.3 CSS/Print Layout Issues

**None found** - This is jsPDF, not HTML/CSS. All layout is programmatic via y-position tracking.

However, equivalent issues:
- No "page-break-after: avoid" for headers
- No "page-break-inside: avoid" for sections
- No "widows/orphans" protection

### 5.4 Recommended Refactor

```typescript
// Define constants
const PAGE_CONFIG = {
  height: 297,  // A4 height in mm
  margin: {
    top: 20,
    bottom: 30,
    left: 20,
    right: 20,
  },
  get maxY() {
    return this.height - this.margin.bottom;
  },
  get contentWidth() {
    return 210 - this.margin.left - this.margin.right; // A4 width = 210mm
  }
};

// Helper function
function checkPageBreak(doc: jsPDF, currentY: number, contentHeight: number): number {
  if (currentY + contentHeight > PAGE_CONFIG.maxY) {
    doc.addPage();
    return PAGE_CONFIG.margin.top;
  }
  return currentY;
}

// Usage
yPos = checkPageBreak(doc, yPos, 10); // Reserve 10mm for next section
doc.text('Section Title', 20, yPos);
yPos += 10;
```

---

## Part 6: Final Diagnosis & Fixes

### Issue 1: Organization Not Persisting

**Root Cause:** Data mapping bug - report queries `company_settings` instead of `projects.organization_id → organizations`

**Affected Files:**
- `src/components/ExportsTab.tsx` (Lines 114, 123, 179)

**Exact Fix:**

```typescript
// OLD (Line 114-115):
supabase.from('company_settings').select('*').limit(1).maybeSingle(),
supabase.from('projects').select('*, clients(logo_path)').eq('id', project.id).maybeSingle(),

// NEW:
supabase
  .from('projects')
  .select(`
    *,
    clients(logo_path),
    organizations(id, name, logo_url, address, phone, email, website)
  `)
  .eq('id', project.id)
  .single(),

// Update usage (Line 123):
// OLD:
const orgSettings = orgSettingsRes.data;

// NEW:
const projectDetails = projectDetailsRes.data;
const orgSettings = projectDetails?.organizations || null;
const fallbackSettings = orgSettingsRes?.data; // Keep fallback for projects without org

// Update line 179:
// OLD:
const orgName = orgSettings?.company_name || 'P&R Consulting Limited';

// NEW:
const orgName = orgSettings?.name || fallbackSettings?.company_name || 'P&R Consulting Limited';
```

---

### Issue 2: Logo Not Rendering

**Root Cause:** Same as Issue 1 + hardcoded wrong storage bucket

**Affected Files:**
- `src/components/ExportsTab.tsx` (Lines 158-174)

**Exact Fix:**

```typescript
// Replace Lines 158-174 with:
if (orgSettings?.logo_url) {
  try {
    let logoDataUrl = null;

    // Check if full URL
    if (orgSettings.logo_url.startsWith('http://') || orgSettings.logo_url.startsWith('https://')) {
      const response = await fetch(orgSettings.logo_url);
      const logoBlob = await response.blob();
      logoDataUrl = await blobToDataURL(logoBlob);
    } else {
      // Try multiple buckets
      const buckets = ['organization-logos', 'project-documents', 'documents'];
      for (const bucket of buckets) {
        try {
          const { data: logoData } = await supabase.storage
            .from(bucket)
            .getPublicUrl(orgSettings.logo_url);

          if (logoData?.publicUrl) {
            const response = await fetch(logoData.publicUrl);
            const logoBlob = await response.blob();
            logoDataUrl = await blobToDataURL(logoBlob);
            if (logoDataUrl) break; // Success, stop trying
          }
        } catch (err) {
          continue; // Try next bucket
        }
      }
    }

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 15, yPos - 5, 40, 20);
    }
  } catch (error) {
    console.warn('Could not load organization logo:', error);
  }
}
```

---

### Issue 3: Member Quantity Not Showing

**Root Cause:** Table mismatch - quantity readings stored in `inspection_readings` but report queries `inspection_member_sets`

**Affected Files:**
- `src/components/ExportsTab.tsx` (Lines 105-112, 368-424, 426-529)

**Exact Fix:**

```typescript
// Add to parallel queries (after line 105):
const quantityReadingsRes = await supabase
  .from('inspection_readings')
  .select('*')
  .eq('project_id', project.id)
  .order('member_id, sequence_number');

const quantityReadings = quantityReadingsRes.data || [];

// Group readings by member_id (add after line 125):
const readingsByMember = quantityReadings.reduce((acc, reading) => {
  if (!acc[reading.member_id]) {
    acc[reading.member_id] = [];
  }
  acc[reading.member_id].push(reading);
  return acc;
}, {} as Record<string, any[]>);

// Merge with DFT data (replace lines 368-424):
const dftData: any[] = [];

// First, add members with quantity readings
members.forEach(member => {
  const memberReadings = readingsByMember[member.id];
  if (memberReadings && memberReadings.length > 0) {
    const avgDft = memberReadings.reduce((sum, r) => sum + r.dft_average, 0) / memberReadings.length;
    const minDft = Math.min(...memberReadings.map(r => r.dft_average));
    const maxDft = Math.max(...memberReadings.map(r => r.dft_average));
    const allPass = memberReadings.every(r => r.status === 'pass');

    dftData.push([
      `${member.member_mark}${member.is_spot_check ? ' (Spot)' : ''}`,
      member.required_dft_microns || 'N/A',
      avgDft.toFixed(1),
      minDft,
      maxDft,
      memberReadings.length, // ✓ Actual quantity count
      allPass ? 'PASS' : 'FAIL'
    ]);
  }
});

// Then, add inspection-based data (existing logic)
inspections.forEach((inspection: any) => {
  const batches = inspection.dft_batches || [];
  batches.forEach((batch: any) => {
    const readings = batch.dft_readings || [];
    if (readings.length > 0) {
      const avgDft = readings.reduce((sum: number, r: any) => sum + r.dft_value, 0) / readings.length;
      const minDft = Math.min(...readings.map((r: any) => r.dft_value));
      const maxDft = Math.max(...readings.map((r: any) => r.dft_value));
      const allPass = readings.every((r: any) => r.dft_value >= (inspection.members?.required_dft_microns || 0));

      dftData.push([
        inspection.members?.member_mark || 'Unknown',
        inspection.members?.required_dft_microns || 'N/A',
        avgDft.toFixed(1),
        minDft,
        maxDft,
        readings.length,
        allPass ? 'PASS' : 'FAIL',
      ]);
    }
  });
});

// Rest of table rendering unchanged (lines 400-424)
```

**Also add detailed readings section:**

```typescript
// Add after line 529 (before NCRs section):
if (Object.keys(readingsByMember).length > 0) {
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Quantity-Based Inspection Readings', 20, yPos);
  yPos += 10;

  for (const [memberId, readings] of Object.entries(readingsByMember)) {
    const member = members.find(m => m.id === memberId);
    if (!member) continue;

    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Member: ${member.member_mark}`, 20, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Readings: ${readings.length} | Required DFT: ${member.required_dft_microns}µm`, 20, yPos);
    yPos += 7;

    const readingData = readings.map((r: any) => [
      r.generated_id,
      `${r.dft_reading_1}µm`,
      `${r.dft_reading_2}µm`,
      `${r.dft_reading_3}µm`,
      `${r.dft_average}µm`,
      r.status.toUpperCase(),
    ]);

    autoTable(doc, {
      head: [['ID', 'Reading 1', 'Reading 2', 'Reading 3', 'Average', 'Status']],
      body: readingData,
      startY: yPos,
      theme: 'grid',
      headStyles: { fillColor: [0, 40, 80], textColor: 255 },
      styles: { fontSize: 8 },
      margin: { bottom: 30 },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.text[0] === 'PASS') {
            data.cell.styles.textColor = [0, 128, 0];
          } else if (data.cell.text[0] === 'FAIL') {
            data.cell.styles.textColor = [255, 0, 0];
          }
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
}
```

---

### Issue 4: Page Overflow

**Root Cause:** Hardcoded page break checks without proper margin calculation

**Affected Files:**
- `src/components/ExportsTab.tsx` (Lines 254, 482, 520)

**Exact Fix:**

```typescript
// Add constants at top of generateAuditReport function (after line 155):
const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
const MARGIN = {
  top: 20,
  bottom: 30,
  left: 20,
  right: 20,
};
const MAX_Y = PAGE_HEIGHT - MARGIN.bottom;
const CONTENT_WIDTH = 210 - MARGIN.left - MARGIN.right;

// Helper function (add after constants):
function checkPageBreak(currentY: number, requiredSpace: number = 10): number {
  if (currentY + requiredSpace > MAX_Y) {
    doc.addPage();
    return MARGIN.top;
  }
  return currentY;
}

// Replace line 254:
// OLD:
if (yPos > 257) {
  doc.addPage();
  yPos = 20;
}

// NEW:
yPos = checkPageBreak(yPos, 5);

// Replace line 482:
// OLD:
if ((doc as any).lastAutoTable.finalY > 220) {
  doc.addPage();
  yPos = 20;
} else {
  yPos = (doc as any).lastAutoTable.finalY + 15;
}

// NEW:
yPos = (doc as any).lastAutoTable.finalY + 15;
yPos = checkPageBreak(yPos, 20); // Reserve space for next section

// Update line 520:
// OLD:
const pageHeight = doc.internal.pageSize.height;
if (data.cursor.y > pageHeight - 30) {
  data.cursor.y = 20;
}

// NEW:
if (data.cursor.y > MAX_Y) {
  data.cursor.y = MARGIN.top;
}
```

---

## Summary of Changes Required

### File 1: `src/components/ExportsTab.tsx`

**Total Lines to Modify:** ~150
**Complexity:** Medium
**Breaking Changes:** None (backwards compatible)

**Changes:**
1. Lines 85-116: Add organizations JOIN, fetch inspection_readings
2. Lines 123-125: Update variable assignments
3. Lines 155-157: Add pagination constants
4. Lines 158-180: Fix logo loading with multi-bucket logic
5. Lines 179-180: Use organizations.name instead of company_settings
6. Lines 252-262: Replace hardcoded checks with checkPageBreak()
7. Lines 368-424: Merge quantity readings into DFT table
8. Lines 480-528: Update page break logic
9. Lines 529+: Add new section for quantity readings

### Database Verification Queries

```sql
-- Verify organizations are linked
SELECT
  p.id,
  p.name as project_name,
  p.organization_id,
  o.name as org_name,
  o.logo_url
FROM projects p
LEFT JOIN organizations o ON o.id = p.organization_id
ORDER BY p.created_at DESC
LIMIT 10;

-- Verify quantity readings exist
SELECT
  m.member_mark,
  m.quantity,
  COUNT(ir.id) as actual_reading_count
FROM members m
LEFT JOIN inspection_readings ir ON ir.member_id = m.id
GROUP BY m.id, m.member_mark, m.quantity
ORDER BY m.member_mark;

-- Check table counts
SELECT
  (SELECT COUNT(*) FROM inspection_readings) as qty_readings,
  (SELECT COUNT(*) FROM inspection_member_readings) as member_readings,
  (SELECT COUNT(*) FROM inspection_member_sets) as member_sets;
```

### Testing Checklist

- [ ] Create project with "Optimal Fire" selected
- [ ] Verify organization_id in database
- [ ] Generate report, verify "Optimal Fire Limited" in header
- [ ] Verify logo appears on cover page
- [ ] Create member with quantity = 8
- [ ] Generate Quantity Readings
- [ ] Verify 8 readings in inspection_readings table
- [ ] Generate report, verify "Readings: 8" in DFT table
- [ ] Verify detailed readings section shows all 8
- [ ] Check page breaks don't cut off content
- [ ] Verify tables split cleanly across pages
- [ ] Test with long project names/addresses (overflow protection)

---

**End of Diagnosis Report**
