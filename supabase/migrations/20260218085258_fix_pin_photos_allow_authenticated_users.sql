/*
  # Fix Pin Photos RLS - Allow Authenticated Users

  1. Problem
    - Demo projects have created_by_user_id = NULL
    - Current policy only allows users who own the project
    - Authenticated users should be able to add photos to any project

  2. Solution
    - Update INSERT policy to allow all authenticated users
    - Maintain security by still requiring authentication
    - Project ownership can be enforced at application level if needed

  3. Security
    - Requires authentication (not public)
    - Validates project exists
    - Suitable for collaborative environments
*/

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Users can insert photos for their project pins" ON pin_photos;

-- Create new policy that allows authenticated users to insert photos
CREATE POLICY "Authenticated users can insert pin photos"
  ON pin_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM projects p
      WHERE p.id = project_id
    )
  );