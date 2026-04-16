/*
  # Add ai_result JSONB and Performance Indexes

  ## What This Does
  Stores the full raw AI response payload on each inspection item so nothing
  is lost. Also adds compound indexes for the most common query patterns:
  filtering by severity, defect type, and creation date.

  ## Changes

  ### inspection_ai_items
  - Add `ai_result` (jsonb, nullable) — full AI response payload including
    confidence scores, visible_evidence, next_checks, escalation flags,
    remediation_guidance, geometry data, tier/model metadata
  - Add `environment` (text, nullable) — Internal/External/Splash Zone etc.
  - Add `is_new_install` (boolean, default false) — new vs remedial work flag
  - Add index on (report_id, severity) for severity-filtered report views
  - Add index on (report_id, created_at) for chronological report views
  - Add index on defect_type for analytics/benchmarking queries

  ## Notes
  - `ai_result` is nullable — existing rows unaffected
  - GIN index on ai_result enables fast JSONB key/value searches later
*/

-- Add ai_result JSONB column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'ai_result'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN ai_result jsonb;
  END IF;
END $$;

-- Add environment column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'environment'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN environment text;
  END IF;
END $$;

-- Add is_new_install column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'is_new_install'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN is_new_install boolean DEFAULT false;
  END IF;
END $$;

-- Compound index: report + severity (for report views filtered by severity)
CREATE INDEX IF NOT EXISTS idx_ai_items_report_severity
  ON inspection_ai_items(report_id, severity);

-- Compound index: report + created_at (for chronological listing)
CREATE INDEX IF NOT EXISTS idx_ai_items_report_created
  ON inspection_ai_items(report_id, created_at);

-- Index on defect_type (for analytics/benchmarking across all projects)
CREATE INDEX IF NOT EXISTS idx_ai_items_defect_type
  ON inspection_ai_items(defect_type);

-- GIN index on ai_result JSONB (enables fast key/value searches)
CREATE INDEX IF NOT EXISTS idx_ai_items_ai_result_gin
  ON inspection_ai_items USING gin(ai_result);
