/*
  # Add image_category to inspection_ai_drawings

  ## Summary
  Adds an `image_category` column that records the auto-detected visual category
  of each uploaded drawing/photo. The classifier runs client-side at upload time
  based on image dimensions, aspect ratio, and colour-spread heuristics.

  ## New Column
  - `image_category` (text, nullable) — one of:
      'drawing'        – architectural or engineering floor plan / schematic
      'site_photo'     – wide-angle on-site photograph
      'defect_closeup' – macro/close-up defect or detail shot
      'document_scan'  – scanned document or form (portrait, text-heavy)
      'screenshot'     – screen-capture (typically 16:9 or 4:3, uniform edges)
    NULL means either a PDF or that classification has not run yet.

  ## Notes
  - Existing rows remain NULL; the client will classify on next upload.
  - No RLS changes needed; this column follows the existing table policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_drawings'
      AND column_name = 'image_category'
  ) THEN
    ALTER TABLE inspection_ai_drawings
      ADD COLUMN image_category text DEFAULT NULL;
  END IF;
END $$;
