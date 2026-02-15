/*
  # Create Storage Buckets
  
  ## Overview
  Creates storage buckets for file uploads in the inspection app.
  
  ## Buckets Created
  
  ### 1. documents
  - Stores project documents (drawings, schedules, PDS, SDS)
  - Public access for authenticated users
  
  ### 2. photos
  - Stores inspection photos
  - Public access for authenticated users
  
  ## Security
  - Authenticated users can upload files
  - Authenticated users can read all files
  - Only admins and inspectors can delete files
*/

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('documents', 'documents', true),
  ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can read documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Admins and inspectors can delete documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Anyone can read photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'photos');

CREATE POLICY "Admins and inspectors can delete photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );
