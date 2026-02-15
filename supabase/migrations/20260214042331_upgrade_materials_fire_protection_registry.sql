/*
  # Upgrade Materials to Fire Protection Material Registry

  1. Schema Updates
    - Expand materials table with comprehensive fire protection fields
    - Add classification fields (material_type, fire_scenario, application_category)
    - Add technical properties (temperature ranges, humidity, dew point)
    - Add specification fields (fire rating, certification standards)
    - Add compatibility fields (approved primers/topcoats)
    - Add inspection configuration fields
    - Add documentation fields (TDS/SDS URLs)
    - Add unique constraint for manufacturer + product_name + application_category
  
  2. New Columns
    Core Identity:
    - product_code (text)
    
    Classification:
    - material_type (enum)
    - fire_scenario (enum)
    - application_category (enum)
    
    Technical Properties:
    - thickness_unit (enum)
    - min_temp_c (numeric)
    - max_temp_c (numeric)
    - max_rh_percent (numeric)
    - min_dew_point_spread_c (numeric, default 3)
    
    Specification:
    - max_fire_rating_minutes (integer)
    - certification_standard (text)
    
    Compatibility:
    - approved_primer_systems (text[])
    - approved_topcoats (text[])
    
    Inspection Configuration:
    - default_measurement_method (enum)
    - requires_section_factor (boolean, default false)
    - requires_density_test (boolean, default false)
    - requires_bond_test (boolean, default false)
    - external_use_allowed (boolean, default false)
    - interior_only (boolean, default false)
    
    Documentation:
    - tds_url (text)
    - sds_url (text)
    - active (boolean, default true)
    
    Future Proofing:
    - chemistry (text)
    - region_availability (text[])
    - spec_library_reference (text)

  3. Security
    - Enable RLS with admin-only write access
*/

-- Drop existing material_library table to rebuild with new schema
DROP TABLE IF EXISTS material_library CASCADE;

-- Create upgraded materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identity
  manufacturer text NOT NULL,
  product_name text NOT NULL,
  product_code text,
  
  -- Classification
  material_type text NOT NULL CHECK (material_type IN ('Primer', 'Intumescent', 'Cementitious', 'Board', 'Topcoat', 'Other')),
  fire_scenario text CHECK (fire_scenario IN ('Cellulosic', 'Hydrocarbon', 'Jet Fire', 'Tunnel', 'Mixed')),
  application_category text NOT NULL CHECK (application_category IN ('ThinFilm_Waterborne', 'ThinFilm_Solvent', 'Epoxy_Intumescent', 'Cementitious_Spray', 'Board_System', 'Hybrid')),
  
  -- Technical properties
  thickness_unit text NOT NULL DEFAULT 'microns' CHECK (thickness_unit IN ('microns', 'mm')),
  min_temp_c numeric,
  max_temp_c numeric,
  max_rh_percent numeric,
  min_dew_point_spread_c numeric NOT NULL DEFAULT 3,
  
  -- Specification
  max_fire_rating_minutes integer,
  certification_standard text,
  
  -- Compatibility
  approved_primer_systems text[],
  approved_topcoats text[],
  
  -- Inspection configuration
  default_measurement_method text NOT NULL DEFAULT 'DFT_Gauge' CHECK (default_measurement_method IN ('DFT_Gauge', 'WetFilmGauge', 'DepthPinGauge', 'BoardCaliper', 'DensityCoreTest')),
  requires_section_factor boolean NOT NULL DEFAULT false,
  requires_density_test boolean NOT NULL DEFAULT false,
  requires_bond_test boolean NOT NULL DEFAULT false,
  external_use_allowed boolean NOT NULL DEFAULT false,
  interior_only boolean NOT NULL DEFAULT false,
  
  -- Documentation
  tds_url text,
  sds_url text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  
  -- Future proofing
  chemistry text,
  region_availability text[],
  spec_library_reference text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS materials_unique_idx 
  ON materials (lower(trim(manufacturer)), lower(trim(product_name)), application_category);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS materials_material_type_idx ON materials(material_type);
CREATE INDEX IF NOT EXISTS materials_fire_scenario_idx ON materials(fire_scenario);
CREATE INDEX IF NOT EXISTS materials_application_category_idx ON materials(application_category);
CREATE INDEX IF NOT EXISTS materials_active_idx ON materials(active);
CREATE INDEX IF NOT EXISTS materials_certification_standard_idx ON materials(certification_standard);

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all materials"
  ON materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update materials"
  ON materials FOR UPDATE
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

CREATE POLICY "Admins can delete materials"
  ON materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create updated_at trigger
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
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_materials_updated_at'
  ) THEN
    CREATE TRIGGER update_materials_updated_at
      BEFORE UPDATE ON materials
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
