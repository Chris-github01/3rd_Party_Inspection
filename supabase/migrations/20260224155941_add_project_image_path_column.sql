/*
  # Add Project Image Path Column

  ## Problem
  The project creation wizard tries to save a project_image_path field that doesn't exist
  in the projects table, causing "Could not find the 'project_image_path' column" errors.

  ## Changes
  1. Add project_image_path column to projects table
     - project_image_path: Path to project image/photo stored in Supabase storage
  
  ## Security
  - Uses IF NOT EXISTS to prevent errors on re-run
*/

-- Add project image path column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_image_path text;

-- Add index for performance when filtering by image existence
CREATE INDEX IF NOT EXISTS idx_projects_with_images ON projects(project_image_path) WHERE project_image_path IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.project_image_path IS 'Path to project image/photo in Supabase storage (e.g., project-images/xyz.jpg)';
