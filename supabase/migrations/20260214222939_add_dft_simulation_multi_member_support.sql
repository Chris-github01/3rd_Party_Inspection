/*
  # DFT Simulation Mode - Multi-Member Support

  1. New Tables
    - `inspection_member_sets`
      - Stores configuration for each member's simulated dataset
      - `id` (uuid, primary key)
      - `inspection_id` (uuid, foreign key to inspections)
      - `member_name` (text, the member identifier like "410UB16")
      - `required_thickness_microns` (numeric)
      - `min_value_microns` (numeric)
      - `max_value_microns` (numeric)
      - `readings_per_member` (integer)
      - `is_simulated` (boolean, default true)
      - `summary_json` (jsonb, stores avg/min/max/stddev/compliance)
      - `created_at` (timestamptz)
      
    - `inspection_member_readings`
      - Stores individual DFT readings for each member
      - `id` (uuid, primary key)
      - `member_set_id` (uuid, foreign key to inspection_member_sets)
      - `reading_no` (integer, sequential reading number)
      - `dft_microns` (numeric, the actual reading value)
  
  2. Changes to Existing Tables
    - `inspections`
      - Add `dft_simulation_enabled` (boolean, default false)
      - Add `dft_simulation_notes` (text, nullable)
  
  3. Constraints
    - Unique constraint on (inspection_id, lower(member_name)) to prevent duplicate member names
    - Check constraint: min_value_microns < max_value_microns
  
  4. Security
    - Enable RLS on both new tables
    - Add policies for authenticated users with appropriate roles
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

-- Add simulation fields to inspections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'dft_simulation_enabled'
  ) THEN
    ALTER TABLE inspections ADD COLUMN dft_simulation_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'dft_simulation_notes'
  ) THEN
    ALTER TABLE inspections ADD COLUMN dft_simulation_notes text;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE inspection_member_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_member_readings ENABLE ROW LEVEL SECURITY;

-- Policies for inspection_member_sets (read access for all authenticated users)
CREATE POLICY "Users can view member sets"
  ON inspection_member_sets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create member sets"
  ON inspection_member_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update member sets"
  ON inspection_member_sets FOR UPDATE
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

CREATE POLICY "Admins and inspectors can delete member sets"
  ON inspection_member_sets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- Policies for inspection_member_readings (read access for all authenticated users)
CREATE POLICY "Users can view member readings"
  ON inspection_member_readings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create member readings"
  ON inspection_member_readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update member readings"
  ON inspection_member_readings FOR UPDATE
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

CREATE POLICY "Admins and inspectors can delete member readings"
  ON inspection_member_readings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_sets_inspection 
  ON inspection_member_sets(inspection_id);

CREATE INDEX IF NOT EXISTS idx_member_readings_set 
  ON inspection_member_readings(member_set_id);

CREATE INDEX IF NOT EXISTS idx_member_readings_set_reading 
  ON inspection_member_readings(member_set_id, reading_no);