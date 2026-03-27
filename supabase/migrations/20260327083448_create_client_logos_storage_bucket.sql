/*
  # Create client logos storage bucket

  1. New Storage Bucket
    - `client-logos` bucket for storing client logo images
    - Public access for displaying on website
  
  2. Security
    - Allow authenticated users to upload logos
    - Allow public read access for website display
*/

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload client logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update client logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'client-logos');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete client logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-logos');

-- Allow public read access
CREATE POLICY "Public read access for client logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'client-logos');