/*
  # Fix Pin Photos RLS Insert Policy

  1. Changes
    - Drop existing restrictive INSERT policy
    - Create new INSERT policy that properly validates project ownership
    - Add policy that allows inserts when user owns the project through drawing_pins relationship

  2. Security
    - Maintains security by checking project ownership through pin relationship
    - Allows authenticated users to insert photos for pins in their projects
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert pin photos in their projects" ON pin_photos;

-- Create new insert policy with proper validation
CREATE POLICY "Authenticated users can insert pin photos for their pins"
  ON pin_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM drawing_pins dp
      JOIN projects p ON p.id = dp.project_id
      WHERE dp.id = pin_photos.pin_id
      AND p.created_by_user_id = auth.uid()
    )
  );