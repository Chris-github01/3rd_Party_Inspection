/*
  # PDF Generated Files Table

  1. New Table
    - `pdf_generated_files`
      - Stores all generated PDF files from operations (merge, split, rotate, extract)
      - Links to workspace and operation
      - Tracks file metadata and storage path
      - Allows users to download and delete generated files

  2. Security
    - Enable RLS on `pdf_generated_files` table
    - Users can only access files from their own workspaces
    - Add policies for SELECT, INSERT, and DELETE operations

  3. Indexes
    - Performance indexes on workspace_id and created_at
*/

-- Create pdf_generated_files table
CREATE TABLE IF NOT EXISTS pdf_generated_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES pdf_workspaces(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES pdf_operations(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  page_count INTEGER DEFAULT 0,
  operation_type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_generated_files_workspace ON pdf_generated_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pdf_generated_files_created ON pdf_generated_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_generated_files_operation ON pdf_generated_files(operation_id);

-- Enable Row Level Security
ALTER TABLE pdf_generated_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdf_generated_files
CREATE POLICY "Users can view generated files for own workspaces"
  ON pdf_generated_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_generated_files.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create generated files for own workspaces"
  ON pdf_generated_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_generated_files.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete generated files for own workspaces"
  ON pdf_generated_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_generated_files.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );
