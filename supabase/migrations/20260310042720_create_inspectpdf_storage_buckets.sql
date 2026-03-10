/*
  # Create InspectPDF Storage Buckets

  1. New Storage Buckets
    - `pdf-workspaces` - Stores PDF files being edited in InspectPDF
    - `pdf-thumbnails` - Stores thumbnail previews of PDF pages

  2. Storage Policies
    - Users can upload/download their own PDF workspace files
    - Users can upload/download their own thumbnail files
    - Public read access disabled for security

  3. Bucket Configuration
    - Max file size: 50MB for PDFs
    - Allowed mime types: application/pdf for workspaces
    - Allowed mime types: image/png, image/jpeg for thumbnails
*/

-- Create pdf-workspaces bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-workspaces',
  'pdf-workspaces',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create pdf-thumbnails bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-thumbnails',
  'pdf-thumbnails',
  false,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pdf-workspaces bucket
CREATE POLICY "Users can upload own PDF workspace files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pdf-workspaces' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own PDF workspace files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pdf-workspaces' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own PDF workspace files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pdf-workspaces' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own PDF workspace files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pdf-workspaces' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for pdf-thumbnails bucket
CREATE POLICY "Users can upload own PDF thumbnail files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pdf-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own PDF thumbnail files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pdf-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own PDF thumbnail files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pdf-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own PDF thumbnail files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pdf-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
