# Multi-Organization Support Implementation Plan

## Executive Summary

Transform the inspection report system from single-organization to multi-organization support, allowing users to manage multiple organizations and assign projects to specific organizations. All reports will automatically use the correct organization branding based on project assignment.

## Current Architecture

### Database
- **`company_settings` table**: Single row storing one organization's details
  - Fields: `id`, `company_name`, `address`, `phone`, `email`, `website`, `logo_url`
  - Used by: Report generation RPC functions

- **`projects` table**: No organization reference
  - Missing: `organization_id` foreign key
  - All projects implicitly use the single company_settings row

### Frontend
- **Organization Settings**: Single organization edit page (`/settings/organization`)
- **Project Creation**: No organization selection
- **Reports**: Pull company data from singleton `company_settings`

## Target Architecture

### Database Changes

#### 1. Create `organizations` Table
```sql
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 2. Add `organization_id` to Projects
```sql
ALTER TABLE projects
  ADD COLUMN organization_id uuid REFERENCES organizations(id);

-- Set default organization for existing projects
UPDATE projects SET organization_id = (SELECT id FROM organizations LIMIT 1);

-- Make organization_id required for new projects
ALTER TABLE projects
  ALTER COLUMN organization_id SET NOT NULL;
```

#### 3. Data Migration Strategy
1. Migrate existing `company_settings` data to new `organizations` table
2. Link all existing projects to the migrated organization
3. Maintain `company_settings` table temporarily for backward compatibility (deprecated)
4. Update all RPC functions to use `organizations` via `project.organization_id`

### Frontend Changes

#### 1. Organizations Management Page (`/settings/organizations`)
**New page**: List all organizations with CRUD operations

**Features**:
- List view showing all organizations (name, logo thumbnail, status)
- "Create Organization" button
- Edit/Delete actions for each organization
- Mark organizations as active/inactive
- Search and filter capabilities

**UI Components**:
- `OrganizationsList.tsx` - Main list view
- `CreateOrganizationModal.tsx` - Create new organization
- `EditOrganizationModal.tsx` - Edit existing organization

#### 2. Update Project Creation Modal
**File**: `src/components/CreateProjectModal.tsx`

**Changes**:
- Add organization selection dropdown (required field)
- Load active organizations from database
- Display organization name and logo in dropdown
- Set default to first active organization
- Validate organization selection before save

**UI Enhancement**:
```tsx
<div>
  <label>Organization *</label>
  <select required value={formData.organization_id}>
    <option value="">Select Organization</option>
    {organizations.map(org => (
      <option value={org.id}>{org.name}</option>
    ))}
  </select>
</div>
```

#### 3. Update Single Organization Settings Page
**File**: `src/pages/settings/Organization.tsx`

**Options**:
- **Option A**: Redirect to new Organizations management page
- **Option B**: Convert to "Edit Default Organization" page
- **Option C**: Keep as legacy single-org editor with warning

**Recommended**: Option A - Update navigation to point to new page

#### 4. Project Detail View Enhancement
**Display**: Show organization name and logo on project detail page
**Location**: `src/pages/ProjectDetail.tsx`

### Report Generation Updates

#### 1. Update RPC Functions

**Files to Update**:
- `get_introduction_data(project_id)` - Currently pulls from `company_settings`
- `get_executive_summary_data(project_id)` - Currently pulls from `company_settings`

**Change Pattern**:
```sql
-- OLD: Direct query to company_settings
SELECT * FROM company_settings LIMIT 1;

-- NEW: Query via project's organization_id
SELECT o.*
FROM projects p
INNER JOIN organizations o ON o.id = p.organization_id
WHERE p.id = p_project_id;
```

**Migration SQL**:
```sql
CREATE OR REPLACE FUNCTION get_introduction_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_data jsonb;
BEGIN
  -- Get organization data via project
  SELECT jsonb_build_object(
    'company_name', o.name,
    'company_logo_url', o.logo_url,
    'address', o.address,
    'phone', o.phone,
    'email', o.email,
    'website', o.website
  )
  INTO company_data
  FROM projects p
  INNER JOIN organizations o ON o.id = p.organization_id
  WHERE p.id = p_project_id;

  -- Rest of function...
END;
$$;
```

#### 2. Frontend Report Generators
**Files**:
- `src/lib/introductionGenerator.ts`
- `src/lib/executiveSummaryGenerator.ts`
- `src/lib/pdfCompleteReport.ts`
- All PDF generation libraries

**No changes required** - These already use RPC functions, will automatically get correct organization data

### Row Level Security (RLS)

#### Organizations Table Policies
```sql
-- Read: All authenticated users can view organizations
CREATE POLICY "Users can view organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

-- Create/Update/Delete: Admin users only
CREATE POLICY "Admins can manage organizations"
  ON organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
