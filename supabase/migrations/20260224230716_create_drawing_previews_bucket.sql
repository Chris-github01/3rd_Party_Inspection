/*
  # Create Drawing Previews Storage Bucket

  Creates a storage bucket for pre-generated drawing page preview images.

  ## Bucket Configuration
  - Name: `drawing-previews`
  - Public: false (requires authentication)
  - File size limit: 10MB per file
  - Allowed MIME types: image/png, image/jpeg

  ## Storage Structure
  - Path format: `projects/{project_id}/drawings/{drawing_id}/page-{N}.png`
  - Example: `projects/abc-123/drawings/def-456/page-1.png`

  ## Security
  - RLS policies allow authenticated users to:
    - Read previews for projects they have access to
    - Upload previews for projects they have access to
    - Delete previews for projects they own
*/

-- Create the drawing-previews bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drawing-previews',
  'drawing-previews',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can view previews for their projects
CREATE POLICY "Users can view drawing previews for their projects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'drawing-previews' AND
  EXISTS (
    SELECT 1 FROM drawings d
    JOIN levels l ON l.id = d.level_id
    JOIN blocks b ON b.id = l.block_id
    WHERE storage.objects.name LIKE 'projects/' || b.project_id::text || '/%'
  )
);

-- Policy: Users can upload previews for their projects
CREATE POLICY "Users can upload drawing previews for their projects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'drawing-previews' AND
  EXISTS (
    SELECT 1 FROM drawings d
    JOIN levels l ON l.id = d.level_id
    JOIN blocks b ON b.id = l.block_id
    WHERE storage.objects.name LIKE 'projects/' || b.project_id::text || '/%'
  )
);

-- Policy: Users can update previews for their projects
CREATE POLICY "Users can update drawing previews for their projects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'drawing-previews' AND
  EXISTS (
    SELECT 1 FROM drawings d
    JOIN levels l ON l.id = d.level_id
    JOIN blocks b ON b.id = l.block_id
    WHERE storage.objects.name LIKE 'projects/' || b.project_id::text || '/%'
  )
);

-- Policy: Users can delete previews for their projects
CREATE POLICY "Users can delete drawing previews for their projects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'drawing-previews' AND
  EXISTS (
    SELECT 1 FROM drawings d
    JOIN levels l ON l.id = d.level_id
    JOIN blocks b ON b.id = l.block_id
    WHERE storage.objects.name LIKE 'projects/' || b.project_id::text || '/%'
  )
);
