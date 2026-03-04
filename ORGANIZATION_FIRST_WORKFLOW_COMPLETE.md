# Organization-First Project Creation Workflow - Implementation Complete

## Overview

The project creation workflow has been successfully redesigned to prioritize organization selection as the **mandatory first step**. This ensures data consistency, proper branding, and correct security context throughout the entire system.

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   NEW PROJECT WIZARD                     │
│                      (7 Steps)                           │
└─────────────────────────────────────────────────────────┘

STEP 0: SELECT ORGANIZATION (MANDATORY FIRST STEP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────────────┐
│  🏢 Choose Your Organization                            │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                │
│  │ Organization A  │  │ Organization B  │               │
│  │ [Logo]         │  │ [Logo]         │                │
│  │ ✓ Selected     │  │                │                │
│  └────────────────┘  └────────────────┘                │
│                                                          │
│  ⚠️  Organization cannot be changed after selection     │
└─────────────────────────────────────────────────────────┘
                          ↓
                 Organization Context
                      LOCKED IN
                          ↓
┌─────────────────────────────────────────────────────────┐
│  🏢 Organization: P&R Consulting Limited                │  ← Shown on all steps
└─────────────────────────────────────────────────────────┘
                          ↓

STEP 1: PROJECT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────────────┐
│  📝 Add Project Details                                  │
│  • Project Name (required)                               │
│  • Package (optional)                                    │
│  • Project Image                                         │
│  • Site Type (auto: Single Site)                        │
└─────────────────────────────────────────────────────────┘
                          ↓

STEP 2: CLIENT SELECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────────────┐
│  🏢 Choose a Client                                      │
│  • Search existing clients                               │
│  • Select from list                                      │
│  • Create new client                                     │
└─────────────────────────────────────────────────────────┘
                          ↓

STEP 3: TEMPLATE SETUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────────────┐
│  📋 Project Setup Mode                                   │
│  • Start from template                                   │
│  • Duplicate existing project                            │
│  • Hybrid (template + settings)                          │
└─────────────────────────────────────────────────────────┘
                          ↓

STEP 4: DRAWING MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────────────┐
│  🖼️ Drawing Mode                                         │
│  • With Drawings (upload PDFs/images)                    │
│  • Without Drawings (text-based locations)               │
└─────────────────────────────────────────────────────────┘
                          ↓

STEP 5: SITE ADDRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────────────┐
│  📍 Site Address                                         │
│  • Country                                               │
│  • Street Address (required)                             │
│  • Suburb, City (required), Postcode                     │
│  • Coordinates (optional)                                │
│  • what3words (optional)                                 │
└─────────────────────────────────────────────────────────┘
                          ↓

STEP 6: SUMMARY & CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────────────────┐
│  ✅ Summary                                              │
│  • Organization: P&R Consulting Limited                  │
│  • Project Name                                          │
│  • Client                                                │
│  • Template/Setup Mode                                   │
│  • Drawing Mode                                          │
│  • Full Address                                          │
│                                                          │
│  [Create Project] ←────── Includes organization_id      │
└─────────────────────────────────────────────────────────┘
                          ↓
                 PROJECT CREATED
                          ↓
        ┌─────────────────────────────────┐
        │  Database Record Includes:       │
        │  • organization_id (FK)          │
        │  • All project details           │
        │  • Inherits organization logo    │
        │  • Security context established  │
        └─────────────────────────────────┘
```

---

## Data Flow Architecture

### 1. Organization Selection (Step 0)

**Purpose**: Establish organization context before any other data entry

**Data Captured**:
```typescript
{
  organizationId: string;        // Primary key for organization
  organizationName: string;      // Display name
  organizationLogoUrl: string | null;  // Logo for reports
}
```

**User Experience**:
- Large visual cards showing organization logos
- Auto-select if only one organization exists
- Search functionality for multiple organizations
- Clear warning that organization cannot be changed
- Empty state with link to create organization

**Validation**:
- ✅ Must select an organization to proceed
- ✅ Cannot proceed to Step 1 without selection
- ✅ Back button disabled on Step 0

---

### 2. Organization Context Propagation (Steps 1-6)

**Visual Feedback**:
Every subsequent step displays organization context banner:

```
┌─────────────────────────────────────────┐
│ 🏢 [Logo] Organization                  │
│           P&R Consulting Limited        │
└─────────────────────────────────────────┘
```

**Implementation**:
```typescript
{data.organizationName && (
  <div className="bg-primary-900/20 border border-primary-600/30 rounded-lg p-4">
    <div className="flex items-center gap-3">
      {data.organizationLogoUrl ? (
        <img src={data.organizationLogoUrl} alt={data.organizationName} />
      ) : (
        <Building className="w-12 h-12 text-primary-400" />
      )}
      <div>
        <p className="text-xs text-slate-400">Organization</p>
        <p className="text-sm font-semibold text-white">{data.organizationName}</p>
      </div>
    </div>
  </div>
)}
```

---

### 3. Database Integration

**Project Creation** (Step 6):

```typescript
const projectData = {
  organization_id: data.organizationId,  // ← MANDATORY FIELD
  name: data.projectName,
  package: data.package || null,
  site_type: 'single_site',
  client_id: data.clientId,
  drawing_mode: data.drawingMode,
  // ... other fields
};

await supabase.from('projects').insert([projectData]);
```

**Foreign Key Constraint**:
```sql
ALTER TABLE projects
ADD CONSTRAINT projects_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE RESTRICT;
```

---

## System Components Updated

### ✅ 1. Wizard Data Structure
**File**: `src/components/ProjectWizard.tsx`

**Changes**:
- Added `organizationId`, `organizationName`, `organizationLogoUrl` to `WizardData` interface
- Positioned organization fields at top of interface (semantic importance)
- Updated default data to include organization fields

### ✅ 2. Organization Selection Step
**File**: `src/components/wizard/WizardStep0.tsx`

**Features**:
- Loads active organizations from database
- Visual card-based selection UI
- Auto-selection for single organization
- Search functionality
- Empty state handling
- Warning about immutability

### ✅ 3. Wizard Navigation
**File**: `src/components/ProjectWizard.tsx`

**Changes**:
- Updated `currentStep` to start at 0 (was 1)
- Updated step counter: "Step X of 7" (was "Step X of 6")
- Progress bar shows 7 steps (was 6)
- `canProceed()` validates `organizationId` for Step 0
- `handleBack()` allows navigation to Step 0 (was blocked at 1)
- `renderStep()` includes case 0 for `WizardStep0`

### ✅ 4. Context Display on All Steps
**Files Updated**:
- `src/components/wizard/WizardStep1.tsx` (Project Details)
- `src/components/wizard/WizardStep2.tsx` (Client Selection)
- `src/components/wizard/WizardStep3.tsx` (Template Setup)
- `src/components/wizard/WizardStep4.tsx` (Drawing Mode)
- `src/components/wizard/WizardStep5.tsx` (Site Address)
- `src/components/wizard/WizardStep6.tsx` (Summary)

**Common Pattern**:
All steps display organization context banner showing:
- Organization logo (if available)
- Organization name
- Visual hierarchy (small text "Organization", large text for name)

### ✅ 5. Final Project Creation
**File**: `src/components/wizard/WizardStep6.tsx`

**Changes**:
- Added `organization_id: data.organizationId` to project creation
- Display organization name prominently in summary
- Include organization in project data sent to database

---

## Validation Rules

### Step 0 - Organization Selection
| Rule | Implementation |
|------|----------------|
| Must select organization | `canProceed()` checks `wizardData.organizationId !== ''` |
| Cannot skip this step | Back button disabled, Next requires selection |
| Cannot proceed without selection | Next button disabled state |

### Step 1 - Project Details
| Rule | Implementation |
|------|----------------|
| Organization context visible | Banner displays selected organization |
| Project name required | `canProceed()` checks `projectName.trim() !== ''` |

### Step 2 - Client Selection
| Rule | Implementation |
|------|----------------|
| Organization context visible | Banner displays selected organization |
| Client selection required | `canProceed()` checks `clientId !== ''` |

### Steps 3-5
| Rule | Implementation |
|------|----------------|
| Organization context always visible | Banner on all steps |
| Step-specific validation | Template/mode/address validation |

### Step 6 - Summary
| Rule | Implementation |
|------|----------------|
| Organization shown first | Displayed at top of summary |
| organization_id included in DB insert | Added to `projectData` object |

---

## Security & Data Integrity

### 1. Row Level Security (RLS)

**Projects Table Policy**:
```sql
CREATE POLICY "Users can view projects in their organizations"
ON projects FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_organization_access
    WHERE user_id = auth.uid()
  )
);
```

### 2. Foreign Key Constraints

```sql
-- Prevents orphaned projects
ALTER TABLE projects
ADD CONSTRAINT projects_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE RESTRICT;
```

### 3. Data Validation

**Application Level**:
- Organization ID validated before proceeding from Step 0
- Organization ID included in all project creation requests
- No way to bypass organization selection in UI

**Database Level**:
- `organization_id` column is NOT NULL
- Foreign key constraint ensures valid organization
- Triggers maintain updated_at timestamps

---

## User Experience Flow

### Scenario 1: Single Organization User

1. Opens project wizard
2. **Step 0**: Organization auto-selected (only one exists)
3. Sees green confirmation banner
4. Clicks "Next" immediately
5. **Steps 1-6**: Organization banner visible on all steps
6. Creates project with organization context locked

### Scenario 2: Multi-Organization User

1. Opens project wizard
2. **Step 0**: Sees grid of organization cards
3. Uses search if many organizations
4. Clicks organization card to select
5. Sees green confirmation banner
6. Reads warning about immutability
7. **Steps 1-6**: Organization banner visible on all steps
8. Creates project with selected organization

### Scenario 3: No Organizations

1. Opens project wizard
2. **Step 0**: Sees empty state
3. Clicks "Create your first organization" link
4. Redirected to organization management
5. Creates organization
6. Returns to wizard
7. Organization auto-selected

---

## Testing Checklist

### ✅ Basic Functionality
- [x] Organization selection appears as Step 0
- [x] Step counter shows "Step 1 of 7" on Step 0
- [x] Progress bar shows 7 segments
- [x] Back button disabled on Step 0
- [x] Next button requires organization selection
- [x] Organization banner appears on Steps 1-6

### ✅ Data Validation
- [x] Cannot proceed without selecting organization
- [x] Organization ID stored in wizard data
- [x] Organization context visible on all steps
- [x] organization_id included in project creation
- [x] Project successfully created with organization

### ✅ Edge Cases
- [x] Single organization auto-selects
- [x] Empty state shows create link
- [x] Search filters organizations correctly
- [x] Selected state visually distinct
- [x] Organization logo displays correctly

### ✅ Build & Deployment
- [x] Project builds without errors
- [x] TypeScript types correct
- [x] All imports resolved
- [x] No console errors

---

## Technical Specifications

### WizardData Interface

```typescript
export interface WizardData {
  // Step 0: Organization Selection (NEW - MANDATORY FIRST STEP)
  organizationId: string;
  organizationName: string;
  organizationLogoUrl: string | null;

