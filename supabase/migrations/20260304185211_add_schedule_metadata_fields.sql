/*
  # Add Schedule Metadata Fields
  
  1. Changes to loading_schedule_imports table
    - Add `schedule_reference` text field for storing schedule ID (e.g., "CST-250911A")
    - Add `project_name_from_schedule` text field for project name from document
    - Add `coating_system_name` text field for coating system (e.g., "NULLIFIRE SC601")
    - Add `supplier_name` text field for supplier (e.g., "Altex Coatings Limited")
  
  2. Purpose
    - Store document-level metadata extracted from loading schedules
    - Support Altex format with headers/footers containing project info
    - Enable better reporting and document tracking
  
  3. Security
    - No RLS changes needed (inherits from existing policies)
*/

-- Add metadata fields to loading_schedule_imports
ALTER TABLE loading_schedule_imports 
ADD COLUMN IF NOT EXISTS schedule_reference text,
ADD COLUMN IF NOT EXISTS project_name_from_schedule text,
ADD COLUMN IF NOT EXISTS coating_system_name text,
ADD COLUMN IF NOT EXISTS supplier_name text;

-- Add helpful comment
COMMENT ON COLUMN loading_schedule_imports.schedule_reference IS 'Schedule reference ID extracted from document (e.g., CST-250911A)';
COMMENT ON COLUMN loading_schedule_imports.project_name_from_schedule IS 'Project name extracted from document header/footer';
COMMENT ON COLUMN loading_schedule_imports.coating_system_name IS 'Coating system name from document (e.g., NULLIFIRE SC601)';
COMMENT ON COLUMN loading_schedule_imports.supplier_name IS 'Supplier/manufacturer name (e.g., Altex Coatings Limited)';
