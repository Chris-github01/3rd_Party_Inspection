/*
  # Pin Corrections Tracking System

  This migration creates a comprehensive system for tracking pin placement corrections,
  including history, audit trails, and correction metadata.

  ## New Tables

  ### 1. `pin_corrections`
  Tracks all corrections made to pin placements on drawings.
  
  Columns:
  - `id` (uuid, primary key)
  - `project_id` (uuid, references projects)
  - `drawing_id` (uuid, references drawings)
  - `pin_id` (uuid, references drawing_pins) - The corrected pin
  - `correction_type` (text) - Type: 'position', 'missing', 'duplicate', 'incorrect_label', 'status_change'
  - `original_x` (numeric) - Original X coordinate
  - `original_y` (numeric) - Original Y coordinate
  - `corrected_x` (numeric) - Corrected X coordinate
  - `corrected_y` (numeric) - Corrected Y coordinate
  - `original_label` (text) - Original pin label
  - `corrected_label` (text) - Corrected pin label
  - `original_status` (text) - Original status
  - `corrected_status` (text) - Corrected status
  - `issue_description` (text) - Description of the issue
  - `correction_notes` (text) - Notes about the correction
  - `severity` (text) - 'critical', 'high', 'medium', 'low'
  - `corrected_by` (uuid, references auth.users)
  - `corrected_at` (timestamptz)
  - `verified_by` (uuid, references auth.users)
  - `verified_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 2. `pin_correction_batches`
  Groups related corrections together for batch reporting.
  
  Columns:
  - `id` (uuid, primary key)
  - `project_id` (uuid, references projects)
  - `batch_name` (text) - Name/title of correction batch
  - `description` (text) - Overall description
  - `status` (text) - 'draft', 'submitted', 'approved', 'rejected'
  - `total_corrections` (integer)
  - `created_by` (uuid, references auth.users)
  - `created_at` (timestamptz)
  - `submitted_at` (timestamptz)
  - `reviewed_by` (uuid, references auth.users)
  - `reviewed_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies for authenticated users to view/edit their project corrections
*/

-- Create pin_corrections table
CREATE TABLE IF NOT EXISTS pin_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drawing_id uuid REFERENCES drawings(id) ON DELETE CASCADE,
  pin_id uuid REFERENCES drawing_pins(id) ON DELETE SET NULL,
  correction_type text NOT NULL CHECK (correction_type IN ('position', 'missing', 'duplicate', 'incorrect_label', 'status_change', 'other')),
  original_x numeric,
  original_y numeric,
  corrected_x numeric,
  corrected_y numeric,
  original_label text,
  corrected_label text,
  original_status text,
  corrected_status text,
  issue_description text,
  correction_notes text,
  severity text DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  corrected_by uuid REFERENCES auth.users(id),
  corrected_at timestamptz DEFAULT now(),
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  batch_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create pin_correction_batches table
CREATE TABLE IF NOT EXISTS pin_correction_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  batch_name text NOT NULL,
  description text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  total_corrections integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz
);

-- Add foreign key for batch_id after table creation
ALTER TABLE pin_corrections 
ADD CONSTRAINT fk_correction_batch 
FOREIGN KEY (batch_id) REFERENCES pin_correction_batches(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pin_corrections_project ON pin_corrections(project_id);
CREATE INDEX IF NOT EXISTS idx_pin_corrections_drawing ON pin_corrections(drawing_id);
CREATE INDEX IF NOT EXISTS idx_pin_corrections_pin ON pin_corrections(pin_id);
CREATE INDEX IF NOT EXISTS idx_pin_corrections_batch ON pin_corrections(batch_id);
CREATE INDEX IF NOT EXISTS idx_pin_correction_batches_project ON pin_correction_batches(project_id);

-- Enable RLS
ALTER TABLE pin_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_correction_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pin_corrections
CREATE POLICY "Users can view corrections for their projects"
  ON pin_corrections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pin_corrections.project_id
    )
  );

CREATE POLICY "Users can create corrections for their projects"
  ON pin_corrections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pin_corrections.project_id
    )
  );

CREATE POLICY "Users can update corrections for their projects"
  ON pin_corrections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pin_corrections.project_id
    )
  );

CREATE POLICY "Users can delete corrections for their projects"
  ON pin_corrections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pin_corrections.project_id
    )
  );

-- RLS Policies for pin_correction_batches
CREATE POLICY "Users can view correction batches for their projects"
  ON pin_correction_batches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pin_correction_batches.project_id
    )
  );

CREATE POLICY "Users can create correction batches for their projects"
  ON pin_correction_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pin_correction_batches.project_id
    )
  );

CREATE POLICY "Users can update correction batches for their projects"
  ON pin_correction_batches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pin_correction_batches.project_id
    )
  );

CREATE POLICY "Users can delete correction batches for their projects"
  ON pin_correction_batches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = pin_correction_batches.project_id
    )
  );

-- Function to update correction count in batch
CREATE OR REPLACE FUNCTION update_batch_correction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pin_correction_batches
    SET total_corrections = total_corrections + 1
    WHERE id = NEW.batch_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pin_correction_batches
    SET total_corrections = total_corrections - 1
    WHERE id = OLD.batch_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain correction count
DROP TRIGGER IF EXISTS trigger_update_batch_correction_count ON pin_corrections;
CREATE TRIGGER trigger_update_batch_correction_count
AFTER INSERT OR DELETE ON pin_corrections
FOR EACH ROW
EXECUTE FUNCTION update_batch_correction_count();
