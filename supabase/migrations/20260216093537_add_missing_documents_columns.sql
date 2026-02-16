/*
  # Add missing columns to documents table

  1. Changes
    - Add `filename` column (the storage filename)
    - Add `original_name` column (the user's original filename)
    - Add `type` column (document type like 'fire_schedule')
    - Add `size_bytes` column (file size)
    - Add `storage_path` column (path in storage bucket)
    
  2. Notes
    - These columns match what the frontend code expects
    - Existing columns (file_name, document_type, etc.) remain for backward compatibility
*/

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'filename'
  ) THEN
    ALTER TABLE documents ADD COLUMN filename text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'original_name'
  ) THEN
    ALTER TABLE documents ADD COLUMN original_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'type'
  ) THEN
    ALTER TABLE documents ADD COLUMN type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'size_bytes'
  ) THEN
    ALTER TABLE documents ADD COLUMN size_bytes bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE documents ADD COLUMN storage_path text;
  END IF;
END $$;