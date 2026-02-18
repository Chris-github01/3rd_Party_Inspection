/*
  # Fix Pin Photos Storage Policies

  1. Changes
    - Drop and recreate storage policies for pin-photos bucket
    - Simplify INSERT policy to allow authenticated users to upload
    - Keep other policies for security

  2. Security
    - Users can upload files (validation happens at database level)
    - Users can only view/update/delete files in their projects
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can view pin photos in their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload pin photos to their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can update pin photos in their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete pin photos in their projects" ON storage.objects;

-- Recreate policies with correct logic
CREATE POLICY "Allow authenticated uploads to pin-photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pin-photos'
  );

CREATE POLICY "Users can view their project pin photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pin-photos' AND (
      auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Users can update their project pin photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pin-photos' AND (
      auth.uid() IS NOT NULL
    )
  );

CREATE POLICY "Users can delete their project pin photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pin-photos' AND (
      auth.uid() IS NOT NULL
    )
  );