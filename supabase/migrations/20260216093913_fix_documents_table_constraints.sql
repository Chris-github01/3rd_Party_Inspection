/*
  # Fix documents table constraints and sync columns

  1. Changes
    - Make old required columns (document_type, file_name, file_path) nullable
    - Add triggers to sync between old and new column names for backward compatibility
    - Set default values where appropriate
    
  2. Notes
    - This allows the frontend to use the new column names (type, filename, storage_path)
    - Maintains backward compatibility with any code using old column names
*/

-- Make old required columns nullable
ALTER TABLE documents ALTER COLUMN document_type DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN file_name DROP NOT NULL;
ALTER TABLE documents ALTER COLUMN file_path DROP NOT NULL;

-- Create a function to sync column values
CREATE OR REPLACE FUNCTION sync_documents_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync new columns to old columns
  IF NEW.type IS NOT NULL AND NEW.document_type IS NULL THEN
    NEW.document_type := NEW.type;
  END IF;
  
  IF NEW.filename IS NOT NULL AND NEW.file_name IS NULL THEN
    NEW.file_name := NEW.filename;
  END IF;
  
  IF NEW.storage_path IS NOT NULL AND NEW.file_path IS NULL THEN
    NEW.file_path := NEW.storage_path;
  END IF;
  
  -- Sync old columns to new columns
  IF NEW.document_type IS NOT NULL AND NEW.type IS NULL THEN
    NEW.type := NEW.document_type;
  END IF;
  
  IF NEW.file_name IS NOT NULL AND NEW.filename IS NULL THEN
    NEW.filename := NEW.file_name;
  END IF;
  
  IF NEW.file_path IS NOT NULL AND NEW.storage_path IS NULL THEN
    NEW.storage_path := NEW.file_path;
  END IF;
  
  -- Sync size_bytes to file_size_bytes
  IF NEW.size_bytes IS NOT NULL AND NEW.file_size_bytes IS NULL THEN
    NEW.file_size_bytes := NEW.size_bytes;
  END IF;
  
  IF NEW.file_size_bytes IS NOT NULL AND NEW.size_bytes IS NULL THEN
    NEW.size_bytes := NEW.file_size_bytes;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS sync_documents_columns_trigger ON documents;

-- Create trigger to sync columns on insert/update
CREATE TRIGGER sync_documents_columns_trigger
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION sync_documents_columns();