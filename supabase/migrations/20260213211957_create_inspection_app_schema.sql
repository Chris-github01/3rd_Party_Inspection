/*
  # Third Party Coatings Inspector - Database Schema
  
  ## Overview
  Complete database schema for independent NACE-style audit inspections of fireproofing on structural steel.
  
  ## Tables Created
  
  ### 1. user_profiles
  - Extends auth.users with role and additional info
  - Roles: admin, inspector, client
  
  ### 2. projects
  - Main project container with client info, site details
  - Standards stored as JSONB
  - Tracks creator and timestamps
  
  ### 3. documents
  - File references for drawings, fire schedules, PDS, SDS
  - Links to Supabase Storage
  
  ### 4. members
  - Steel member register (beams, columns, etc.)
  - Tracks required coating specs and status
  
  ### 5. inspections
  - Individual inspection records per member
  - Location, appearance, pass/fail results
  
  ### 6. env_readings
  - Environmental conditions: temp, humidity, dew point
  - Conformance checks
  
  ### 7. surface_prep_checks
  - Surface preparation verification
  - Profile measurements
  
  ### 8. material_checks
  - Product verification and traceability
  
  ### 9. dft_batches
  - DFT measurement batches with statistics
  - Gauge calibration tracking
  
  ### 10. dft_readings
  - Individual DFT readings
  
  ### 11. photos
  - Photo evidence storage
  
  ### 12. drawing_pins
  - Location pins on drawing documents
  
  ### 13. ncrs
  - Non-conformance reports
  
  ### 14. ncr_actions
  - NCR corrective actions log
  
  ## Security
  - RLS enabled on all tables
  - Role-based access control
  - Inspectors can create/edit, clients read-only
*/

-- User profiles extending auth.users
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

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_name text NOT NULL,
  main_contractor text,
  site_address text,
  project_ref text,
  start_date date,
  notes text,
  standards_json jsonb DEFAULT '{"standards": ["ISO 19840", "ISO 8501-1", "FPA NZ COP-3"]}'::jsonb,
  created_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update projects"
  ON projects FOR UPDATE
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

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('drawing', 'fire_schedule', 'steel_schedule', 'pds', 'sds', 'other')),
  filename text NOT NULL,
  original_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  storage_path text NOT NULL,
  uploaded_by_user_id uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read project documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- Members
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
  required_thickness_mm numeric(10, 2),
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'pass', 'repair_required', 'closed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update members"
  ON members FOR UPDATE
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

-- Inspections
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  inspector_user_id uuid REFERENCES auth.users(id),
  inspection_date_time timestamptz DEFAULT now(),
  location_label text,
  level text,
  block text,
  appearance text CHECK (appearance IN ('conform', 'nonconform')),
  result text CHECK (result IN ('pass', 'fail', 'repair')),
  comments text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create inspections"
  ON inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update inspections"
  ON inspections FOR UPDATE
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

-- Environmental Readings
CREATE TABLE IF NOT EXISTS env_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  ambient_temp_c numeric(5, 2),
  steel_temp_c numeric(5, 2),
  relative_humidity_pct numeric(5, 2),
  dew_point_c numeric(5, 2),
  dew_point_spread_c numeric(5, 2),
  conforms boolean DEFAULT false,
  instrument text,
  instrument_serial text,
  photo_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE env_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read env readings"
  ON env_readings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create env readings"
  ON env_readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update env readings"
  ON env_readings FOR UPDATE
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

-- Surface Prep Checks
CREATE TABLE IF NOT EXISTS surface_prep_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  standard text DEFAULT 'SA 2.5 / ISO 8501-1',
  profile_min_um int,
  profile_max_um int,
  profile_avg_um int,
  method text,
  conforms boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE surface_prep_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read surface prep checks"
  ON surface_prep_checks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create surface prep checks"
  ON surface_prep_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update surface prep checks"
  ON surface_prep_checks FOR UPDATE
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

