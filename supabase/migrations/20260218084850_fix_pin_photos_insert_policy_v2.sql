/*
  # Fix Pin Photos Insert Policy - Correct Approach

  1. Problem
    - The WITH CHECK clause was referencing pin_photos.pin_id which doesn't exist during INSERT
    - Need to check against the value being inserted directly
    - Use project_id that's being inserted for validation

  2. Solution
    - Create policy that validates project ownership directly
    - Check that the project_id being inserted belongs to the authenticated user
    - This allows the insert to succeed when user owns the project

  3. Security
    - Still maintains security by checking project ownership
    - Simpler and more efficient than JOIN approach
*/

-- Drop the problematic insert policy
DROP POLICY IF EXISTS "Authenticated users can insert pin photos for their pins" ON pin_photos;

-- Create new insert policy that checks project ownership directly
CREATE POLICY "Users can insert photos for their project pins"
  ON pin_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM projects p
      WHERE p.id = project_id
      AND p.created_by_user_id = auth.uid()
    )
  );