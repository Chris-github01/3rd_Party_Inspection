/*
  # Add Pin Numbering and Steel Type Fields

  1. New Columns
    - `pin_number` (text) - Sequential pin identifier (e.g., "1001-1", "1001-2")
    - `steel_type` (text) - Type of steel element (Beam, Column, Plate, etc.)
  
  2. Changes
    - Add pin_number column with index for efficient querying
    - Add steel_type column to store steel element type
    - Create index on project_id and pin_number for fast sequential number generation
  
  3. Notes
    - Existing pins will have NULL values for these fields
    - New pins will automatically generate sequential numbers
*/

-- Add steel_type column to store the type of steel element
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'steel_type'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN steel_type text;
  END IF;
END $$;

-- Add pin_number column for sequential numbering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'pin_number'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN pin_number text;
  END IF;
END $$;

-- Create index for efficient pin number querying per project
CREATE INDEX IF NOT EXISTS idx_drawing_pins_project_pin_number 
  ON drawing_pins(project_id, pin_number);

-- Create function to generate next pin number for a project
CREATE OR REPLACE FUNCTION get_next_pin_number(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_number integer;
  next_number text;
BEGIN
  -- Extract the numeric part from the latest pin number for this project
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(pin_number FROM '1001-(\d+)') AS integer
      )
    ),
    0
  )
  INTO latest_number
  FROM drawing_pins
  WHERE project_id = p_project_id
    AND pin_number IS NOT NULL
    AND pin_number ~ '^1001-\d+$';
  
  -- Increment and format the next pin number
  next_number := '1001-' || (latest_number + 1)::text;
  
  RETURN next_number;
END;
$$;