/*
  # Add mime_type and page_count to inspection_ai_drawings

  ## Changes
  - `mime_type` (text, nullable) — stores the MIME type of the uploaded file
    e.g. application/pdf, image/png, image/jpeg, image/webp
  - `page_count` (integer, default 1) — number of pages; PDF files may have >1,
    image files are always 1
  - `file_type` is extended to accept 'pdf' | 'image' (already exists, no change needed)

  ## Backward compatibility
  - Existing rows get mime_type = NULL (safe, handled in app via file_type fallback)
  - Existing rows get page_count = 1 (safe default)
  - No existing data is destroyed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_drawings' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE inspection_ai_drawings ADD COLUMN mime_type text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_ai_drawings' AND column_name = 'page_count'
  ) THEN
    ALTER TABLE inspection_ai_drawings ADD COLUMN page_count integer NOT NULL DEFAULT 1;
  END IF;
END $$;
