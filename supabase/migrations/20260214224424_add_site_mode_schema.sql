/*
  # Site Mode Schema - Mobile Field Inspection System

  ## Overview
  This migration creates the complete data model for mobile-first field inspections,
  enabling OneTrace-style onsite workflows with pin-based inspections.

  ## New Tables

  ### 1. inspection_packages
  Pre-configured inspection packages defining material + FRR + required thickness
  - Links to materials master data
  - Sets default thickness requirements
  - Enables fast pin configuration in the field

  ### 2. drawing_pins (extends existing)
  Pin markers on drawings with inspection packages and status tracking
  - Normalized x/y coordinates (0-1 range)
  - Links to inspection packages
  - Real-time status updates (NotStarted/InProgress/Passed/Failed/NCR)

  ### 3. pin_inspections
  Individual inspection records for each pin
  - Captures inspector and timestamps
  - Tracks approval workflow
  - Links to readings, environment, and photos

  ### 4. pin_dft_readings
  DFT or thickness measurements for pin inspections
  - Multiple readings per inspection
  - Supports both microns (DFT) and mm (thickness) units

  ### 5. pin_environment_readings
  Environmental conditions during pin inspections
  - Temperature, humidity, dew point
  - Compliance checking against material requirements

  ### 6. pin_photos
  Photos captured during pin inspections
  - Multiple photo types (Overview, DFT, Environment, Defect, etc.)
  - Offline queue support

  ## Security
  - All tables have RLS enabled
  - Policies restrict access to authenticated users
  - Project-based access control
*/

-- =====================================================
-- 1. INSPECTION PACKAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS inspection_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  material_id uuid REFERENCES materials(id) ON DELETE SET NULL,
  fire_scenario text CHECK (fire_scenario IN ('Cellulosic', 'Hydrocarbon', 'Jet Fire', 'Tunnel', 'Mixed')),
  frr_minutes integer CHECK (frr_minutes > 0),
  required_thickness_unit text NOT NULL DEFAULT 'microns' CHECK (required_thickness_unit IN ('microns', 'mm')),
  required_thickness_value numeric NOT NULL CHECK (required_thickness_value > 0),
  section_factor_required boolean DEFAULT false,
  notes text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_packages_project ON inspection_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_inspection_packages_material ON inspection_packages(material_id);

ALTER TABLE inspection_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inspection packages for their projects"
  ON inspection_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = inspection_packages.project_id
    )
  );

CREATE POLICY "Users can create inspection packages"
  ON inspection_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = inspection_packages.project_id
    )
  );

CREATE POLICY "Users can update inspection packages"
  ON inspection_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = inspection_packages.project_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = inspection_packages.project_id
    )
  );

CREATE POLICY "Users can delete inspection packages"
  ON inspection_packages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = inspection_packages.project_id
    )
  );

-- =====================================================
-- 2. DRAWING PINS (check if exists, if not create)
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'drawing_pins' AND column_name = 'package_id') THEN
    ALTER TABLE drawing_pins ADD COLUMN package_id uuid REFERENCES inspection_packages(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'drawing_pins' AND column_name = 'member_name') THEN
    ALTER TABLE drawing_pins ADD COLUMN member_name text;
  END IF;
END $$;

-- =====================================================
-- 3. PIN INSPECTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS pin_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id uuid NOT NULL REFERENCES drawing_pins(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inspector_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  inspection_status text DEFAULT 'Draft' CHECK (
    inspection_status IN ('Draft', 'Passed', 'Passed_With_Observations', 'Failed', 'Rectification_Required')
  ),
  approval_notes text,
  approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pin_inspections_pin ON pin_inspections(pin_id);
CREATE INDEX IF NOT EXISTS idx_pin_inspections_project ON pin_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_pin_inspections_inspector ON pin_inspections(inspector_user_id);

ALTER TABLE pin_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pin inspections"
  ON pin_inspections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = pin_inspections.project_id
    )
  );

