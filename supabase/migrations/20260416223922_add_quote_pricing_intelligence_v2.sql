/*
  # Quote Pricing Intelligence Schema v2

  ## Changes
  - Adds win_probability, pricing_tier, region to quotes table
  - Creates quote_outcomes table for historical analytics with RLS
*/

-- Add pricing intelligence columns to quotes (safe, idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'win_probability'
  ) THEN
    ALTER TABLE quotes ADD COLUMN win_probability text DEFAULT 'balanced';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'pricing_tier'
  ) THEN
    ALTER TABLE quotes ADD COLUMN pricing_tier text DEFAULT 'balanced';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'region'
  ) THEN
    ALTER TABLE quotes ADD COLUMN region text DEFAULT NULL;
  END IF;
END $$;

-- Drop and recreate quote_outcomes cleanly
DROP TABLE IF EXISTS quote_outcomes CASCADE;

CREATE TABLE quote_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  quote_number text,
  client_name text NOT NULL DEFAULT '',
  service_type text,
  region text,
  gross_margin_pct numeric(6,2),
  total numeric(12,2),
  pricing_tier text DEFAULT 'balanced',
  outcome text NOT NULL DEFAULT 'no_response',
  outcome_recorded_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT quote_outcomes_outcome_check CHECK (outcome IN ('won', 'lost', 'no_response'))
);

ALTER TABLE quote_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can select their quote outcomes"
  ON quote_outcomes FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can insert quote outcomes"
  ON quote_outcomes FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update their quote outcomes"
  ON quote_outcomes FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou WHERE ou.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou WHERE ou.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can delete their quote outcomes"
  ON quote_outcomes FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou WHERE ou.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_quote_outcomes_org ON quote_outcomes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quote_outcomes_service_type ON quote_outcomes(organization_id, service_type);
CREATE INDEX IF NOT EXISTS idx_quote_outcomes_region ON quote_outcomes(organization_id, region);
CREATE INDEX IF NOT EXISTS idx_quote_outcomes_client ON quote_outcomes(organization_id, client_name);
CREATE INDEX IF NOT EXISTS idx_quote_outcomes_outcome ON quote_outcomes(organization_id, outcome);