```

#### Projects Table Policy Updates
```sql
-- Existing policies work unchanged
-- Projects already have proper RLS
-- organization_id is just another foreign key
```

## Implementation Phases

### Phase 1: Database Migration (Week 1)
1. ✅ Create `organizations` table with RLS
2. ✅ Migrate `company_settings` data to `organizations`
3. ✅ Add `organization_id` to `projects` table
4. ✅ Update existing projects with default organization
5. ✅ Update RPC functions to use organizations
6. ✅ Test data migration

### Phase 2: Organizations Management UI (Week 1)
1. ✅ Create Organizations list page
2. ✅ Create Organization CRUD modals
3. ✅ Add navigation menu item
4. ✅ Update Organization settings page redirect
5. ✅ Test organization management

### Phase 3: Project Creation Update (Week 2)
1. ✅ Add organization selection to CreateProjectModal
2. ✅ Load active organizations
3. ✅ Validate organization selection
4. ✅ Test project creation with organization
5. ✅ Update project detail view to show organization

### Phase 4: Report Integration Testing (Week 2)
1. ✅ Generate reports for projects with different organizations
2. ✅ Verify correct organization branding in all report types
3. ✅ Test introduction section
4. ✅ Test executive summary
5. ✅ Test complete report export
6. ✅ Verify logo rendering

### Phase 5: Documentation & Training (Week 3)
1. ✅ Update user documentation
2. ✅ Create migration guide for existing users
3. ✅ Record demo videos
4. ✅ Update API documentation

## Backward Compatibility Strategy

### During Migration Period
1. **Keep `company_settings` table** (mark as deprecated)
2. **Fallback logic**: If project has no organization_id, use company_settings
3. **Warning messages**: Show deprecation warnings in UI
4. **Grace period**: 30 days before removing company_settings entirely

### Migration Script for Users
```sql
-- Run this after deploying new version
-- Ensures all projects have an organization

INSERT INTO organizations (name, address, phone, email, website, logo_url)
SELECT company_name, address, phone, email, website, logo_url
FROM company_settings
ON CONFLICT DO NOTHING;

UPDATE projects
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;
```

## Testing Checklist

### Database Tests
- [ ] Create organization successfully
- [ ] Update organization details
- [ ] Delete organization (with safety checks)
- [ ] Query organizations list
- [ ] RLS policies work correctly
- [ ] Foreign key constraints enforced

### UI Tests
- [ ] List organizations page loads
- [ ] Create new organization works
- [ ] Edit organization saves changes
- [ ] Delete organization with confirmation
- [ ] Project creation requires organization
- [ ] Organization dropdown shows active orgs only
- [ ] Project detail shows correct organization

### Report Tests
- [ ] Introduction shows correct organization
- [ ] Executive summary shows correct organization
- [ ] Logo renders correctly in PDFs
- [ ] Address/contact info correct in reports
- [ ] Different projects use different org data
- [ ] Excel exports include organization data

### Edge Cases
- [ ] Project with deleted organization (handle gracefully)
- [ ] No active organizations (prevent project creation)
- [ ] Organization with no logo (use placeholder)
- [ ] Very long organization names (truncate/wrap)
- [ ] Special characters in organization name
- [ ] Multiple users editing same organization

## Security Considerations

### Access Control
- **Organization Management**: Admin users only
- **Organization Selection**: All authenticated users
- **Organization Data Reading**: All authenticated users (for reports)

### Data Validation
- Organization name required (not empty)
- Email format validation
- Website URL format validation
- Logo file size limits (5MB)
- Prevent deleting organization with active projects

### Audit Trail
- Log organization creation/updates
- Track which user created/modified organization
- Record organization changes in audit log

## Performance Considerations

### Database Indexes
```sql
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);
CREATE INDEX idx_organizations_name ON organizations(name);
```

### Caching Strategy
- Cache organization list for 5 minutes
- Invalidate cache on organization CRUD operations
- Cache organization logo URLs (CDN)

### Query Optimization
- Use JOINs instead of multiple queries
- Fetch organization data with project in single query
- Preload organization list on app initialization

## Rollback Plan

### If Issues Arise
1. **Revert RPC functions** to use `company_settings`
2. **Hide organization UI** (feature flag)
3. **Projects still work** (organization_id nullable temporarily)
4. **Reports still generate** using fallback logic

### Rollback SQL
```sql
-- Make organization_id nullable again
ALTER TABLE projects ALTER COLUMN organization_id DROP NOT NULL;

-- Restore old RPC functions (from backup)
-- ... (restore SQL from previous migration)
```

## Success Metrics

### Quantitative
- Zero data loss during migration
- <1% increase in report generation time
- 100% of projects have valid organization_id
- All reports render with correct branding

### Qualitative
- Users can manage multiple organizations
- Project-organization relationship is clear
- Report branding is automatically correct
- No manual organization selection in reports needed

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database | 2 days | None |
| Phase 2: Org Management UI | 3 days | Phase 1 |
| Phase 3: Project Creation | 2 days | Phase 2 |
| Phase 4: Report Testing | 2 days | Phase 3 |
| Phase 5: Documentation | 2 days | Phase 4 |
| **Total** | **11 days** | Sequential |

## Next Steps

1. **Review and approve this plan** with stakeholders
2. **Create database migration file** (first PR)
3. **Implement UI components** (second PR)
4. **Update report functions** (third PR)
5. **Test end-to-end** in staging environment
6. **Deploy to production** with migration script
7. **Monitor and support** during rollout

---

**Status**: Ready for implementation
**Created**: March 4, 2026
**Owner**: Development Team
