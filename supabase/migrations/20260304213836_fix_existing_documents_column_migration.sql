/*
  # Fix Existing Documents - Column Migration
  
  1. Purpose
    - Migrate existing document data from 'type' column to 'document_type' column
    - Ensures existing uploaded drawings are detected by workflow validation
  
  2. Changes
    - Copy data from 'type' to 'document_type' where document_type is null
    - Set default 'other' type for any documents without a type
  
  3. Impact
    - Existing drawings will now be detected by the workflow system
    - Site Manager will become accessible if drawings exist
*/

-- Copy data from 'type' column to 'document_type' column for existing documents
UPDATE documents
SET document_type = type
WHERE document_type IS NULL AND type IS NOT NULL;

-- Ensure any documents without explicit type are marked as 'other'
UPDATE documents
SET document_type = 'other'
WHERE document_type IS NULL;
