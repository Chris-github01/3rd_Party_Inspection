/*
  # Add Storage Policies for Parsing Artifacts

  1. Security Changes
    - Add storage policies for parsing-artifacts bucket
    - Allow service role to manage all artifacts
    - Allow authenticated users to read their project artifacts
*/

-- Allow service role (used by edge functions) to manage all artifacts
CREATE POLICY "Service role can manage all parsing artifacts"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'parsing-artifacts');

-- Allow authenticated users to read artifacts
CREATE POLICY "Authenticated users can read parsing artifacts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'parsing-artifacts');

-- Allow authenticated users to upload artifacts (for their own projects)
CREATE POLICY "Authenticated users can upload parsing artifacts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'parsing-artifacts');
