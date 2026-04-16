/*
  # Add annotated_image_url and inspector_override flag to inspection_ai_items

  1. Changes
     - `annotated_image_url` (text) — URL of annotated/marked-up version of inspection photo
     - `inspector_override` (boolean, default false) — true when inspector has edited AI output

  2. Notes
     - Additive only, no data loss
     - Existing rows default to false / null
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'annotated_image_url'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN annotated_image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_items' AND column_name = 'inspector_override'
  ) THEN
    ALTER TABLE inspection_ai_items ADD COLUMN inspector_override boolean DEFAULT false;
  END IF;
END $$;
