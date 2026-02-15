/*
  # Enhance Export Attachments for Image Support
  
  ## Overview
  Extends the export attachments system to support image uploads (PNG/JPG) with
  automatic conversion to PDF for merging.
  
  ## Changes
  
  ### project_export_attachments Table Updates
  - Add `source_type` column to track original file type (pdf/image)
  - Add `converted_pdf_document_id` to reference auto-generated PDF from images
  - Add `mime_type` for file type tracking
  
  ### documents Table Updates
  - Add `mime_type` column if not exists
  - Support both original images and converted PDFs
  
  ## Features
  - Track original file type (PDF or image)
  - Reference converted PDF for images
  - Maintain merge order with mixed file types
  - Support PDF, PNG, JPG, JPEG uploads
  
  ## Security
  - RLS policies remain restrictive
  - Only admin/inspector can upload attachments
*/

-- Add mime_type to documents table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE documents ADD COLUMN mime_type text;
  END IF;
END $$;

-- Add new columns to project_export_attachments
DO $$
BEGIN
  -- Add source_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_export_attachments' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE project_export_attachments ADD COLUMN source_type text DEFAULT 'pdf' CHECK (source_type IN ('pdf', 'image'));
  END IF;

  -- Add converted_pdf_document_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_export_attachments' AND column_name = 'converted_pdf_document_id'
  ) THEN
    ALTER TABLE project_export_attachments ADD COLUMN converted_pdf_document_id uuid REFERENCES documents(id);
  END IF;

  -- Add mime_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_export_attachments' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE project_export_attachments ADD COLUMN mime_type text;
  END IF;
END $$;

-- Create index for converted PDFs
CREATE INDEX IF NOT EXISTS idx_project_export_attachments_converted_pdf 
  ON project_export_attachments(converted_pdf_document_id) 
  WHERE converted_pdf_document_id IS NOT NULL;
