-- Add Appendix Metadata Fields to Export Attachments
-- 
-- Overview:
-- Adds fields to support divider pages in merged PDF exports with appendix metadata.
--
-- Changes:
-- - Add display_title - User-editable title for divider page (optional)
-- - Add appendix_category - Category for classification (optional)
--
-- Supported Categories: Drawing, Elcometer / DFT Export, PDS, SDS, NCR Evidence, Photo Evidence, Other

-- Add display_title column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_export_attachments' AND column_name = 'display_title'
  ) THEN
    ALTER TABLE project_export_attachments ADD COLUMN display_title text;
  END IF;
END $$;

-- Add appendix_category column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_export_attachments' AND column_name = 'appendix_category'
  ) THEN
    ALTER TABLE project_export_attachments ADD COLUMN appendix_category text;
  END IF;
END $$;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_project_export_attachments_category 
  ON project_export_attachments(appendix_category) 
  WHERE appendix_category IS NOT NULL;
