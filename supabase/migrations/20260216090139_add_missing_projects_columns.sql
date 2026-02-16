/*
  # Add Missing Projects Columns
  
  ## Overview
  Adds columns to projects table that were in the original schema but are missing from the current database.
  
  ## Changes
  - Add client_name (text) for storing client name directly
  - Add main_contractor (text) for contractor information
  - Add site_address (text) for project location
  - Add project_ref (text) for project reference number
  - Add standards_json (jsonb) for standards compliance tracking
  - Add created_by_user_id (uuid) for tracking who created the project
  
  ## Notes
  - These columns coexist with client_id foreign key
  - client_name can be denormalized for quick access even when client_id is set
  - Maintains backward compatibility with existing code
*/

-- Add missing columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS main_contractor text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS site_address text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_ref text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS standards_json jsonb DEFAULT '{"standards": ["ISO 19840", "ISO 8501-1", "FPA NZ COP-3"]}'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id);

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_projects_client_name ON projects(client_name);
CREATE INDEX IF NOT EXISTS idx_projects_project_ref ON projects(project_ref);
CREATE INDEX IF NOT EXISTS idx_projects_created_by_user_id ON projects(created_by_user_id);