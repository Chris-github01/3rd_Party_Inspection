/*
  # Create Inspection Simulation Tables with Proper RLS

  1. New Tables
    - `inspection_member_sets` - Stores configuration for each member's simulated dataset
    - `inspection_member_readings` - Stores individual DFT readings for each member

  2. Security
    - Enable RLS on both tables
    - Allow all authenticated users to manage data (not just admins/inspectors)
    - Ensure data integrity through foreign key constraints

  3. Notes
    - These tables support the DFT simulation feature
    - All authenticated users can create, read, update, and delete records
    - Foreign key constraints ensure data consistency
*/

-- Create inspection_member_sets table
CREATE TABLE IF NOT EXISTS inspection_member_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  required_thickness_microns numeric NOT NULL,
  min_value_microns numeric NOT NULL,
  max_value_microns numeric NOT NULL,
  readings_per_member integer NOT NULL DEFAULT 100,
  is_simulated boolean DEFAULT true,
  summary_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT min_less_than_max CHECK (min_value_microns < max_value_microns)
);

-- Create case-insensitive unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_member_name_lower 
  ON inspection_member_sets(inspection_id, lower(member_name));

-- Create inspection_member_readings table
CREATE TABLE IF NOT EXISTS inspection_member_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_set_id uuid NOT NULL REFERENCES inspection_member_sets(id) ON DELETE CASCADE,
  reading_no integer NOT NULL,
  dft_microns numeric NOT NULL,
  CONSTRAINT unique_reading_per_member UNIQUE (member_set_id, reading_no)
);

-- Enable RLS
ALTER TABLE inspection_member_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_member_readings ENABLE ROW LEVEL SECURITY;

-- Policies for inspection_member_sets (permissive for all authenticated users)
DROP POLICY IF EXISTS "Users can view member sets" ON inspection_member_sets;
DROP POLICY IF EXISTS "Authenticated users can view member sets" ON inspection_member_sets;
CREATE POLICY "Authenticated users can view member sets"
  ON inspection_member_sets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create member sets" ON inspection_member_sets;
CREATE POLICY "Authenticated users can create member sets"
  ON inspection_member_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_member_sets.inspection_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update member sets" ON inspection_member_sets;
CREATE POLICY "Authenticated users can update member sets"
  ON inspection_member_sets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_member_sets.inspection_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_member_sets.inspection_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete member sets" ON inspection_member_sets;
CREATE POLICY "Authenticated users can delete member sets"
  ON inspection_member_sets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_member_sets.inspection_id
    )
  );

-- Policies for inspection_member_readings (permissive for all authenticated users)
DROP POLICY IF EXISTS "Users can view member readings" ON inspection_member_readings;
DROP POLICY IF EXISTS "Authenticated users can view member readings" ON inspection_member_readings;
CREATE POLICY "Authenticated users can view member readings"
  ON inspection_member_readings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create member readings" ON inspection_member_readings;
CREATE POLICY "Authenticated users can create member readings"
  ON inspection_member_readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_member_sets
      WHERE inspection_member_sets.id = inspection_member_readings.member_set_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update member readings" ON inspection_member_readings;
CREATE POLICY "Authenticated users can update member readings"
  ON inspection_member_readings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_member_sets
      WHERE inspection_member_sets.id = inspection_member_readings.member_set_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspection_member_sets
      WHERE inspection_member_sets.id = inspection_member_readings.member_set_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can delete member readings" ON inspection_member_readings;
CREATE POLICY "Authenticated users can delete member readings"
  ON inspection_member_readings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_member_sets
      WHERE inspection_member_sets.id = inspection_member_readings.member_set_id
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_sets_inspection 
  ON inspection_member_sets(inspection_id);

CREATE INDEX IF NOT EXISTS idx_member_readings_set 
  ON inspection_member_readings(member_set_id);

CREATE INDEX IF NOT EXISTS idx_member_readings_set_reading 
  ON inspection_member_readings(member_set_id, reading_no);
