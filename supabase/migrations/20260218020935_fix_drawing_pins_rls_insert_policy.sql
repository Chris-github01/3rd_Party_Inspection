/*
  # Fix Drawing Pins INSERT RLS Policy

  1. Changes
    - Drop the restrictive admin/inspector-only INSERT policy
    - Create a new policy that allows authenticated users to insert pins for their projects
    - Aligns with the project-based access control pattern used elsewhere

  2. Security
    - Users can only insert pins for projects they have access to
    - Access is verified through the projects table
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins and inspectors can create drawing pins" ON drawing_pins;

-- Create a new project-based policy
CREATE POLICY "Users can create pins for their projects"
  ON drawing_pins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawing_pins.project_id
    )
  );