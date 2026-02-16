/*
  # Restore Missing Inspection App Tables and Functions
  
  ## Overview
  This migration restores all tables that were defined in the inspection app schema
  but never applied to the database. The root cause was that the database had an old
  schema from 2025 (jobs/quotes system) and the 2026 inspection app migrations were
  never fully applied.
  
  ## Tables Restored
  1. **user_profiles** - User roles and profile information
  2. **form_templates** - Dynamic form templates for inspections
  3. **member_templates** - Reusable member type templates
  4. **organization_settings** - Company settings and branding
  5. **steel_member_library** - NZ Steel member reference library
  6. **fire_protection_materials** - Fire protection products registry
  7. **company_settings** - Company profile and contact information
  8. **export_attachments** - Project export attachments
  9. **material_library** - Master coating materials library
  10. **report_profiles** - Report configuration profiles
  11. **inspection_dynamic_fields** - Dynamic inspection field values
  12. **ncr_dynamic_fields** - Dynamic NCR field values
  13. **material_docs** - Material document linkages
  
  ## RPC Functions Restored
  1. **get_introduction_data** - Fetches project introduction data
  2. **get_executive_summary_data** - Aggregates executive summary stats
  3. **search_steel_members** - Searches steel member library
  
  ## Security
  - RLS enabled on all tables
  - Role-based access control using user_profiles
  - Proper foreign key constraints
*/

-- =====================================================
-- 1) USER PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'inspector', 'client')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 2) FORM TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  applies_to text NOT NULL CHECK (applies_to IN ('intumescent', 'cementitious', 'both', 'ncr', 'general')),
  template_json jsonb NOT NULL DEFAULT '{"sections": []}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read form templates"
  ON form_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage form templates"
  ON form_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 3) MEMBER TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS member_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  element_type_default text CHECK (element_type_default IN ('beam', 'column', 'brace', 'other')),
  measurement_method_default text DEFAULT 'dft' CHECK (measurement_method_default IN ('dft', 'thickness', 'both')),
  checklist_json jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE member_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read member templates"
  ON member_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage member templates"
  ON member_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 4) ORGANIZATION SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  logo_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read organization settings"
  ON organization_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage organization settings"
  ON organization_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 5) STEEL MEMBER LIBRARY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS steel_member_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designation text NOT NULL,
  section_type text NOT NULL CHECK (section_type IN ('UB', 'UC', 'PFC', 'SHS', 'RHS', 'CHS', 'Angle')),
  depth_mm numeric,
  width_mm numeric,
  mass_per_m numeric,
  tw_mm numeric,
  tf_mm numeric,
  r_mm numeric,
  area_cm2 numeric,
  ix_cm4 numeric,
  iy_cm4 numeric,
  zx_cm3 numeric,
  zy_cm3 numeric,
  perimeter_m numeric,
  hp_per_a numeric,
  country_standard text DEFAULT 'NZ',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_steel_member_designation ON steel_member_library(designation);
CREATE INDEX IF NOT EXISTS idx_steel_member_type ON steel_member_library(section_type);

ALTER TABLE steel_member_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read steel member library"
  ON steel_member_library FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage steel member library"
  ON steel_member_library FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 6) FIRE PROTECTION MATERIALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS fire_protection_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer text NOT NULL,
  product_name text NOT NULL,
  product_code text,
  material_type text NOT NULL CHECK (material_type IN ('intumescent', 'cementitious', 'board', 'spray')),
  substrate_types text[] DEFAULT '{}',
  frr_ratings text[] DEFAULT '{}',
  application_method text,
  coverage_rate_m2_per_litre numeric,
  dft_range_microns_min int,
  dft_range_microns_max int,
  recoat_time_hours numeric,
  cure_time_hours numeric,
  voc_content_g_per_litre numeric,
  data_sheet_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fire_materials_manufacturer ON fire_protection_materials(manufacturer);
CREATE INDEX IF NOT EXISTS idx_fire_materials_type ON fire_protection_materials(material_type);

ALTER TABLE fire_protection_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fire protection materials"
  ON fire_protection_materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage fire protection materials"
  ON fire_protection_materials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 7) COMPANY SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage company settings"
  ON company_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 8) EXPORT ATTACHMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS export_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  attachment_title text NOT NULL,
  attachment_type text NOT NULL CHECK (attachment_type IN ('pdf', 'image', 'document')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  appendix_label text,
  appendix_caption text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_export_attachments_project ON export_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_export_attachments_type ON export_attachments(attachment_type);

ALTER TABLE export_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read export attachments"
  ON export_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage export attachments"
  ON export_attachments FOR ALL
  TO authenticated
  USING (true);

-- =====================================================
-- 9) MATERIAL LIBRARY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS material_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer text NOT NULL,
  product_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('primer', 'intumescent', 'topcoat', 'cementitious', 'other')),
  limits_json jsonb DEFAULT '{
    "min_temp_c": 5,
    "max_temp_c": 35,
    "max_rh_pct": 85,
    "dew_point_spread_min_c": 3
  }'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_library_type ON material_library(type);
