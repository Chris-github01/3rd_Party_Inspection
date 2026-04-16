/*
  # Add Tier Telemetry Columns to inspection_ai_items

  ## Purpose
  Persist which AI model tier handled each analysis so the telemetry dashboard
  can track Tier 1 vs Tier 2 usage rates, escalation rates, and latency by tier.

  ## Changes to inspection_ai_items
  - `tier_used`   (integer, 1 or 2) — which model tier produced this result
  - `model_used`  (text)            — the exact model string (e.g. "gpt-4o-mini")
  - `latency_ms`  (integer)         — client-measured round-trip time in milliseconds

  ## Notes
  - All columns are nullable; existing rows remain valid with NULLs
  - No destructive changes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'tier_used'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN tier_used integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'model_used'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN model_used text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'latency_ms'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN latency_ms integer;
  END IF;
END $$;
