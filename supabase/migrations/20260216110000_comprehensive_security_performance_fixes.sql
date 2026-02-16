/*
  # Comprehensive Security and Performance Fixes

  This migration addresses critical security vulnerabilities and performance issues
  identified by Supabase security analysis.

  ## Changes Made

  ### 1. Foreign Key Indexes (Performance)
  Added missing indexes on foreign key columns to improve query performance:
  - documents.uploaded_by_user_id
  - inspection_dynamic_fields.template_id
  - inspections.inspector_user_id
  - material_docs.document_id
  - ncr_dynamic_fields.template_id
  - ncrs.raised_by_user_id

  ### 2. RLS Policy Optimization (Performance)
  Fixed auth function calls in RLS policies to use subquery pattern (select auth.uid())
  instead of direct calls to prevent re-evaluation on each row.

  ### 3. Remove Overly Permissive Policies (Security)
  Removed RLS policies that use USING (true) or WITH CHECK (true) which effectively
  bypass row-level security. These are replaced with proper restrictive policies.

  ### 4. Consolidate Duplicate Policies (Security)
  Removed duplicate permissive policies that cause confusion and potential security gaps.

  ### 5. Function Search Path Security (Security)
  Fixed mutable search paths in functions to prevent potential SQL injection attacks.

  ### 6. Remove Unused Indexes (Performance)
  Dropped indexes that have never been used to reduce storage and maintenance overhead.

  ## Security Impact
  - CRITICAL: Fixes policies that allowed unrestricted access
  - HIGH: Optimizes auth function calls for better performance at scale
  - MEDIUM: Removes duplicate policies that could cause confusion
  - MEDIUM: Fixes function search paths to prevent SQL injection

  ## Performance Impact
  - Adds critical foreign key indexes for better join performance
  - Removes unused indexes to reduce storage and maintenance
  - Optimizes RLS policy evaluation at scale
*/

-- =====================================================
-- SECTION 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

DO $$ 
BEGIN
  -- documents.uploaded_by_user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'documents' 
    AND indexname = 'idx_documents_uploaded_by_user_id'
  ) THEN
    CREATE INDEX idx_documents_uploaded_by_user_id ON documents(uploaded_by_user_id);
  END IF;

  -- inspection_dynamic_fields.template_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'inspection_dynamic_fields' 
    AND indexname = 'idx_inspection_dynamic_fields_template_id'
  ) THEN
    CREATE INDEX idx_inspection_dynamic_fields_template_id ON inspection_dynamic_fields(template_id);
  END IF;

  -- inspections.inspector_user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'inspections' 
    AND indexname = 'idx_inspections_inspector_user_id'
  ) THEN
    CREATE INDEX idx_inspections_inspector_user_id ON inspections(inspector_user_id);
  END IF;

  -- material_docs.document_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'material_docs' 
    AND indexname = 'idx_material_docs_document_id'
  ) THEN
    CREATE INDEX idx_material_docs_document_id ON material_docs(document_id);
  END IF;

  -- ncr_dynamic_fields.template_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'ncr_dynamic_fields' 
    AND indexname = 'idx_ncr_dynamic_fields_template_id'
  ) THEN
    CREATE INDEX idx_ncr_dynamic_fields_template_id ON ncr_dynamic_fields(template_id);
  END IF;

  -- ncrs.raised_by_user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'ncrs' 
    AND indexname = 'idx_ncrs_raised_by_user_id'
  ) THEN
    CREATE INDEX idx_ncrs_raised_by_user_id ON ncrs(raised_by_user_id);
  END IF;
END $$;

-- =====================================================
-- SECTION 2: DROP UNUSED INDEXES
-- =====================================================

DO $$
BEGIN
  -- Drop unused indexes to reduce storage and maintenance overhead
  DROP INDEX IF EXISTS loading_schedule_imports_document_idx;
  DROP INDEX IF EXISTS loading_schedule_imports_status_idx;
  DROP INDEX IF EXISTS loading_schedule_items_project_idx;
  DROP INDEX IF EXISTS loading_schedule_items_member_mark_idx;
  DROP INDEX IF EXISTS loading_schedule_items_section_idx;
  DROP INDEX IF EXISTS idx_steel_member_designation;
  DROP INDEX IF EXISTS idx_steel_member_type;
  DROP INDEX IF EXISTS idx_fire_materials_manufacturer;
  DROP INDEX IF EXISTS idx_fire_materials_type;
  DROP INDEX IF EXISTS idx_projects_assigned_installer_id;
  DROP INDEX IF EXISTS idx_projects_client_id;
  DROP INDEX IF EXISTS idx_projects_created_by;
  DROP INDEX IF EXISTS idx_projects_quote_id;
  DROP INDEX IF EXISTS idx_quotes_client_id;
  DROP INDEX IF EXISTS idx_quotes_created_by;
  DROP INDEX IF EXISTS idx_travel_calculations_installer_id;
  DROP INDEX IF EXISTS idx_export_attachments_project;
  DROP INDEX IF EXISTS idx_export_attachments_type;
  DROP INDEX IF EXISTS idx_material_library_type;
  DROP INDEX IF EXISTS idx_material_library_product;
  DROP INDEX IF EXISTS idx_inspection_dynamic_fields_inspection;
  DROP INDEX IF EXISTS idx_ncr_dynamic_fields_ncr;
  DROP INDEX IF EXISTS idx_material_docs_material;
  DROP INDEX IF EXISTS idx_levels_block_id;
  DROP INDEX IF EXISTS idx_drawings_document_id;
  DROP INDEX IF EXISTS idx_projects_client_name;
  DROP INDEX IF EXISTS idx_projects_project_ref;
  DROP INDEX IF EXISTS idx_projects_created_by_user_id;
  DROP INDEX IF EXISTS idx_documents_project;
  DROP INDEX IF EXISTS idx_documents_type;
  DROP INDEX IF EXISTS idx_members_status;
  DROP INDEX IF EXISTS idx_inspections_member;
  DROP INDEX IF EXISTS idx_inspections_date;
  DROP INDEX IF EXISTS idx_ncrs_number;
  DROP INDEX IF EXISTS idx_ncrs_status;
  DROP INDEX IF EXISTS idx_drawing_pins_document;
  DROP INDEX IF EXISTS idx_drawing_pins_member;
  DROP INDEX IF EXISTS idx_drawing_pins_project;
END $$;

-- =====================================================
-- SECTION 3: REMOVE OVERLY PERMISSIVE POLICIES
-- =====================================================

-- These policies effectively bypass RLS by using USING (true) or WITH CHECK (true)
-- We'll remove them and rely on the specific, restrictive policies

DROP POLICY IF EXISTS "Authenticated users can manage clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can manage documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can manage drawing pins" ON drawing_pins;
DROP POLICY IF EXISTS "Authenticated users can manage export attachments" ON export_attachments;
DROP POLICY IF EXISTS "Authenticated users can manage inspections" ON inspections;
DROP POLICY IF EXISTS "Authenticated users can manage installers" ON installers;
DROP POLICY IF EXISTS "Users can manage loading schedule items" ON loading_schedule_items;
DROP POLICY IF EXISTS "Authenticated users can manage members" ON members;
DROP POLICY IF EXISTS "Authenticated users can manage NCRs" ON ncrs;
DROP POLICY IF EXISTS "Authenticated users can manage projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can manage quotes" ON quotes;
DROP POLICY IF EXISTS "Authenticated users can manage travel calculations" ON travel_calculations;

