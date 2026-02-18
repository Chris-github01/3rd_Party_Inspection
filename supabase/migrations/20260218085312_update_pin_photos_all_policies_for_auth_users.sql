/*
  # Update All Pin Photos Policies for Authenticated Users

  1. Changes
    - Update SELECT, UPDATE, DELETE policies to allow authenticated users
    - Keep security by requiring authentication
    - Works with projects that have NULL created_by_user_id

  2. Security
    - All operations require authentication
    - Project must exist
    - Suitable for collaborative inspection workflow
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view pin photos in their projects" ON pin_photos;
DROP POLICY IF EXISTS "Users can update pin photos in their projects" ON pin_photos;
DROP POLICY IF EXISTS "Users can delete pin photos in their projects" ON pin_photos;

-- Create new policies for authenticated users
CREATE POLICY "Authenticated users can view pin photos"
  ON pin_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM projects p
      WHERE p.id = project_id
    )
  );

CREATE POLICY "Authenticated users can update pin photos"
  ON pin_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM projects p
      WHERE p.id = project_id
    )
  );

CREATE POLICY "Authenticated users can delete pin photos"
  ON pin_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM projects p
      WHERE p.id = project_id
    )
  );