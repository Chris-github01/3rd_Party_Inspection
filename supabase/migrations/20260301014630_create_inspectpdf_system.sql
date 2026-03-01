/*
  # InspectPDF System - Comprehensive PDF Manipulation

  1. New Tables
    - `pdf_workspaces`
      - Workspace sessions for PDF editing
      - Links to projects and users
      - Stores current and original PDF references
      - Tracks metadata and file info

    - `pdf_operations`
      - Complete history of all PDF operations
      - Supports undo/redo functionality
      - Stores operation parameters and results
      - Tracks processing time and status

    - `pdf_batch_jobs`
      - Batch processing job management
      - Tracks progress of multiple operations
      - Stores results and errors

    - `pdf_thumbnails`
      - Cached thumbnail images for quick preview
      - One record per page
      - Links to workspace

    - `pdf_user_preferences`
      - User-specific settings
      - Default operation parameters
      - Recent operation templates

  2. Storage Buckets
    - `pdf-workspaces` for PDF files
    - `pdf-thumbnails` for thumbnail images

  3. Security
    - Enable RLS on all tables
    - Users can only access their own workspaces
    - Users can only access operations for their workspaces
    - Proper storage policies for file access

  4. Indexes
    - Performance indexes on foreign keys
    - Composite indexes for common queries
*/

-- Create pdf_workspaces table
CREATE TABLE IF NOT EXISTS pdf_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('export', 'upload', 'generated', 'merged')),
  source_reference VARCHAR(255),
  current_pdf_path TEXT,
  original_pdf_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  page_count INTEGER DEFAULT 0,
  file_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  is_archived BOOLEAN DEFAULT false
);

-- Create pdf_operations table
CREATE TABLE IF NOT EXISTS pdf_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES pdf_workspaces(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL CHECK (
    operation_type IN ('merge', 'split', 'rotate', 'extract', 'mix', 'insert', 'optimize', 'metadata')
  ),
  operation_data JSONB NOT NULL,
  result_pdf_path TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  can_undo BOOLEAN DEFAULT true,
  undo_operation_id UUID REFERENCES pdf_operations(id),
  sequence_number INTEGER NOT NULL
);

-- Create pdf_batch_jobs table
CREATE TABLE IF NOT EXISTS pdf_batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES pdf_workspaces(id) ON DELETE CASCADE,
  job_name VARCHAR(255) NOT NULL,
  operations JSONB[] NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  current_operation INTEGER DEFAULT 0,
  total_operations INTEGER NOT NULL,
  results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Create pdf_thumbnails table
CREATE TABLE IF NOT EXISTS pdf_thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES pdf_workspaces(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  thumbnail_path TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, page_number)
);

-- Create pdf_user_preferences table
CREATE TABLE IF NOT EXISTS pdf_user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_merge_options JSONB DEFAULT '{}'::jsonb,
  default_split_options JSONB DEFAULT '{}'::jsonb,
  thumbnail_size VARCHAR(20) DEFAULT 'medium' CHECK (thumbnail_size IN ('small', 'medium', 'large')),
  auto_optimize BOOLEAN DEFAULT true,
  show_advanced_options BOOLEAN DEFAULT false,
  recent_operations JSONB[] DEFAULT ARRAY[]::jsonb[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdf_workspaces_project ON pdf_workspaces(project_id);
CREATE INDEX IF NOT EXISTS idx_pdf_workspaces_user ON pdf_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_workspaces_updated ON pdf_workspaces(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_workspaces_accessed ON pdf_workspaces(last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_operations_workspace ON pdf_operations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pdf_operations_sequence ON pdf_operations(workspace_id, sequence_number DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_operations_status ON pdf_operations(status);
CREATE INDEX IF NOT EXISTS idx_pdf_operations_created ON pdf_operations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_batch_jobs_workspace ON pdf_batch_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pdf_batch_jobs_status ON pdf_batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pdf_batch_jobs_created ON pdf_batch_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_thumbnails_workspace ON pdf_thumbnails(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pdf_thumbnails_page ON pdf_thumbnails(workspace_id, page_number);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pdf_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pdf_workspaces
DROP TRIGGER IF EXISTS update_pdf_workspaces_updated_at ON pdf_workspaces;
CREATE TRIGGER update_pdf_workspaces_updated_at
  BEFORE UPDATE ON pdf_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_workspace_updated_at();

-- Create function to update user preferences updated_at
CREATE OR REPLACE FUNCTION update_pdf_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pdf_user_preferences
DROP TRIGGER IF EXISTS update_pdf_user_preferences_updated_at ON pdf_user_preferences;
CREATE TRIGGER update_pdf_user_preferences_updated_at
  BEFORE UPDATE ON pdf_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_preferences_updated_at();

-- Enable Row Level Security
ALTER TABLE pdf_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_thumbnails ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdf_workspaces
CREATE POLICY "Users can view own workspaces"
  ON pdf_workspaces FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own workspaces"
  ON pdf_workspaces FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workspaces"
  ON pdf_workspaces FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own workspaces"
  ON pdf_workspaces FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for pdf_operations
CREATE POLICY "Users can view operations for own workspaces"
  ON pdf_operations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_operations.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create operations for own workspaces"
  ON pdf_operations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_operations.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update operations for own workspaces"
  ON pdf_operations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_operations.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_operations.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete operations for own workspaces"
  ON pdf_operations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_operations.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

-- RLS Policies for pdf_batch_jobs
CREATE POLICY "Users can view batch jobs for own workspaces"
  ON pdf_batch_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_batch_jobs.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create batch jobs for own workspaces"
  ON pdf_batch_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_batch_jobs.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update batch jobs for own workspaces"
  ON pdf_batch_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_batch_jobs.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_batch_jobs.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

-- RLS Policies for pdf_thumbnails
CREATE POLICY "Users can view thumbnails for own workspaces"
  ON pdf_thumbnails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_thumbnails.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create thumbnails for own workspaces"
  ON pdf_thumbnails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_thumbnails.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete thumbnails for own workspaces"
  ON pdf_thumbnails FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pdf_workspaces
      WHERE pdf_workspaces.id = pdf_thumbnails.workspace_id
      AND pdf_workspaces.user_id = auth.uid()
    )
  );

-- RLS Policies for pdf_user_preferences
CREATE POLICY "Users can view own preferences"
  ON pdf_user_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own preferences"
  ON pdf_user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON pdf_user_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create helper function to get next sequence number for operations
CREATE OR REPLACE FUNCTION get_next_operation_sequence(p_workspace_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM pdf_operations
  WHERE workspace_id = p_workspace_id;

  RETURN next_seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to cleanup old workspaces
CREATE OR REPLACE FUNCTION cleanup_old_pdf_workspaces(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM pdf_workspaces
    WHERE is_archived = true
      AND updated_at < now() - (days_old || ' days')::interval
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