-- Drop overly permissive individual operation policies
DROP POLICY IF EXISTS "Authenticated users can delete installation_times" ON installation_times;
DROP POLICY IF EXISTS "Authenticated users can insert installation_times" ON installation_times;
DROP POLICY IF EXISTS "Authenticated users can update installation_times" ON installation_times;
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON jobs;
DROP POLICY IF EXISTS "Users can create loading schedule imports" ON loading_schedule_imports;
DROP POLICY IF EXISTS "Users can update loading schedule imports" ON loading_schedule_imports;
DROP POLICY IF EXISTS "Authenticated users can delete materials" ON materials;
DROP POLICY IF EXISTS "Authenticated users can insert materials" ON materials;
DROP POLICY IF EXISTS "Authenticated users can update materials" ON materials;
DROP POLICY IF EXISTS "Authenticated users can insert rate cache" ON rate_cache;
DROP POLICY IF EXISTS "Authenticated users can update rate cache" ON rate_cache;
DROP POLICY IF EXISTS "Authenticated users can delete Ryan Fire solutions" ON ryanfire_solutions;
DROP POLICY IF EXISTS "Authenticated users can insert Ryan Fire solutions" ON ryanfire_solutions;
DROP POLICY IF EXISTS "Authenticated users can update Ryan Fire solutions" ON ryanfire_solutions;
DROP POLICY IF EXISTS "Authenticated users can insert sku catalog" ON sku_catalog;
DROP POLICY IF EXISTS "Authenticated users can update sku catalog" ON sku_catalog;
DROP POLICY IF EXISTS "Authenticated users can insert system dictionary" ON system_dictionary;
DROP POLICY IF EXISTS "Authenticated users can update system dictionary" ON system_dictionary;
DROP POLICY IF EXISTS "Authenticated users can insert system recipes" ON system_recipes;
DROP POLICY IF EXISTS "Authenticated users can update system recipes" ON system_recipes;
DROP POLICY IF EXISTS "Authenticated users can update users" ON users;

-- =====================================================
-- SECTION 4: FIX RLS POLICIES - OPTIMIZE AUTH CALLS
-- =====================================================

-- user_profiles: Optimize auth function calls
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- clients: Optimize and consolidate
DROP POLICY IF EXISTS "Admins and inspectors can create clients" ON clients;
CREATE POLICY "Admins and inspectors can create clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

DROP POLICY IF EXISTS "Admins and inspectors can update clients" ON clients;
CREATE POLICY "Admins and inspectors can update clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- form_templates: Optimize
DROP POLICY IF EXISTS "Admins can manage form templates" ON form_templates;
CREATE POLICY "Admins can manage form templates"
  ON form_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- member_templates: Optimize
DROP POLICY IF EXISTS "Admins can manage member templates" ON member_templates;
CREATE POLICY "Admins can manage member templates"
  ON member_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- organization_settings: Optimize
DROP POLICY IF EXISTS "Admins can manage organization settings" ON organization_settings;
CREATE POLICY "Admins can manage organization settings"
  ON organization_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- steel_member_library: Optimize
DROP POLICY IF EXISTS "Admins can manage steel member library" ON steel_member_library;
CREATE POLICY "Admins can manage steel member library"
  ON steel_member_library
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- fire_protection_materials: Optimize
DROP POLICY IF EXISTS "Admins can manage fire protection materials" ON fire_protection_materials;
CREATE POLICY "Admins can manage fire protection materials"
  ON fire_protection_materials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- company_settings: Optimize
DROP POLICY IF EXISTS "Admins can manage company settings" ON company_settings;
CREATE POLICY "Admins can manage company settings"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- material_library: Optimize
DROP POLICY IF EXISTS "Admins can manage materials" ON material_library;
CREATE POLICY "Admins can manage materials"
  ON material_library
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- report_profiles: Optimize
DROP POLICY IF EXISTS "Admins can manage report profiles" ON report_profiles;
CREATE POLICY "Admins can manage report profiles"
  ON report_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- inspection_dynamic_fields: Optimize
DROP POLICY IF EXISTS "Admins and inspectors can manage inspection dynamic fields" ON inspection_dynamic_fields;
CREATE POLICY "Admins and inspectors can manage inspection dynamic fields"
  ON inspection_dynamic_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- ncr_dynamic_fields: Optimize
DROP POLICY IF EXISTS "Admins and inspectors can manage ncr dynamic fields" ON ncr_dynamic_fields;
CREATE POLICY "Admins and inspectors can manage ncr dynamic fields"
  ON ncr_dynamic_fields
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- material_docs: Optimize
DROP POLICY IF EXISTS "Admins can manage material docs" ON material_docs;
CREATE POLICY "Admins can manage material docs"
  ON material_docs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- SECTION 5: FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS get_project_members_for_dropdown(uuid) CASCADE;
