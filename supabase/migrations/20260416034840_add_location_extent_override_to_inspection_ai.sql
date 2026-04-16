/*
  # Add Location, Extent, and Inspector Override fields to Inspection AI items

  1. Changes to `inspection_ai_items`
     - `location_level` (text) — floor/level (e.g. "Level 3", "Roof")
     - `location_grid` (text) — grid reference (e.g. "B4", "Column 12")
     - `location_description` (text) — free text description of location
     - `extent` (text) — one of: Localised | Moderate | Widespread
     - `defect_type_override` (text) — inspector-corrected defect type (nullable)
     - `severity_override` (text) — inspector-corrected severity (nullable)
     - `observation_override` (text) — inspector-edited observation (nullable)

  2. Notes
     - All columns are nullable so existing rows are unaffected
     - No data loss — additive migration only
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'location_level'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN location_level text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'location_grid'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN location_grid text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'location_description'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN location_description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'extent'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN extent text DEFAULT 'Localised';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'defect_type_override'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN defect_type_override text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'severity_override'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN severity_override text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'observation_override'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN observation_override text;
  END IF;
END $$;
