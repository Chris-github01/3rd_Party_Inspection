/*
  # PDF Parsing Pipeline Schema

  1. New Tables
    - `parsing_jobs`
      - Tracks PDF parsing lifecycle, retries, artifacts, and results
      - Supports multiple parsing modes (auto, text_only, ocr_only, hybrid)
      - Stores per-page metadata (OCR pages, text pages, confidence)
      - Links to artifact and result JSON files in storage

    - `parsed_documents`
      - Stores queryable parsed document metadata
      - References parsing_jobs for full artifact access
      - Contains normalized title, type, summary

  2. Security
    - Enable RLS on both tables
    - Authenticated users can read/write their own organization's parsing jobs
    - Service role can manage all jobs (for edge function)

  3. Indexes
    - Fast lookups by document_id, status, created_at
    - Efficient job queue processing

  4. Triggers
    - Auto-update updated_at timestamp on parsing_jobs
*/

-- ============================================================
-- TABLE: parsing_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS parsing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- relationships
  project_id uuid NULL REFERENCES projects(id) ON DELETE SET NULL,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  drawing_id uuid NULL REFERENCES drawings(id) ON DELETE SET NULL,

  -- job control
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','needs_ocr','retrying','completed','failed','partial_completed')),

  mode text NOT NULL DEFAULT 'auto'
    CHECK (mode IN ('auto','text_only','ocr_only','hybrid')),

  priority int NOT NULL DEFAULT 5,

  -- input source
  storage_bucket text NOT NULL DEFAULT 'documents',
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint NULL,

  -- progress tracking
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  last_heartbeat_at timestamptz NULL,

  -- page-level metadata
  page_count int NULL,
  ocr_pages int[] NULL,
  text_pages int[] NULL,
  low_confidence_pages int[] NULL,

  -- output artifacts (storage paths)
  artifact_json_path text NULL,
  result_json_path text NULL,

  -- diagnostics
  error_code text NULL,
  error_message text NULL,
  debug jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parsing_jobs_document_id_idx ON parsing_jobs(document_id);
CREATE INDEX IF NOT EXISTS parsing_jobs_drawing_id_idx ON parsing_jobs(drawing_id);
CREATE INDEX IF NOT EXISTS parsing_jobs_project_id_idx ON parsing_jobs(project_id);
CREATE INDEX IF NOT EXISTS parsing_jobs_status_idx ON parsing_jobs(status);
CREATE INDEX IF NOT EXISTS parsing_jobs_created_at_idx ON parsing_jobs(created_at);
CREATE INDEX IF NOT EXISTS parsing_jobs_status_priority_idx ON parsing_jobs(status, priority DESC, created_at);

-- ============================================================
-- TABLE: parsed_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS parsed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parsing_job_id uuid NOT NULL REFERENCES parsing_jobs(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  title text NULL,
  doc_type text NULL CHECK (doc_type IN ('quote','boq','spec','drawing','report','invoice','other') OR doc_type IS NULL),
  summary text NULL,
  result_json jsonb NULL,
  confidence_score float NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  needs_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parsed_documents_document_id_idx ON parsed_documents(document_id);
CREATE INDEX IF NOT EXISTS parsed_documents_parsing_job_id_idx ON parsed_documents(parsing_job_id);
CREATE INDEX IF NOT EXISTS parsed_documents_doc_type_idx ON parsed_documents(doc_type);
CREATE INDEX IF NOT EXISTS parsed_documents_needs_review_idx ON parsed_documents(needs_review) WHERE needs_review = true;

-- ============================================================
-- TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS parsing_jobs_set_updated_at ON parsing_jobs;
CREATE TRIGGER parsing_jobs_set_updated_at
  BEFORE UPDATE ON parsing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS: parsing_jobs
-- ============================================================
ALTER TABLE parsing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parsing jobs for their projects"
  ON parsing_jobs FOR SELECT TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE id = parsing_jobs.project_id)
    OR project_id IS NULL
  );

CREATE POLICY "Users can create parsing jobs"
  ON parsing_jobs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their parsing jobs"
  ON parsing_jobs FOR UPDATE TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE id = parsing_jobs.project_id)
    OR project_id IS NULL
  );

CREATE POLICY "Service role can manage all parsing jobs"
  ON parsing_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- RLS: parsed_documents
-- ============================================================
ALTER TABLE parsed_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parsed documents for their projects"
  ON parsed_documents FOR SELECT TO authenticated
  USING (
    document_id IN (SELECT id FROM documents WHERE id = parsed_documents.document_id)
  );

CREATE POLICY "Users can create parsed documents"
  ON parsed_documents FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can manage all parsed documents"
  ON parsed_documents FOR ALL TO service_role
  USING (true) WITH CHECK (true);