  // Step 1: Project Details
  projectName: string;
  package: string;
  siteType: string;
  projectImagePath?: string;

  // Step 2: Client Selection
  clientId: string;
  clientName: string;

  // Step 3: Template Setup
  setupMode: 'template' | 'duplicate' | 'hybrid';
  templateId: string;
  templateName: string;
  sourceProjectId: string;
  sourceProjectName: string;
  clonedElements: string[];
  drawingMode: 'with_drawings' | 'without_drawings';

  // Step 4: Location & Address
  country: string;
  addressLine: string;
  suburb: string;
  city: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  what3words: string;
}
```

### Database Schema

```sql
-- Organizations table (already exists)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects table with organization_id
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  package TEXT,
  site_type TEXT,
  client_id UUID REFERENCES clients(id),
  -- ... other fields
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Benefits Achieved

### 1. Data Consistency
✅ Organization context established before any project data
✅ No orphaned projects without organization
✅ Clear data ownership from the start

### 2. Security
✅ RLS policies can filter on organization_id immediately
✅ Users cannot create projects for wrong organization
✅ Audit trail includes organization from creation

### 3. User Experience
✅ Clear visual hierarchy (organization first)
✅ Organization logo/branding visible throughout
✅ No confusion about which organization project belongs to
✅ Prevents mistakes with organization assignment

### 4. Reporting & Branding
✅ Correct organization logo on all reports
✅ Organization details pulled correctly
✅ Multi-tenant reporting works correctly

### 5. System Integration
✅ All downstream features inherit organization context
✅ Permissions based on organization membership
✅ Data filtering by organization works from creation

---

## Migration Notes

### For Existing Projects

If your database has existing projects without `organization_id`:

1. Run migration to add column:
```sql
ALTER TABLE projects
ADD COLUMN organization_id UUID;

-- Migrate existing projects to default organization
UPDATE projects
SET organization_id = (SELECT id FROM organizations LIMIT 1)
WHERE organization_id IS NULL;

-- Make column required
ALTER TABLE projects
ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key
ALTER TABLE projects
ADD CONSTRAINT projects_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE RESTRICT;
```

---

## Summary

The organization-first workflow has been successfully implemented with:

- ✅ **7-step wizard** (was 6 steps)
- ✅ **Organization selection as mandatory Step 0**
- ✅ **Visual context on all subsequent steps**
- ✅ **Database integration with organization_id**
- ✅ **Validation rules enforcing organization selection**
- ✅ **User experience enhancements**
- ✅ **Security via RLS and foreign keys**
- ✅ **Build verification complete**

All requested deliverables have been provided:
1. ✅ Detailed workflow diagram
2. ✅ Technical specifications for data propagation
3. ✅ List of system components updated
4. ✅ Validation rules documented
5. ✅ Implementation plan executed
