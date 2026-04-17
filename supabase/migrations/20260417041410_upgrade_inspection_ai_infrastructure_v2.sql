/*
  # Upgrade Inspection AI Infrastructure v2

  ## Summary
  Extends the inspection AI system for a production-grade multi-model pipeline.

  ## Changes

  ### New Columns on inspection_ai_jobs
  - `consensus_result` (jsonb): stores merged/consensus analysis when both providers agree
  - `conflict_result` (jsonb): stores both raw outputs when providers disagree
  - `image_hash` (text): SHA-256 of the compressed image for deduplication
  - `prompt_version` (text): tracks which prompt pack version was used
  - `kb_context_used` (boolean): whether knowledge base context was injected

  ### New Columns on inspection_ai_items
  - `pass_fail` (text): 'pass' | 'fail' | 'review' — normalized from AI output
  - `drawing_pin_ready` (boolean): AI flagged this item can be placed on drawing
  - `estimated_scope_hours` (numeric): AI estimated remediation hours

  ### New Table: inspection_ai_result_history
  Full audit trail of every AI result (supports rerun tracking)

  ### New Table: inspection_ai_provider_metrics
  Per-org provider performance tracking

  ### RPC: get_ai_provider_stats
  Returns health stats for the health endpoint
*/

-- ─────────────────────────────────────────────────────────────────
-- Add columns to inspection_ai_jobs
-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_ai_jobs' AND column_name = 'consensus_result') THEN
    ALTER TABLE inspection_ai_jobs ADD COLUMN consensus_result jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_ai_jobs' AND column_name = 'conflict_result') THEN
    ALTER TABLE inspection_ai_jobs ADD COLUMN conflict_result jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_ai_jobs' AND column_name = 'image_hash') THEN
    ALTER TABLE inspection_ai_jobs ADD COLUMN image_hash text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_ai_jobs' AND column_name = 'prompt_version') THEN
    ALTER TABLE inspection_ai_jobs ADD COLUMN prompt_version text DEFAULT '2.0';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_ai_jobs' AND column_name = 'kb_context_used') THEN
    ALTER TABLE inspection_ai_jobs ADD COLUMN kb_context_used boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_ai_jobs' AND column_name = 'gemini_result') THEN
    ALTER TABLE inspection_ai_jobs ADD COLUMN gemini_result jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_ai_jobs' AND column_name = 'openai_result') THEN
    ALTER TABLE inspection_ai_jobs ADD COLUMN openai_result jsonb;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- Add columns to inspection_ai_items
-- ─────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_ai_items' AND column_name = 'pass_fail') THEN
    ALTER TABLE inspection_ai_items ADD COLUMN pass_fail text CHECK (pass_fail IN ('pass', 'fail', 'review'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_ai_items' AND column_name = 'drawing_pin_ready') THEN
    ALTER TABLE inspection_ai_items ADD COLUMN drawing_pin_ready boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_ai_items' AND column_name = 'estimated_scope_hours') THEN
    ALTER TABLE inspection_ai_items ADD COLUMN estimated_scope_hours numeric(6,2);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- inspection_ai_result_history: full audit trail per analysis run
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_ai_result_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES inspection_ai_jobs(id) ON DELETE CASCADE,
  item_id uuid,
  organization_id uuid,
  provider text NOT NULL,
  model text NOT NULL,
  prompt_version text NOT NULL DEFAULT '2.0',
  latency_ms integer,
  confidence integer,
  severity text,
  defect_type text,
  pass_fail text,
  requires_manual_review boolean DEFAULT false,
  schema_valid boolean DEFAULT true,
  raw_json jsonb,
  normalized_json jsonb,
  image_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_ai_result_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view result history"
  ON inspection_ai_result_history FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert result history"
  ON inspection_ai_result_history FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────
-- inspection_ai_provider_metrics: track provider reliability
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inspection_ai_provider_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  provider text NOT NULL,
  model text NOT NULL,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  total_latency_ms bigint NOT NULL DEFAULT 0,
  avg_confidence numeric(5,2),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_failure_reason text,
  recorded_hour timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  UNIQUE(organization_id, provider, model, recorded_hour)
);

ALTER TABLE inspection_ai_provider_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view provider metrics"
  ON inspection_ai_provider_metrics FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
    OR organization_id IS NULL
  );

-- ─────────────────────────────────────────────────────────────────
-- RPC: get_ai_health_stats — used by health endpoint
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_ai_health_stats(p_org_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'queued_jobs',
      (SELECT COUNT(*) FROM inspection_ai_jobs WHERE status = 'queued'
        AND (p_org_id IS NULL OR organization_id = p_org_id)),
    'processing_jobs',
      (SELECT COUNT(*) FROM inspection_ai_jobs WHERE status = 'processing'
        AND (p_org_id IS NULL OR organization_id = p_org_id)),
    'failed_last_hour',
      (SELECT COUNT(*) FROM inspection_ai_jobs
        WHERE status = 'failed'
        AND completed_at > now() - interval '1 hour'
        AND (p_org_id IS NULL OR organization_id = p_org_id)),
    'completed_last_hour',
      (SELECT COUNT(*) FROM inspection_ai_jobs
        WHERE status = 'complete'
        AND completed_at > now() - interval '1 hour'
        AND (p_org_id IS NULL OR organization_id = p_org_id)),
    'avg_latency_ms',
      (SELECT COALESCE(AVG(latency_ms)::integer, 0) FROM inspection_ai_jobs
        WHERE status = 'complete'
        AND completed_at > now() - interval '1 hour'
        AND (p_org_id IS NULL OR organization_id = p_org_id)),
    'provider_breakdown',
      (SELECT COALESCE(jsonb_object_agg(provider, cnt), '{}'::jsonb)
        FROM (
          SELECT provider, COUNT(*) AS cnt
          FROM inspection_ai_jobs
          WHERE status = 'complete'
          AND completed_at > now() - interval '24 hours'
          AND (p_org_id IS NULL OR organization_id = p_org_id)
          AND provider IS NOT NULL
          GROUP BY provider
        ) t)
  );
$$;

-- ─────────────────────────────────────────────────────────────────
-- Indexes for performance
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_result_history_org ON inspection_ai_result_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_result_history_item ON inspection_ai_result_history(item_id);
CREATE INDEX IF NOT EXISTS idx_ai_result_history_job ON inspection_ai_result_history(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_image_hash ON inspection_ai_jobs(image_hash) WHERE image_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_provider_metrics_org_hour ON inspection_ai_provider_metrics(organization_id, recorded_hour);
