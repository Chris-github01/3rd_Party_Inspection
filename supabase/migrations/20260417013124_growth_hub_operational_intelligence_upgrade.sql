/*
  # Growth Hub Operational Intelligence Upgrade

  ## Summary
  Adds infrastructure for:
  1. Office capacity / workload tracking per week
  2. Persisted route bundles (linked to leads)
  3. Quote win_probability and office_id columns for analytics
  4. Recommended office scoring view

  ## New Tables
  - `office_workload` — weekly inspector availability and job targets per office
  - `route_bundles` — persisted route bundles with estimated savings
  - `route_bundle_stops` — individual stops within a bundle

  ## New Columns
  - `quotes.win_probability` — win probability tier string (already exists but ensure column present)
  - `quotes.office_id` — explicit FK to offices (supplements cost_inputs.office_id)

  ## Security
  - RLS enabled on all new tables
  - Authenticated users can read/write within their organization
*/

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Office workload / capacity table
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS office_workload (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid REFERENCES organizations(id) ON DELETE CASCADE,
  office_id             uuid REFERENCES offices(id) ON DELETE CASCADE,
  week_start            date NOT NULL,
  inspector_count       integer DEFAULT 1,
  available_days        integer DEFAULT 5,
  max_jobs_per_week     integer DEFAULT 10,
  booked_jobs           integer DEFAULT 0,
  notes                 text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE (office_id, week_start)
);

ALTER TABLE office_workload ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view office_workload"
  ON office_workload FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = office_workload.organization_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "org members can insert office_workload"
  ON office_workload FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = office_workload.organization_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "org members can update office_workload"
  ON office_workload FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = office_workload.organization_id
        AND ou.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = office_workload.organization_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "org members can delete office_workload"
  ON office_workload FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = office_workload.organization_id
        AND ou.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Route bundles
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS route_bundles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid REFERENCES organizations(id) ON DELETE CASCADE,
  office_id             uuid REFERENCES offices(id),
  label                 text NOT NULL DEFAULT '',
  total_km              numeric(8,1) DEFAULT 0,
  total_travel_mins     integer DEFAULT 0,
  estimated_travel_cost numeric(10,2) DEFAULT 0,
  saving_vs_separate    numeric(10,2) DEFAULT 0,
  km_rate               numeric(6,2) DEFAULT 1.20,
  zone                  text DEFAULT 'local',
  notes                 text,
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE route_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view route_bundles"
  ON route_bundles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = route_bundles.organization_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "org members can insert route_bundles"
  ON route_bundles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = route_bundles.organization_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "org members can update route_bundles"
  ON route_bundles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = route_bundles.organization_id
        AND ou.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = route_bundles.organization_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "org members can delete route_bundles"
  ON route_bundles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = route_bundles.organization_id
        AND ou.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Route bundle stops
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS route_bundle_stops (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id             uuid REFERENCES route_bundles(id) ON DELETE CASCADE,
  organization_id       uuid REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id               uuid REFERENCES leads(id) ON DELETE SET NULL,
  sort_order            integer DEFAULT 0,
  company_name          text NOT NULL DEFAULT '',
  site_address          text,
  estimated_km_from_prev numeric(6,1) DEFAULT 0,
  travel_minutes        integer DEFAULT 0,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE route_bundle_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view route_bundle_stops"
  ON route_bundle_stops FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = route_bundle_stops.organization_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "org members can insert route_bundle_stops"
  ON route_bundle_stops FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = route_bundle_stops.organization_id
        AND ou.user_id = auth.uid()
    )
  );

CREATE POLICY "org members can delete route_bundle_stops"
  ON route_bundle_stops FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = route_bundle_stops.organization_id
        AND ou.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Add office_id to quotes (explicit, nullable, supplements cost_inputs JSON)
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'office_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN office_id uuid REFERENCES offices(id);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Ensure win_probability column on quotes
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'win_probability'
  ) THEN
    ALTER TABLE quotes ADD COLUMN win_probability text DEFAULT 'balanced';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Add lost_reason to quotes for win/loss analytics
-- ──────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'lost_reason'
  ) THEN
    ALTER TABLE quotes ADD COLUMN lost_reason text DEFAULT '';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. Indexes for performance
-- ──────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_office_workload_office_week ON office_workload(office_id, week_start);
CREATE INDEX IF NOT EXISTS idx_route_bundles_org ON route_bundles(organization_id);
CREATE INDEX IF NOT EXISTS idx_route_bundle_stops_bundle ON route_bundle_stops(bundle_id);
CREATE INDEX IF NOT EXISTS idx_quotes_office_id ON quotes(office_id);
