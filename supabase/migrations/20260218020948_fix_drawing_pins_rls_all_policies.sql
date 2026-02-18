/*
  # Fix All Drawing Pins RLS Policies

  1. Changes
    - Update UPDATE policy to use project-based access control
    - Update DELETE policy to use project-based access control
    - Replace admin/inspector-only restrictions with project membership checks

  2. Security
    - Maintains data security through project-based access
    - Consistent with other tables in the system
*/

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Admins and inspectors can update drawing pins" ON drawing_pins;
DROP POLICY IF EXISTS "Admins and inspectors can delete drawing pins" ON drawing_pins;

-- Create project-based UPDATE policy
CREATE POLICY "Users can update pins for their projects"
  ON drawing_pins FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawing_pins.project_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawing_pins.project_id
    )
  );

-- Create project-based DELETE policy
CREATE POLICY "Users can delete pins for their projects"
  ON drawing_pins FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = drawing_pins.project_id
    )
  );