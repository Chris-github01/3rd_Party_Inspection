/*
  # Add Base Location Fields to Organizations

  Adds office/base location configuration to the organizations table
  to support automatic travel pricing calculations.

  ## New Columns on `organizations`
  - `base_address` — human-readable office address
  - `base_lat` — latitude of the office (optional, for precise distance calc)
  - `base_lng` — longitude of the office (optional, for precise distance calc)
  - `google_maps_api_key` — optional per-org Google Maps API key (stored encrypted-at-rest via Supabase)
  - `travel_km_rate` — configurable $/km rate (defaults to 1.20)
  - `travel_parking_note` — default parking note shown on quotes

  ## Also on `company_settings`
  - `base_address` — same fields mirrored for orgs using the legacy company_settings table
  - `base_lat`
  - `base_lng`
  - `travel_km_rate`
  - `travel_parking_note`

  ## Notes
  - No destructive changes
  - All new columns nullable with sensible defaults
*/

-- organizations table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'base_address') THEN
    ALTER TABLE organizations ADD COLUMN base_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'base_lat') THEN
    ALTER TABLE organizations ADD COLUMN base_lat double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'base_lng') THEN
    ALTER TABLE organizations ADD COLUMN base_lng double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'google_maps_api_key') THEN
    ALTER TABLE organizations ADD COLUMN google_maps_api_key text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'travel_km_rate') THEN
    ALTER TABLE organizations ADD COLUMN travel_km_rate numeric(6,3) DEFAULT 1.20;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'travel_parking_note') THEN
    ALTER TABLE organizations ADD COLUMN travel_parking_note text DEFAULT 'Parking charged at cost';
  END IF;
END $$;

-- company_settings table (legacy single-org support)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'base_address') THEN
    ALTER TABLE company_settings ADD COLUMN base_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'base_lat') THEN
    ALTER TABLE company_settings ADD COLUMN base_lat double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'base_lng') THEN
    ALTER TABLE company_settings ADD COLUMN base_lng double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'travel_km_rate') THEN
    ALTER TABLE company_settings ADD COLUMN travel_km_rate numeric(6,3) DEFAULT 1.20;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'travel_parking_note') THEN
    ALTER TABLE company_settings ADD COLUMN travel_parking_note text DEFAULT 'Parking charged at cost';
  END IF;
END $$;
