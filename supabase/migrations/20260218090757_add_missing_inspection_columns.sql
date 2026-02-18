/*
  # Add Missing Inspection Columns

  1. Changes to `inspections` table
    - Add `inspection_date_time` (timestamptz) - replaces the old `inspection_date` for date and time
    - Add `location_label` (text) - for location number/identifier
    - Add `level` (text) - building level/floor
    - Add `block` (text) - building block identifier
    - Add `appearance` (text) - visual appearance assessment
    - Add `comments` (text) - general inspection comments
    - Add `inspection_status` (text) - approval workflow status
    - Add `approved_at` (timestamptz) - when inspection was approved
    - Add `approved_by_user_id` (uuid) - who approved the inspection
    - Add `approval_notes` (text) - notes from approver

  2. Notes
    - Maintains backward compatibility with existing data
    - All new columns are nullable to support existing records
*/

-- Add missing columns to inspections table
DO $$
BEGIN
  -- Add inspection_date_time if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'inspection_date_time'
  ) THEN
    ALTER TABLE inspections ADD COLUMN inspection_date_time timestamptz DEFAULT now();
  END IF;

  -- Add location_label if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'location_label'
  ) THEN
    ALTER TABLE inspections ADD COLUMN location_label text;
  END IF;

  -- Add level if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'level'
  ) THEN
    ALTER TABLE inspections ADD COLUMN level text;
  END IF;

  -- Add block if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'block'
  ) THEN
    ALTER TABLE inspections ADD COLUMN block text;
  END IF;

  -- Add appearance if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'appearance'
  ) THEN
    ALTER TABLE inspections ADD COLUMN appearance text DEFAULT 'conform';
  END IF;

  -- Add comments if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'comments'
  ) THEN
    ALTER TABLE inspections ADD COLUMN comments text;
  END IF;

  -- Add inspection_status if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'inspection_status'
  ) THEN
    ALTER TABLE inspections ADD COLUMN inspection_status text DEFAULT 'Draft';
  END IF;

  -- Add approved_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE inspections ADD COLUMN approved_at timestamptz;
  END IF;

  -- Add approved_by_user_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'approved_by_user_id'
  ) THEN
    ALTER TABLE inspections ADD COLUMN approved_by_user_id uuid REFERENCES user_profiles(id);
  END IF;

  -- Add approval_notes if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE inspections ADD COLUMN approval_notes text;
  END IF;
END $$;

-- Create index for approved_by_user_id foreign key if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_inspections_approved_by_user_id 
ON inspections(approved_by_user_id);

-- Create index for inspection queries
CREATE INDEX IF NOT EXISTS idx_inspections_project_date 
ON inspections(project_id, inspection_date_time DESC);
