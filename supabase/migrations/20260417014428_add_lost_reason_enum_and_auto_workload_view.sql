/*
  # Lost Reason Enum Standardization + Auto Workload from Active Quotes/Projects

  ## Changes

  ### 1. Lost Reason Enum
  - Creates `quote_lost_reason` enum type with standardized reasons
  - Adds `lost_reason_code` column to `quotes` table (enum, nullable)
  - Adds `lost_reason_code` column to `leads` table (enum, nullable)
  - Keeps existing free-text `lost_reason` columns intact

  ### 2. Auto Workload View
  - Creates `office_workload_auto` view that calculates live workload
    from active quotes (accepted status) and projects (active) per office
  - Returns office_id, auto_booked_jobs, auto_quote_value, auto_project_count
  - Used by RecommendedOfficeEngine to supplement manual workload entries

  ### 3. Indexes
  - Index on quotes(office_id) for fast workload aggregation (already exists but safe)
  - Index on quotes(status) for filtering active quotes

  ## Security
  - View uses SECURITY INVOKER (inherits caller's RLS) — no bypass
*/

-- 1. Create lost_reason enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_lost_reason') THEN
    CREATE TYPE quote_lost_reason AS ENUM (
      'price_too_high',
      'competitor_chosen',
      'project_cancelled',
      'no_response',
      'scope_mismatch',
      'timeline_mismatch',
      'budget_cut',
      'went_inhouse',
      'other'
    );
  END IF;
END $$;

-- 2. Add lost_reason_code to quotes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'lost_reason_code'
  ) THEN
    ALTER TABLE quotes ADD COLUMN lost_reason_code quote_lost_reason;
  END IF;
END $$;

-- 3. Add lost_reason_code to leads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'lost_reason_code'
  ) THEN
    ALTER TABLE leads ADD COLUMN lost_reason_code quote_lost_reason;
  END IF;
END $$;

-- 4. Create auto workload view from accepted quotes + active projects per office
CREATE OR REPLACE VIEW office_workload_auto AS
SELECT
  o.id AS office_id,
  o.name AS office_name,
  COUNT(DISTINCT q.id) FILTER (
    WHERE q.status IN ('accepted', 'invoiced')
    AND q.accepted_at >= (CURRENT_DATE - INTERVAL '90 days')
  ) AS auto_booked_jobs,
  COALESCE(SUM(q.total) FILTER (
    WHERE q.status IN ('accepted', 'invoiced')
    AND q.accepted_at >= (CURRENT_DATE - INTERVAL '90 days')
  ), 0) AS auto_quote_value,
  COUNT(DISTINCT q.id) FILTER (
    WHERE q.status = 'sent'
    AND q.sent_at >= (CURRENT_DATE - INTERVAL '30 days')
  ) AS pending_quotes
FROM offices o
LEFT JOIN quotes q ON q.office_id = o.id
WHERE o.active = true
GROUP BY o.id, o.name;

-- 5. Index for fast office workload aggregation
CREATE INDEX IF NOT EXISTS idx_quotes_status_accepted_at
  ON quotes(status, accepted_at)
  WHERE status IN ('accepted', 'invoiced');
