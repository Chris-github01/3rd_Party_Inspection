/*
  # Add Inspection Status and Approval System

  1. Changes to Tables
    - `inspections`
      - Add `inspection_status` (text) - Status of the inspection (Draft, Passed, Passed_With_Observations, Failed, Rectification_Required)
      - Add `approved_by_user_id` (uuid, nullable) - User who approved the inspection
      - Add `approved_at` (timestamptz, nullable) - When the inspection was approved
      - Add `approval_notes` (text, nullable) - Optional notes added during approval
    
    - Create `inspection_audit_log` table
      - `id` (uuid, primary key)
      - `inspection_id` (uuid, foreign key to inspections)
      - `old_status` (text)
      - `new_status` (text)
      - `changed_by_user_id` (uuid, foreign key to auth.users)
      - `changed_at` (timestamptz)
      - `notes` (text, nullable)

  2. Security
    - Enable RLS on `inspection_audit_log` table
    - Add policies for authenticated users to read audit logs
    - Add policies for authenticated users to insert audit logs

  3. Notes
    - Default inspection_status is 'Draft'
    - Approval fields are nullable and only set when status changes to approved state
    - Audit log tracks all status changes for legal defensibility
*/

-- Add status and approval columns to inspections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'inspection_status'
  ) THEN
    ALTER TABLE inspections ADD COLUMN inspection_status text DEFAULT 'Draft';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'approved_by_user_id'
  ) THEN
    ALTER TABLE inspections ADD COLUMN approved_by_user_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE inspections ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE inspections ADD COLUMN approval_notes text;
  END IF;
END $$;

-- Add foreign key constraint for approved_by_user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inspections_approved_by_user_id_fkey'
  ) THEN
    ALTER TABLE inspections 
    ADD CONSTRAINT inspections_approved_by_user_id_fkey 
    FOREIGN KEY (approved_by_user_id) REFERENCES auth.users(id);
  END IF;
END $$;

-- Create inspection audit log table
CREATE TABLE IF NOT EXISTS inspection_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by_user_id uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for inspection audit log
CREATE POLICY "Authenticated users can read audit logs"
  ON inspection_audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit logs"
  ON inspection_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inspection_audit_log_inspection_id 
  ON inspection_audit_log(inspection_id);

CREATE INDEX IF NOT EXISTS idx_inspections_status 
  ON inspections(inspection_status);