CREATE POLICY "Users can create pin inspections"
  ON pin_inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = pin_inspections.project_id
    )
  );

CREATE POLICY "Users can update pin inspections"
  ON pin_inspections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = pin_inspections.project_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = pin_inspections.project_id
    )
  );

CREATE POLICY "Users can delete pin inspections"
  ON pin_inspections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = pin_inspections.project_id
    )
  );

-- =====================================================
-- 4. PIN DFT READINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS pin_dft_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_inspection_id uuid NOT NULL REFERENCES pin_inspections(id) ON DELETE CASCADE,
  reading_no integer NOT NULL,
  thickness_value numeric NOT NULL,
  face text CHECK (face IN ('web', 'flange1', 'flange2', 'other')),
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pin_dft_readings_inspection ON pin_dft_readings(pin_inspection_id);

ALTER TABLE pin_dft_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pin DFT readings"
  ON pin_dft_readings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_dft_readings.pin_inspection_id
    )
  );

CREATE POLICY "Users can create pin DFT readings"
  ON pin_dft_readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_dft_readings.pin_inspection_id
    )
  );

CREATE POLICY "Users can update pin DFT readings"
  ON pin_dft_readings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_dft_readings.pin_inspection_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_dft_readings.pin_inspection_id
    )
  );

CREATE POLICY "Users can delete pin DFT readings"
  ON pin_dft_readings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_dft_readings.pin_inspection_id
    )
  );

-- =====================================================
-- 5. PIN ENVIRONMENT READINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS pin_environment_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_inspection_id uuid NOT NULL REFERENCES pin_inspections(id) ON DELETE CASCADE,
  ambient_temp_c numeric,
  steel_temp_c numeric,
  rh_percent numeric CHECK (rh_percent >= 0 AND rh_percent <= 100),
  dew_point_c numeric,
  dew_point_spread_c numeric,
  method text,
  instrument text,
  instrument_serial text,
  conforms boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pin_environment_readings_inspection ON pin_environment_readings(pin_inspection_id);

ALTER TABLE pin_environment_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pin environment readings"
  ON pin_environment_readings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_environment_readings.pin_inspection_id
    )
  );

CREATE POLICY "Users can create pin environment readings"
  ON pin_environment_readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_environment_readings.pin_inspection_id
    )
  );

CREATE POLICY "Users can update pin environment readings"
  ON pin_environment_readings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_environment_readings.pin_inspection_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_environment_readings.pin_inspection_id
    )
  );

CREATE POLICY "Users can delete pin environment readings"
  ON pin_environment_readings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_environment_readings.pin_inspection_id
    )
  );

-- =====================================================
-- 6. PIN PHOTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS pin_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_inspection_id uuid NOT NULL REFERENCES pin_inspections(id) ON DELETE CASCADE,
  pin_id uuid NOT NULL REFERENCES drawing_pins(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  photo_type text DEFAULT 'Other' CHECK (
    photo_type IN ('Overview', 'DFT', 'Environment', 'Defect', 'Repair', 'Other')
  ),
  taken_at timestamptz DEFAULT now(),
  is_synced boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pin_photos_inspection ON pin_photos(pin_inspection_id);
CREATE INDEX IF NOT EXISTS idx_pin_photos_pin ON pin_photos(pin_id);

ALTER TABLE pin_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pin photos"
  ON pin_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_photos.pin_inspection_id
    )
  );

CREATE POLICY "Users can create pin photos"
  ON pin_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_photos.pin_inspection_id
    )
  );

CREATE POLICY "Users can update pin photos"
  ON pin_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_photos.pin_inspection_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_photos.pin_inspection_id
    )
  );

CREATE POLICY "Users can delete pin photos"
  ON pin_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pin_inspections 
      JOIN projects ON projects.id = pin_inspections.project_id
      WHERE pin_inspections.id = pin_photos.pin_inspection_id
    )
  );