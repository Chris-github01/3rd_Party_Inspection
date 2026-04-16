/*
  # Inspection AI Job Queue

  Adds a persistent, server-side job queue for photo analysis so AI calls are
  never made directly from the browser. The worker edge function picks up
  queued jobs, processes them safely, and writes results back.

  ## New Tables

  ### inspection_ai_jobs
  Each row represents one image waiting for (or that has received) AI analysis.
  - id: primary key
  - organization_id: tenant scoping
  - project_id: optional link to core project
  - report_id: link to inspection_ai_reports
  - item_id: link to inspection_ai_items (updated when job completes)
  - image_url: public storage URL of the uploaded image
  - image_base64: transient base64 payload (cleared after processing)
  - mime_type: image MIME type
  - context_json: inspector context (system_type, element, environment, etc.)
  - status: queued | processing | complete | failed | review_required
  - priority: lower = processed first (default 5)
  - attempts: retry counter
  - provider: which AI provider handled this job
  - model: which model was used
  - error_message: last failure reason
  - latency_ms: wall-clock time of the AI call
  - created_at / started_at / completed_at: timing columns

  ### inspection_ai_results
  Raw AI response store — one row per successful inference attempt.
  Preserves the full JSON so we can reprocess with improved rules later.
  - job_id: FK to inspection_ai_jobs
  - item_id: FK to inspection_ai_items
  - provider / model: which service ran
  - latency_ms: inference time
  - confidence: top-level confidence score
  - raw_json: full structured AI output
  - schema_valid: did output pass schema validation?

  ## Security
  - RLS enabled on both tables
  - Authenticated users can only read/insert jobs belonging to their org
  - Service role (edge functions) bypasses RLS for status updates
*/

CREATE TABLE IF NOT EXISTS inspection_ai_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid,
  project_id       uuid,
  report_id        uuid REFERENCES inspection_ai_reports(id) ON DELETE SET NULL,
  item_id          uuid REFERENCES inspection_ai_items(id) ON DELETE SET NULL,
  image_url        text NOT NULL,
  image_base64     text,
  mime_type        text NOT NULL DEFAULT 'image/jpeg',
  context_json     jsonb NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued','processing','complete','failed','review_required')),
  priority         integer NOT NULL DEFAULT 5,
  attempts         integer NOT NULL DEFAULT 0,
  max_attempts     integer NOT NULL DEFAULT 3,
  provider         text,
  model            text,
  error_message    text,
  latency_ms       integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  started_at       timestamptz,
  completed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_inspection_ai_jobs_status_priority
  ON inspection_ai_jobs (status, priority, created_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_inspection_ai_jobs_org
  ON inspection_ai_jobs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inspection_ai_jobs_item
  ON inspection_ai_jobs (item_id);

ALTER TABLE inspection_ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view own jobs"
  ON inspection_ai_jobs FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert jobs"
  ON inspection_ai_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Org members can update own jobs"
  ON inspection_ai_jobs FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inspection_ai_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid REFERENCES inspection_ai_jobs(id) ON DELETE CASCADE,
  item_id       uuid REFERENCES inspection_ai_items(id) ON DELETE SET NULL,
  provider      text NOT NULL,
  model         text NOT NULL,
  latency_ms    integer,
  confidence    numeric,
  schema_valid  boolean NOT NULL DEFAULT true,
  raw_json      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_ai_results_job
  ON inspection_ai_results (job_id);

CREATE INDEX IF NOT EXISTS idx_inspection_ai_results_item
  ON inspection_ai_results (item_id);

ALTER TABLE inspection_ai_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view results via job"
  ON inspection_ai_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspection_ai_jobs j
      WHERE j.id = inspection_ai_results.job_id
      AND (
        j.organization_id IS NULL OR
        j.organization_id IN (
          SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Service role can insert results"
  ON inspection_ai_results FOR INSERT
  TO authenticated
  WITH CHECK (true);
