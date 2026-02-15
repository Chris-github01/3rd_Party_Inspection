/*
  # Add Clients and Master Data Schema
  
  ## Overview
  Adds clients, master data libraries, report profiles, and template system.
  
  ## New Tables
  
  ### 1. clients
  - Client contact and billing information
  - Links to multiple projects
  
  ### 2. material_library
  - Master library of coating materials
  - Manufacturer info, product specs, environmental limits
  
  ### 3. member_templates
  - Reusable member type templates
  - Default inspection checklists
  
  ### 4. report_profiles
  - Configurable report formats and sections
  - Cover page and section toggles
  
  ### 5. form_templates
  - Dynamic form/inspection templates
  - JSON-based field definitions
  
  ### 6. inspection_dynamic_fields
  - Stores values from dynamic template fields
  
  ### 7. ncr_dynamic_fields
  - Stores dynamic NCR fields
  
  ## Updates to Existing Tables
  - projects: Add client_id and template references
  - material_checks: Add material_library_id reference
  
  ## Security
  - RLS enabled on all tables
  - Role-based access control
*/

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  main_contractor text,
  contact_name text,
  contact_email text,
  contact_phone text,
  billing_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update clients"
  ON clients FOR UPDATE
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

-- Material Library
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

-- Material Documents (links materials to documents)
CREATE TABLE IF NOT EXISTS material_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES material_library(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

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

-- Member Templates
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

-- Report Profiles
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
    },
    "references": [
      "ISO 19840 - Paints and varnishes - Corrosion protection",
      "ISO 8501-1 - Preparation of steel substrates",
      "FPA NZ COP-3 - Code of Practice for Passive Fire Protection"
    ]
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

-- Form Templates
CREATE TABLE IF NOT EXISTS form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  applies_to text NOT NULL CHECK (applies_to IN ('intumescent', 'cementitious', 'both', 'ncr', 'general')),
  template_json jsonb NOT NULL DEFAULT '{
    "sections": []
  }'::jsonb,
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

-- Inspection Dynamic Fields
CREATE TABLE IF NOT EXISTS inspection_dynamic_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  template_id uuid REFERENCES form_templates(id),
  values_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

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

-- NCR Dynamic Fields
CREATE TABLE IF NOT EXISTS ncr_dynamic_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_id uuid NOT NULL REFERENCES ncrs(id) ON DELETE CASCADE,
  template_id uuid REFERENCES form_templates(id),
  values_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

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

-- Update projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_report_profile_id uuid REFERENCES report_profiles(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS intumescent_template_id uuid REFERENCES form_templates(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cementitious_template_id uuid REFERENCES form_templates(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ncr_template_id uuid REFERENCES form_templates(id);

-- Update members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES member_templates(id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS measurement_method text DEFAULT 'dft' CHECK (measurement_method IN ('dft', 'thickness', 'both'));

-- Update material_checks table
ALTER TABLE material_checks ADD COLUMN IF NOT EXISTS material_library_id uuid REFERENCES material_library(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);
CREATE INDEX IF NOT EXISTS idx_material_library_type ON material_library(type);
CREATE INDEX IF NOT EXISTS idx_material_library_product ON material_library(product_name);
CREATE INDEX IF NOT EXISTS idx_material_docs_material ON material_docs(material_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_members_template ON members(template_id);
CREATE INDEX IF NOT EXISTS idx_inspection_dynamic_fields_inspection ON inspection_dynamic_fields(inspection_id);
CREATE INDEX IF NOT EXISTS idx_ncr_dynamic_fields_ncr ON ncr_dynamic_fields(ncr_id);

-- Trigger for clients updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
