/*
  # Add Multi-Organization Support

  ## Overview
  Transform the system from single-organization to multi-organization support.
  Projects can now be assigned to specific organizations, and reports will automatically
  use the correct organization branding.

  ## Changes
  1. Create `organizations` table to store multiple organizations
  2. Migrate existing `company_settings` data to `organizations`
  3. Add `organization_id` foreign key to `projects` table
  4. Update RPC functions to use project's organization instead of global company_settings
  5. Add RLS policies for organizations table
  6. Create indexes for performance

  ## Security
  - RLS enabled on organizations table
  - All users can view organizations (needed for project creation and reports)
  - Only admin users can create/update/delete organizations
*/

-- ============================================================================
-- 1. CREATE ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT organizations_name_not_empty CHECK (length(trim(name)) > 0)
);

COMMENT ON TABLE organizations IS 'Stores multiple organizations for multi-tenant support. Each project belongs to one organization.';

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS POLICIES FOR ORGANIZATIONS
-- ============================================================================

CREATE POLICY "Users can view organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete organizations"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 3. MIGRATE EXISTING COMPANY_SETTINGS DATA
-- ============================================================================

DO $$
DECLARE
  v_existing_org_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
    IF EXISTS (SELECT 1 FROM company_settings LIMIT 1) THEN
      INSERT INTO organizations (name, address, phone, email, website, logo_url, is_active)
      SELECT
        COALESCE(company_name, 'Default Organization'),
        address,
        phone,
        email,
        website,
        logo_url,
        true
      FROM company_settings
      LIMIT 1
      RETURNING id INTO v_existing_org_id;

      RAISE NOTICE 'Migrated existing company_settings to organizations table';
    ELSE
      INSERT INTO organizations (name, is_active)
      VALUES ('Default Organization', true)
      RETURNING id INTO v_existing_org_id;

      RAISE NOTICE 'Created default organization';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. ADD ORGANIZATION_ID TO PROJECTS TABLE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects'
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE projects
      ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE RESTRICT;
  END IF;
END $$;

UPDATE projects
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL;

ALTER TABLE projects
  ALTER COLUMN organization_id SET NOT NULL;

COMMENT ON COLUMN projects.organization_id IS 'Foreign key to organizations table. Determines which organization branding appears in reports.';

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_organization_id
  ON projects(organization_id);

CREATE INDEX IF NOT EXISTS idx_organizations_is_active
  ON organizations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_organizations_name
  ON organizations(name);

-- ============================================================================
-- 6. UPDATE RPC FUNCTIONS TO USE ORGANIZATION_ID
-- ============================================================================

DROP FUNCTION IF EXISTS get_introduction_data(uuid);

CREATE OR REPLACE FUNCTION get_introduction_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  company_data jsonb;
  project_data jsonb;
  client_data jsonb;
  scope_data jsonb;
  inspection_dates_data jsonb;
  blocks_levels_data jsonb;
  drawings_pins_data jsonb;
  has_intumescent boolean;
  has_cementitious boolean;
  has_board boolean;
