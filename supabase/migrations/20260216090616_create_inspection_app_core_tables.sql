/*
  # Create Core Inspection App Tables
  
  ## Overview
  Creates the essential tables needed for the inspection app to function.
  This migration adds tables that are referenced by the code but missing from the database.
  
  ## Tables Created
  1. documents - File storage references
  2. members - Steel member register
  3. inspections - Inspection records
  4. ncrs - Non-conformance reports
  5. drawing_pins - Location pins on drawings
  
  ## Security
  - RLS enabled on all tables
  - Authenticated users can access all data
*/

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('drawing', 'fire_schedule', 'pds', 'sds', 'ncr_photo', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  uploaded_by_user_id uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage documents"
  ON documents FOR ALL
  TO authenticated
  USING (true);

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_mark text NOT NULL,
  element_type text CHECK (element_type IN ('beam', 'column', 'brace', 'other')),
  section text,
  level text,
  block text,
  frr_minutes int,
  coating_system text,
  required_dft_microns int,
  required_thickness_mm numeric,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_project ON members(project_id);
CREATE INDEX IF NOT EXISTS idx_members_mark ON members(member_mark);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage members"
  ON members FOR ALL
  TO authenticated
  USING (true);

-- Inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inspection_date date DEFAULT CURRENT_DATE,
  inspector_user_id uuid REFERENCES auth.users(id),
  result text CHECK (result IN ('pass', 'fail', 'conditional')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspections_member ON inspections(member_id);
CREATE INDEX IF NOT EXISTS idx_inspections_project ON inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage inspections"
  ON inspections FOR ALL
  TO authenticated
  USING (true);

-- NCRs table
CREATE TABLE IF NOT EXISTS ncrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ncr_number text NOT NULL,
  title text NOT NULL,
  description text,
  severity text CHECK (severity IN ('minor', 'major', 'critical')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  raised_by_user_id uuid REFERENCES auth.users(id),
  raised_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ncrs_project ON ncrs(project_id);
CREATE INDEX IF NOT EXISTS idx_ncrs_number ON ncrs(ncr_number);
CREATE INDEX IF NOT EXISTS idx_ncrs_status ON ncrs(status);

ALTER TABLE ncrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view NCRs"
  ON ncrs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage NCRs"
  ON ncrs FOR ALL
  TO authenticated
  USING (true);

-- Drawing Pins table
CREATE TABLE IF NOT EXISTS drawing_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  x_percent numeric NOT NULL,
  y_percent numeric NOT NULL,
  page_number int DEFAULT 1,
  label text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drawing_pins_document ON drawing_pins(document_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_member ON drawing_pins(member_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_project ON drawing_pins(project_id);

ALTER TABLE drawing_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view drawing pins"
  ON drawing_pins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage drawing pins"
  ON drawing_pins FOR ALL
  TO authenticated
  USING (true);