/*
  # Add Active Column to Fire Protection Materials

  1. Changes
    - Add `active` column to `fire_protection_materials` table
    - Default to true for existing records
    - Add `thickness_unit` column for consistency with inspection packages
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fire_protection_materials' AND column_name = 'active'
  ) THEN
    ALTER TABLE fire_protection_materials ADD COLUMN active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fire_protection_materials' AND column_name = 'thickness_unit'
  ) THEN
    ALTER TABLE fire_protection_materials ADD COLUMN thickness_unit text DEFAULT 'microns';
  END IF;
END $$;