BEGIN
  SELECT jsonb_build_object(
    'company_name', COALESCE(o.name, 'Organization'),
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

  IF company_data IS NULL THEN
    SELECT jsonb_build_object(
      'company_name', COALESCE(cs.company_name, 'P&R Consulting Limited'),
      'company_logo_url', cs.logo_url,
      'address', cs.address,
      'phone', cs.phone,
      'email', cs.email,
      'website', cs.website
    )
    INTO company_data
    FROM company_settings cs
    LIMIT 1;
  END IF;

  SELECT jsonb_build_object(
    'project_name', p.name,
    'site_address', p.site_address,
    'project_number', p.project_ref,
    'client_id', p.client_id
  )
  INTO project_data
  FROM projects p
  WHERE p.id = p_project_id;

  SELECT jsonb_build_object(
    'name', c.name,
    'contact_name', c.contact_person
  )
  INTO client_data
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.id = p_project_id;

  SELECT
    COUNT(*) FILTER (WHERE fpm.material_type ILIKE '%intumescent%') > 0,
    COUNT(*) FILTER (WHERE fpm.material_type ILIKE '%cementitious%') > 0,
    COUNT(*) FILTER (WHERE fpm.material_type ILIKE '%board%') > 0
  INTO
    has_intumescent,
    has_cementitious,
    has_board
  FROM members m
  LEFT JOIN fire_protection_materials fpm ON fpm.id = m.coating_system::uuid
  WHERE m.project_id = p_project_id;

  scope_data := jsonb_build_object(
    'has_intumescent', COALESCE(has_intumescent, false),
    'has_cementitious', COALESCE(has_cementitious, false),
    'has_board', COALESCE(has_board, false)
  );

  SELECT jsonb_build_object(
    'min_date', MIN(i.inspection_date_time),
    'max_date', MAX(i.inspection_date_time),
    'has_failures', COUNT(*) FILTER (WHERE i.result = 'fail') > 0
  )
  INTO inspection_dates_data
  FROM inspections i
  WHERE i.project_id = p_project_id;

  SELECT jsonb_build_object(
    'blocks', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY name)
       FROM site_manager_blocks WHERE project_id = p_project_id), '[]'::jsonb
    ),
    'levels', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY name)
       FROM site_manager_levels WHERE project_id = p_project_id), '[]'::jsonb
    )
  )
  INTO blocks_levels_data;

  SELECT jsonb_build_object(
    'total_drawings', COUNT(DISTINCT d.id),
    'total_pins', COUNT(dp.id),
    'pins_by_status', COALESCE(
      (SELECT jsonb_object_agg(status, count)
       FROM (
         SELECT dp2.status, COUNT(*)::int as count
         FROM drawing_pins dp2
         INNER JOIN documents d2 ON d2.id = dp2.document_id
         WHERE d2.project_id = p_project_id
         GROUP BY dp2.status
       ) status_counts
      ), '{}'::jsonb
    ),
    'pins_by_type', COALESCE(
      (SELECT jsonb_object_agg(steel_type, count)
       FROM (
         SELECT dp2.steel_type, COUNT(*)::int as count
         FROM drawing_pins dp2
         INNER JOIN documents d2 ON d2.id = dp2.document_id
         WHERE d2.project_id = p_project_id
         AND dp2.steel_type IS NOT NULL
         GROUP BY dp2.steel_type
       ) type_counts
      ), '{}'::jsonb
    ),
    'drawings_list', COALESCE(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'drawing_id', d.id,
           'document_id', d.id,
           'level_name', COALESCE(sml.name, 'Unknown'),
           'block_name', COALESCE(smb.name, 'Unknown'),
           'file_name', d.file_name,
           'pin_count', (
             SELECT COUNT(*)::int
             FROM drawing_pins dp3
             WHERE dp3.document_id = d.id
           )
         )
       )
       FROM documents d
       LEFT JOIN site_manager_levels sml ON sml.id = d.level_id
       LEFT JOIN site_manager_blocks smb ON smb.id = d.block_id
       WHERE d.project_id = p_project_id
       AND d.document_type = 'drawing'
      ), '[]'::jsonb
    )
  )
  INTO drawings_pins_data
  FROM documents d
  LEFT JOIN drawing_pins dp ON dp.document_id = d.id
  WHERE d.project_id = p_project_id
  AND d.document_type = 'drawing';

  result := jsonb_build_object(
    'company', company_data,
    'project', project_data,
    'client', client_data,
    'scope', scope_data,
    'inspection_dates', inspection_dates_data,
    'blocks_levels', blocks_levels_data,
    'drawings_pins', drawings_pins_data
  );

  RETURN result;
END;
$$;

DROP FUNCTION IF EXISTS get_executive_summary_data(uuid);

CREATE OR REPLACE FUNCTION get_executive_summary_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  company_data jsonb;
  project_data jsonb;
  stats_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'company_name', COALESCE(o.name, 'Organization'),
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

  IF company_data IS NULL THEN
    SELECT jsonb_build_object(
      'company_name', COALESCE(cs.company_name, 'P&R Consulting Limited'),
      'company_logo_url', cs.logo_url,
      'address', cs.address,
      'phone', cs.phone,
      'email', cs.email,
      'website', cs.website
    )
    INTO company_data
    FROM company_settings cs
    LIMIT 1;
  END IF;

  SELECT jsonb_build_object(
    'project_name', p.name,
    'client_name', p.client_name,
    'site_address', p.site_address,
    'project_ref', p.project_ref
  )
  INTO project_data
  FROM projects p
  WHERE p.id = p_project_id;

  SELECT jsonb_build_object(
    'total_inspections', COUNT(*),
    'passed', COUNT(*) FILTER (WHERE result = 'pass'),
    'failed', COUNT(*) FILTER (WHERE result = 'fail'),
    'pass_rate', CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE result = 'pass')::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0
    END,
    'date_range', jsonb_build_object(
      'min_date', MIN(inspection_date_time),
      'max_date', MAX(inspection_date_time)
    )
  )
  INTO stats_data
  FROM inspections
  WHERE project_id = p_project_id;

  result := jsonb_build_object(
    'company', company_data,
    'project', project_data,
    'stats', stats_data
  );

  RETURN result;
END;
$$;

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_organizations()
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  address text,
  phone text,
  email text,
  website text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.logo_url,
    o.address,
    o.phone,
    o.email,
    o.website
  FROM organizations o
  WHERE o.is_active = true
  ORDER BY o.name;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_organizations_updated_at'
  ) THEN
    CREATE TRIGGER update_organizations_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION prevent_organization_deletion()
RETURNS TRIGGER AS $$
DECLARE
  project_count integer;
BEGIN
  SELECT COUNT(*) INTO project_count
  FROM projects
  WHERE organization_id = OLD.id;

  IF project_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete organization: % projects are using this organization', project_count;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'prevent_organization_deletion_trigger'
  ) THEN
    CREATE TRIGGER prevent_organization_deletion_trigger
      BEFORE DELETE ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION prevent_organization_deletion();
  END IF;
END $$;