-- Material Checks
CREATE TABLE IF NOT EXISTS material_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  product_name text,
  batch_number text,
  primer text,
  topcoat text,
  pds_verified boolean DEFAULT false,
  sds_verified boolean DEFAULT false,
  traceability_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE material_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read material checks"
  ON material_checks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create material checks"
  ON material_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update material checks"
  ON material_checks FOR UPDATE
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

-- DFT Batches
CREATE TABLE IF NOT EXISTS dft_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  dft_batch_number text,
  gauge_make_model text DEFAULT 'Elcometer',
  gauge_serial text,
  calibration_due_date date,
  iso19840_acceptance text CHECK (iso19840_acceptance IN ('pass', 'fail', 'na')),
  dft_min_microns int,
  dft_max_microns int,
  dft_avg_microns numeric(10, 2),
  dft_stddev numeric(10, 2),
  readings_count int DEFAULT 0,
  exported_report_doc_id uuid REFERENCES documents(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dft_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read dft batches"
  ON dft_batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create dft batches"
  ON dft_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update dft batches"
  ON dft_batches FOR UPDATE
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

-- DFT Readings
CREATE TABLE IF NOT EXISTS dft_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dft_batch_id uuid NOT NULL REFERENCES dft_batches(id) ON DELETE CASCADE,
  reading_no int NOT NULL,
  value_microns int NOT NULL,
  face text CHECK (face IN ('web', 'flange1', 'flange2', 'other')),
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dft_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read dft readings"
  ON dft_readings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create dft readings"
  ON dft_readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update dft readings"
  ON dft_readings FOR UPDATE
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

-- Photos
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  type text CHECK (type IN ('before', 'after', 'defect', 'gauge', 'env', 'other')),
  filename text NOT NULL,
  original_name text NOT NULL,
  storage_path text NOT NULL,
  caption text,
  taken_at timestamptz DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read photos"
  ON photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create photos"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can delete photos"
  ON photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- Drawing Pins
CREATE TABLE IF NOT EXISTS drawing_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  inspection_id uuid REFERENCES inspections(id) ON DELETE SET NULL,
  x numeric(10, 8) NOT NULL,
  y numeric(10, 8) NOT NULL,
  pin_label text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drawing_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read drawing pins"
  ON drawing_pins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create drawing pins"
  ON drawing_pins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update drawing pins"
  ON drawing_pins FOR UPDATE
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

-- NCRs
CREATE TABLE IF NOT EXISTS ncrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE,
  ncr_number int NOT NULL,
  issue_type text CHECK (issue_type IN ('low_dft', 'damage', 'delamination', 'missing_area', 'wrong_system', 'other')),
  severity text CHECK (severity IN ('minor', 'major', 'critical')),
  description text NOT NULL,
  corrective_action_required text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'ready_for_reinspect', 'closed')),
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE ncrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read ncrs"
  ON ncrs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create ncrs"
  ON ncrs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update ncrs"
  ON ncrs FOR UPDATE
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

-- NCR Actions
CREATE TABLE IF NOT EXISTS ncr_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_id uuid NOT NULL REFERENCES ncrs(id) ON DELETE CASCADE,
  action_date timestamptz DEFAULT now(),
  action_by text NOT NULL,
  action_notes text NOT NULL,
  photo_id uuid REFERENCES photos(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ncr_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read ncr actions"
  ON ncr_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create ncr actions"
  ON ncr_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_members_project ON members(project_id);
CREATE INDEX IF NOT EXISTS idx_inspections_project ON inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_inspections_member ON inspections(member_id);
CREATE INDEX IF NOT EXISTS idx_dft_readings_batch ON dft_readings(dft_batch_id);
CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_inspection ON photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_document ON drawing_pins(document_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_member ON drawing_pins(member_id);
CREATE INDEX IF NOT EXISTS idx_ncrs_project ON ncrs(project_id);
CREATE INDEX IF NOT EXISTS idx_ncr_actions_ncr ON ncr_actions(ncr_id);