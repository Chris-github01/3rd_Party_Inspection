/*
  # Add Missing Columns to Drawing Pins Table

  1. Changes
    - Add block_id column (required for Site Manager hierarchy)
    - Add level_id column (required for Site Manager hierarchy)
    - Add drawing_id column (reference to drawings table)
    - Add pin_type column (inspection, member, ncr, note)
    - Add status column (not_started, in_progress, pass, repair_required)
    - Add inspection_id column (optional link to inspection records)
    - Update existing columns to match expected schema

  2. Security
    - Maintains existing RLS policies
    - All new columns support the Site Manager workflow

  3. Notes
    - Uses IF NOT EXISTS checks to avoid conflicts with existing columns
    - Preserves any existing data
*/

-- Add block_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'block_id'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN block_id uuid REFERENCES blocks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add level_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'level_id'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN level_id uuid REFERENCES levels(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add drawing_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'drawing_id'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN drawing_id uuid REFERENCES drawings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add pin_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'pin_type'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN pin_type text CHECK (pin_type IN ('inspection', 'member', 'ncr', 'note'));
  END IF;
END $$;

-- Add status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'status'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'pass', 'repair_required'));
  END IF;
END $$;

-- Add inspection_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'inspection_id'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN inspection_id uuid REFERENCES inspections(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Rename x_percent to x if needed (to match what code expects)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'x_percent'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'x'
  ) THEN
    ALTER TABLE drawing_pins RENAME COLUMN x_percent TO x;
  END IF;
END $$;

-- Rename y_percent to y if needed (to match what code expects)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'y_percent'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'y'
  ) THEN
    ALTER TABLE drawing_pins RENAME COLUMN y_percent TO y;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_drawing_pins_block_id ON drawing_pins(block_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_level_id ON drawing_pins(level_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_drawing_id ON drawing_pins(drawing_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_inspection_id ON drawing_pins(inspection_id) WHERE inspection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drawing_pins_status ON drawing_pins(status);
CREATE INDEX IF NOT EXISTS idx_drawing_pins_type ON drawing_pins(pin_type);