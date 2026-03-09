/*
  # Add Quantity Tracking and Inspection Readings System

  1. Changes to members table
    - Add quantity column to track how many instances of each member
    - Add auto_generated_base_id column for tracking generated ID sequences
    - Add is_spot_check boolean to distinguish spot checks from full measurements

  2. New inspection_readings table
    - Stores individual test readings for each member instance
    - Links to members table
    - Includes reading sequence number within the member's quantity
    - Stores DFT readings and other inspection data

  3. Security
    - Enable RLS on inspection_readings table
    - Add policies for authenticated users to manage readings

  4. Notes
    - Quantity defaults to 1 for single members
    - When quantity > 1, system auto-generates sequential IDs
    - Spot checks are marked separately from full measurement checks
*/

-- Add quantity tracking to members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE members ADD COLUMN quantity integer DEFAULT 1 CHECK (quantity > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'auto_generated_base_id'
  ) THEN
    ALTER TABLE members ADD COLUMN auto_generated_base_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'is_spot_check'
  ) THEN
    ALTER TABLE members ADD COLUMN is_spot_check boolean DEFAULT false;
  END IF;
END $$;

-- Create inspection_readings table for test data
CREATE TABLE IF NOT EXISTS inspection_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL CHECK (sequence_number > 0),
  generated_id text NOT NULL,
  
  -- DFT readings (3 readings per spot as per industry standard)
  dft_reading_1 integer,
  dft_reading_2 integer,
  dft_reading_3 integer,
  dft_average integer,
  
  -- Pass/fail status
  status text DEFAULT 'pass' CHECK (status IN ('pass', 'fail', 'requires_repair')),
  
  -- Environmental conditions
  temperature_c numeric(4,1),
  humidity_percent integer,
  
  -- Notes and metadata
  notes text,
  reading_type text DEFAULT 'full_measurement' CHECK (reading_type IN ('spot_check', 'full_measurement')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inspection_readings_member ON inspection_readings(member_id);
CREATE INDEX IF NOT EXISTS idx_inspection_readings_project ON inspection_readings(project_id);
CREATE INDEX IF NOT EXISTS idx_inspection_readings_generated_id ON inspection_readings(generated_id);

-- Enable RLS
ALTER TABLE inspection_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspection_readings
CREATE POLICY "Users can view inspection readings for their projects"
  ON inspection_readings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = inspection_readings.project_id
    )
  );

CREATE POLICY "Users can create inspection readings"
  ON inspection_readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = inspection_readings.project_id
    )
  );

CREATE POLICY "Users can update inspection readings"
  ON inspection_readings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = inspection_readings.project_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = inspection_readings.project_id
    )
  );

CREATE POLICY "Users can delete inspection readings"
  ON inspection_readings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = inspection_readings.project_id
    )
  );

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inspection_readings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_inspection_readings_updated_at_trigger ON inspection_readings;
CREATE TRIGGER update_inspection_readings_updated_at_trigger
  BEFORE UPDATE ON inspection_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_inspection_readings_updated_at();
