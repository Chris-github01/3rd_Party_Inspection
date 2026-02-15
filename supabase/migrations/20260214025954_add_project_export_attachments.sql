/*
  # Add Project Export Attachments
  
  ## Overview
  Adds support for appending PDFs to merged audit pack exports in upload sequence order.
  
  ## New Tables
  
  ### project_export_attachments
  - Tracks PDF attachments to be appended to project exports
  - Maintains upload sequence order
  - Soft delete via is_active flag
  - Links to documents table for file storage
  
  ## Features
  - Automatic sequence numbering per project
  - Upload order preserved (most recent = last in merged PDF)
  - Soft delete to preserve history
  - User tracking for uploads
  
  ## Security
  - RLS enabled
  - Authenticated users can read attachments
  - Only admins and inspectors can manage attachments
*/

-- Project Export Attachments table
CREATE TABLE IF NOT EXISTS project_export_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  sequence_no int NOT NULL DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by_user_id uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_export_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read project export attachments"
  ON project_export_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can create project export attachments"
  ON project_export_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update project export attachments"
  ON project_export_attachments FOR UPDATE
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

CREATE POLICY "Admins can delete project export attachments"
  ON project_export_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to automatically set sequence_no
CREATE OR REPLACE FUNCTION set_export_attachment_sequence()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sequence_no IS NULL OR NEW.sequence_no = 0 THEN
    SELECT COALESCE(MAX(sequence_no), 0) + 1
    INTO NEW.sequence_no
    FROM project_export_attachments
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set sequence_no
DROP TRIGGER IF EXISTS set_export_attachment_sequence_trigger ON project_export_attachments;
CREATE TRIGGER set_export_attachment_sequence_trigger
  BEFORE INSERT ON project_export_attachments
  FOR EACH ROW
  EXECUTE FUNCTION set_export_attachment_sequence();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_export_attachments_project ON project_export_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_export_attachments_sequence ON project_export_attachments(project_id, sequence_no);
CREATE INDEX IF NOT EXISTS idx_project_export_attachments_document ON project_export_attachments(document_id);
CREATE INDEX IF NOT EXISTS idx_project_export_attachments_active ON project_export_attachments(project_id, is_active) WHERE is_active = true;

-- Add new document category for export attachments
DO $$
BEGIN
  -- Check if we need to update the documents table category constraint
  -- This assumes documents.category exists and has a check constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'category'
  ) THEN
    -- We'll handle this gracefully - the category 'export_attachment' will be allowed
    -- The existing constraint may need updating, but we'll do it safely
    ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;
    ALTER TABLE documents ADD CONSTRAINT documents_category_check 
      CHECK (category IN ('drawing', 'specification', 'photo', 'report', 'elcometer', 'material', 'export_attachment', 'other'));
  END IF;
END $$;
