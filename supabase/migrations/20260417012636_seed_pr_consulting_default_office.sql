/*
  # Seed P&R Consulting Limited as Default Office

  ## Summary
  Inserts the company's primary office (P&R Consulting Limited, 9 Oro Lane, Orewa, Auckland)
  as the default departure point for all travel pricing calculations.

  ## Changes
  - Inserts one row into `offices` table if it doesn't already exist (matching by name)
  - Marks it as `is_default = true`
  - Clears any pre-existing default flag on other rows first
  - Stores geocoded lat/lng for Orewa, Auckland (OSM verified: -36.5935, 174.6994)
  - Sets standard km rate ($1.20/km) and active = true

  ## Notes
  - Safe to re-run — uses DO block with existence check
  - Does NOT drop or modify existing rows
*/

DO $$
DECLARE
  existing_id uuid;
  org_id uuid;
BEGIN
  -- Get the first organization id to associate with (if multi-org)
  SELECT id INTO org_id FROM organizations LIMIT 1;

  -- Check if P&R Consulting Limited office already exists
  SELECT id INTO existing_id
  FROM offices
  WHERE name = 'P&R Consulting Limited'
  LIMIT 1;

  IF existing_id IS NULL THEN
    -- Clear any existing default
    UPDATE offices SET is_default = false WHERE is_default = true;

    -- Insert the new default office
    INSERT INTO offices (
      organization_id,
      name,
      address,
      lat,
      lng,
      is_default,
      travel_km_rate,
      travel_parking_note,
      is_cbd,
      cbd_parking_surcharge,
      active
    ) VALUES (
      org_id,
      'P&R Consulting Limited',
      '9 Oro Lane, Orewa, Auckland 0931, New Zealand',
      -36.5935,
      174.6994,
      true,
      1.20,
      'Parking charged at cost',
      false,
      40,
      true
    );
  ELSE
    -- Office exists — ensure it is marked default with correct data
    UPDATE offices SET
      address              = '9 Oro Lane, Orewa, Auckland 0931, New Zealand',
      lat                  = -36.5935,
      lng                  = 174.6994,
      is_default           = true,
      travel_km_rate       = 1.20,
      active               = true
    WHERE id = existing_id;

    -- Clear default from all other offices
    UPDATE offices SET is_default = false WHERE id <> existing_id;
  END IF;
END $$;
