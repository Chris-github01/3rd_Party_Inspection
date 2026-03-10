/*
  # Create PDF Generated Files Storage Bucket

  1. New Storage Bucket
    - `pdf-generated-files` - Stores generated PDF files from operations (merge, split, rotate, extract)

  2. Storage Policies
    - Users can upload/download/delete their own generated PDF files
    - Public read access disabled for security

  3. Bucket Configuration
    - Max file size: 50MB for PDFs
    - Allowed mime types: application/pdf
*/

-- Create pdf-generated-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-generated-files',
  'pdf-generated-files',
  false,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pdf-generated-files bucket
CREATE POLICY "Users can upload own generated PDF files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pdf-generated-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own generated PDF files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pdf-generated-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own generated PDF files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pdf-generated-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own generated PDF files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pdf-generated-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