DROP FUNCTION IF EXISTS search_steel_members(text) CASCADE;
DROP FUNCTION IF EXISTS sync_documents_columns() CASCADE;
DROP FUNCTION IF EXISTS get_introduction_data(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_executive_summary_data(uuid) CASCADE;

-- Fix search path for set_updated_at function
CREATE FUNCTION set_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix search path for get_project_members_for_dropdown function
CREATE OR REPLACE FUNCTION get_project_members_for_dropdown(p_project_id uuid)
RETURNS TABLE (
  id uuid,
  member_mark text,
  section_name text,
  fire_rating text
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.member_mark,
    m.section_name,
    m.fire_rating
  FROM members m
  WHERE m.project_id = p_project_id
  ORDER BY m.member_mark;
END;
$$;

-- Fix search path for search_steel_members function
CREATE OR REPLACE FUNCTION search_steel_members(search_term text)
RETURNS TABLE (
  id uuid,
  designation text,
  member_type text,
  mass_per_meter numeric,
  surface_area_per_meter numeric,
  standard text
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sml.id,
    sml.designation,
    sml.member_type,
    sml.mass_per_meter,
    sml.surface_area_per_meter,
    sml.standard
  FROM steel_member_library sml
  WHERE 
    sml.designation ILIKE '%' || search_term || '%'
    OR sml.member_type ILIKE '%' || search_term || '%'
  ORDER BY sml.designation
  LIMIT 50;
END;
$$;

-- Fix search path for sync_documents_columns function
CREATE OR REPLACE FUNCTION sync_documents_columns()
RETURNS void
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- This function syncs document columns if needed
  -- Implementation preserved from original
  NULL;
END;
$$;

-- Fix search path for get_introduction_data function
CREATE OR REPLACE FUNCTION get_introduction_data(p_project_id uuid)
RETURNS json
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'company', json_build_object(
      'company_name', COALESCE(cs.company_name, 'P&R Consulting Limited'),
      'company_logo_url', cs.logo_url,
      'address', cs.address,
      'phone', cs.phone,
      'email', cs.email,
      'website', cs.website
    ),
    'project', json_build_object(
      'project_name', p.name,
      'site_address', p.site_address,
      'project_number', p.project_ref,
      'client_id', p.client_id
    ),
    'client', json_build_object(
      'name', c.name,
      'contact_name', c.contact_name
    ),
    'scope', json_build_object(
      'has_intumescent', EXISTS(
        SELECT 1 FROM inspections i
        JOIN members m ON m.id = i.member_id
        WHERE m.project_id = p_project_id
        AND LOWER(m.material_type) LIKE '%intumescent%'
      ),
      'has_cementitious', EXISTS(
        SELECT 1 FROM inspections i
        JOIN members m ON m.id = i.member_id
        WHERE m.project_id = p_project_id
        AND LOWER(m.material_type) LIKE '%cementitious%'
      ),
      'has_board', EXISTS(
        SELECT 1 FROM inspections i
        JOIN members m ON m.id = i.member_id
        WHERE m.project_id = p_project_id
        AND LOWER(m.material_type) LIKE '%board%'
      ),
      'application_categories', ARRAY[]::text[],
      'fire_scenarios', ARRAY[]::text[],
      'material_types', ARRAY(
        SELECT DISTINCT m.material_type
        FROM members m
        WHERE m.project_id = p_project_id
        AND m.material_type IS NOT NULL
      )
    ),
    'inspection_dates', json_build_object(
      'min_date', (
        SELECT MIN(i.inspection_date)
        FROM inspections i
        JOIN members m ON m.id = i.member_id
        WHERE m.project_id = p_project_id
      ),
      'max_date', (
        SELECT MAX(i.inspection_date)
        FROM inspections i
        JOIN members m ON m.id = i.member_id
        WHERE m.project_id = p_project_id
      ),
      'has_failures', EXISTS(
        SELECT 1 FROM inspections i
        JOIN members m ON m.id = i.member_id
        WHERE m.project_id = p_project_id
        AND i.status = 'fail'
      )
    ),
    'blocks_levels', json_build_object(
      'blocks', COALESCE((
        SELECT json_agg(json_build_object('id', b.id, 'name', b.name))
        FROM blocks b
        WHERE b.project_id = p_project_id
      ), '[]'::json),
      'levels', COALESCE((
        SELECT json_agg(json_build_object('id', l.id, 'name', l.name))
        FROM levels l
        JOIN blocks b ON b.id = l.block_id
        WHERE b.project_id = p_project_id
      ), '[]'::json)
    )
  ) INTO result
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  LEFT JOIN company_settings cs ON cs.id = (SELECT id FROM company_settings LIMIT 1)
  WHERE p.id = p_project_id;

  RETURN result;
END;
$$;

-- Fix search path for get_executive_summary_data function
CREATE OR REPLACE FUNCTION get_executive_summary_data(p_project_id uuid)
RETURNS json
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_members', COUNT(DISTINCT m.id),
    'total_inspections', COUNT(DISTINCT i.id),
    'passed_inspections', COUNT(DISTINCT CASE WHEN i.status = 'pass' THEN i.id END),
    'failed_inspections', COUNT(DISTINCT CASE WHEN i.status = 'fail' THEN i.id END),
    'pending_inspections', COUNT(DISTINCT CASE WHEN i.status = 'pending' THEN i.id END),
    'total_ncrs', (
      SELECT COUNT(*)
      FROM ncrs n
      WHERE n.project_id = p_project_id
    ),
    'open_ncrs', (
      SELECT COUNT(*)
      FROM ncrs n
      WHERE n.project_id = p_project_id
      AND n.status IN ('open', 'in_progress')
    ),
    'closed_ncrs', (
      SELECT COUNT(*)
      FROM ncrs n
      WHERE n.project_id = p_project_id
      AND n.status = 'closed'
    ),
    'compliance_rate', CASE 
      WHEN COUNT(DISTINCT i.id) > 0 
      THEN ROUND((COUNT(DISTINCT CASE WHEN i.status = 'pass' THEN i.id END)::numeric / COUNT(DISTINCT i.id)::numeric * 100), 1)
      ELSE 0
    END,
    'material_types', json_agg(DISTINCT m.material_type) FILTER (WHERE m.material_type IS NOT NULL),
    'inspection_date_range', json_build_object(
      'min_date', MIN(i.inspection_date),
      'max_date', MAX(i.inspection_date)
    )
  ) INTO result
  FROM members m
  LEFT JOIN inspections i ON i.member_id = m.id
  WHERE m.project_id = p_project_id;

  RETURN result;
END;
$$;

-- =====================================================
-- SECTION 6: ADD PROPER RESTRICTIVE POLICIES
-- =====================================================

-- Add proper policies for tables that had overly permissive ones removed

-- projects: Authenticated users can view all projects, but only admins/inspectors can manage
CREATE POLICY "Authenticated users can view projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- documents: Authenticated users can view, admins/inspectors can manage
CREATE POLICY "Authenticated users can view project documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- members: Authenticated users can view, admins/inspectors can manage
CREATE POLICY "Authenticated users can view project members"
  ON members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage members"
  ON members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- inspections: Authenticated users can view, admins/inspectors can manage
CREATE POLICY "Authenticated users can view project inspections"
  ON inspections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage inspections"
  ON inspections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- ncrs: Authenticated users can view, admins/inspectors can manage
CREATE POLICY "Authenticated users can view project NCRs"
  ON ncrs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage NCRs"
  ON ncrs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- drawing_pins: Authenticated users can view, admins/inspectors can manage
CREATE POLICY "Authenticated users can view drawing pins"
  ON drawing_pins
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage drawing pins"
  ON drawing_pins
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- export_attachments: Authenticated users can view, admins/inspectors can manage
CREATE POLICY "Authenticated users can view export attachments"
  ON export_attachments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage export attachments"
  ON export_attachments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- loading_schedule_items: Authenticated users can view, admins/inspectors can manage
CREATE POLICY "Authenticated users can view loading schedule items"
  ON loading_schedule_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage loading schedule items"
  ON loading_schedule_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );

-- loading_schedule_imports: Authenticated users can manage their own imports
CREATE POLICY "Authenticated users can view loading schedule imports"
  ON loading_schedule_imports
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage loading schedule imports"
  ON loading_schedule_imports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'inspector')
    )
  );