CREATE INDEX IF NOT EXISTS idx_material_library_product ON material_library(product_name);

ALTER TABLE material_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read materials"
  ON material_library FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage materials"
  ON material_library FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 10) REPORT PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS report_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name text NOT NULL,
  config_json jsonb DEFAULT '{
    "cover_page": {
      "show_client": true,
      "show_contractor": true,
      "show_site_address": true,
      "show_date": true,
      "show_inspector": true
    },
    "sections": {
      "executive_summary": true,
      "introduction": true,
      "references": true,
      "standard_checks": true,
      "dft_summary": true,
      "visual_inspection": true,
      "ncr_register": true,
      "appendices": true
    }
  }'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read report profiles"
  ON report_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage report profiles"
  ON report_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 11) INSPECTION DYNAMIC FIELDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inspection_dynamic_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  template_id uuid REFERENCES form_templates(id),
  values_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_dynamic_fields_inspection ON inspection_dynamic_fields(inspection_id);

ALTER TABLE inspection_dynamic_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read inspection dynamic fields"
  ON inspection_dynamic_fields FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage inspection dynamic fields"
  ON inspection_dynamic_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- =====================================================
-- 12) NCR DYNAMIC FIELDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ncr_dynamic_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_id uuid NOT NULL REFERENCES ncrs(id) ON DELETE CASCADE,
  template_id uuid REFERENCES form_templates(id),
  values_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ncr_dynamic_fields_ncr ON ncr_dynamic_fields(ncr_id);

ALTER TABLE ncr_dynamic_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read ncr dynamic fields"
  ON ncr_dynamic_fields FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can manage ncr dynamic fields"
  ON ncr_dynamic_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- =====================================================
-- 13) MATERIAL DOCS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS material_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES material_library(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_docs_material ON material_docs(material_id);

ALTER TABLE material_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read material docs"
  ON material_docs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage material docs"
  ON material_docs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Function 1: Get Introduction Data
CREATE OR REPLACE FUNCTION get_introduction_data(p_project_id uuid)
RETURNS TABLE (
  project_name text,
  client_name text,
  main_contractor text,
  site_address text,
  project_ref text,
  start_date date,
  standards_json jsonb,
  company_name text,
  company_address text,
  company_phone text,
  company_email text
) LANGUAGE sql STABLE AS $$
  SELECT
    p.name as project_name,
    p.client_name,
    p.main_contractor,
    p.site_address,
    p.project_ref,
    p.start_date,
    p.standards_json,
    cs.company_name,
    cs.address as company_address,
    cs.phone as company_phone,
    cs.email as company_email
  FROM projects p
  LEFT JOIN company_settings cs ON true
  WHERE p.id = p_project_id
  LIMIT 1;
$$;

-- Function 2: Get Executive Summary Data
CREATE OR REPLACE FUNCTION get_executive_summary_data(p_project_id uuid)
RETURNS TABLE (
  total_members bigint,
  inspected_members bigint,
  passed_members bigint,
  failed_members bigint,
  total_ncrs bigint,
  open_ncrs bigint,
  closed_ncrs bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT COUNT(*) FROM members WHERE project_id = p_project_id) as total_members,
    (SELECT COUNT(*) FROM inspections WHERE project_id = p_project_id) as inspected_members,
    (SELECT COUNT(*) FROM inspections WHERE project_id = p_project_id AND result = 'pass') as passed_members,
    (SELECT COUNT(*) FROM inspections WHERE project_id = p_project_id AND result = 'fail') as failed_members,
    (SELECT COUNT(*) FROM ncrs WHERE project_id = p_project_id) as total_ncrs,
    (SELECT COUNT(*) FROM ncrs WHERE project_id = p_project_id AND status IN ('open', 'in_progress')) as open_ncrs,
    (SELECT COUNT(*) FROM ncrs WHERE project_id = p_project_id AND status IN ('resolved', 'closed')) as closed_ncrs;
$$;

-- Function 3: Search Steel Members
CREATE OR REPLACE FUNCTION search_steel_members(search_term text)
RETURNS TABLE (
  id uuid,
  designation text,
  section_type text,
  depth_mm numeric,
  width_mm numeric,
  mass_per_m numeric
) LANGUAGE sql STABLE AS $$
  SELECT
    id,
    designation,
    section_type,
    depth_mm,
    width_mm,
    mass_per_m
  FROM steel_member_library
  WHERE designation ILIKE '%' || search_term || '%'
     OR section_type ILIKE '%' || search_term || '%'
  ORDER BY designation
  LIMIT 50;
$$;

-- =====================================================
-- SEED DEFAULT DATA
-- =====================================================

-- Insert default organization settings if none exist
INSERT INTO organization_settings (organization_name)
SELECT 'My Organization'
WHERE NOT EXISTS (SELECT 1 FROM organization_settings);

-- Insert default company settings if none exist
INSERT INTO company_settings (company_name, address, email)
SELECT 'P&R Consulting Limited', 'New Zealand', 'info@prconsulting.nz'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);