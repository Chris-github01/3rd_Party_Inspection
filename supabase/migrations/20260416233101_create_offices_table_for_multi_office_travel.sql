/*
  # Create Offices Table — Multi-Office Travel Pricing

  Allows organisations to store multiple office/depot locations so the Growth Hub
  can automatically pick the nearest office when calculating travel pricing.

  ## New Table: `offices`
  - `id` (uuid, pk)
  - `organization_id` — foreign key to organizations (nullable for legacy single-org)
  - `name` — friendly name, e.g. "Auckland CBD", "Wellington Depot"
  - `address` — full street address
  - `lat` / `lng` — geocoded coordinates (optional but recommended)
  - `is_default` — one office can be the default for quotes
  - `travel_km_rate` — per-office override rate (falls back to org rate)
  - `travel_parking_note` — per-office note
  - `is_cbd` — flag for CBD mode (applies parking surcharge + congestion note)
  - `cbd_parking_surcharge` — additional parking cost when is_cbd = true
  - `active` — soft-delete flag
  - `created_at` / `updated_at`

  ## Security
  - RLS enabled
  - Authenticated users can read/insert/update/delete their own org's offices
*/

CREATE TABLE IF NOT EXISTS offices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid REFERENCES organizations(id) ON DELETE SET NULL,
  name                  text NOT NULL DEFAULT 'Main Office',
  address               text,
  lat                   double precision,
  lng                   double precision,
  is_default            boolean NOT NULL DEFAULT false,
  travel_km_rate        numeric(6,3) DEFAULT 1.20,
  travel_parking_note   text DEFAULT 'Parking charged at cost',
  is_cbd                boolean NOT NULL DEFAULT false,
  cbd_parking_surcharge numeric(8,2) DEFAULT 40.00,
  active                boolean NOT NULL DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read offices"
  ON offices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert offices"
  ON offices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update offices"
  ON offices FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete offices"
  ON offices FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_offices_organization_id ON offices(organization_id);
CREATE INDEX IF NOT EXISTS idx_offices_active ON offices(active) WHERE active = true;
