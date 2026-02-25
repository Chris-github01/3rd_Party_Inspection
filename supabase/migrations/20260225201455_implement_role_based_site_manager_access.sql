/*
  # Implement Role-Based Access Control for Site Manager

  ## Overview
  This migration implements proper role-based access control for the Site Manager document workflow system, 
  separating document management functions (admin/inspector) from field inspection operations (all authenticated users).

  ## Changes

  ### 1. Blocks Table Security
  - **INSERT/UPDATE/DELETE**: Restricted to admin and inspector roles only
  - **SELECT**: Available to all authenticated users with project access
  - Reasoning: Only project managers should create/modify building structure

  ### 2. Levels Table Security
  - **INSERT/UPDATE/DELETE**: Restricted to admin and inspector roles only
  - **SELECT**: Available to all authenticated users with project access
  - Reasoning: Level management is part of project setup, not field operations

  ### 3. Drawings Table Security
  - **INSERT/UPDATE/DELETE**: Restricted to admin and inspector roles only
  - **SELECT**: Available to all authenticated users with project access
  - Reasoning: Drawing uploads and management are administrative functions

  ### 4. Drawing Pins Table Security
  - **INSERT**: Available to all authenticated users (site managers need to place pins)
  - **UPDATE/DELETE**: Restricted to pin creator OR admin/inspector roles
  - **SELECT**: Available to all authenticated users with project access
  - Reasoning: Field users need to place pins, but can only modify their own

  ### 5. Pin Photos Table Security
  - **INSERT**: Available to all authenticated users (site managers upload photos)
  - **UPDATE/DELETE**: Restricted to photo uploader OR admin/inspector roles
  - **SELECT**: Available to all authenticated users with project access
  - Reasoning: Field users attach photos, but can only modify their own

  ## Security Model
  - **admin role**: Full access to all operations
  - **inspector role**: Full access to all operations
  - **Site managers** (any authenticated user): Can place pins and upload photos, read-only for structure
  - **client role**: Read-only access to all data (existing policies maintained)

  ## Notes
  - All SELECT policies remain project-based for data isolation
  - Created_by/uploaded_by fields track ownership for UPDATE/DELETE policies
  - No breaking changes to existing functionality for admin/inspector users
  - Field users will see UI changes hiding management buttons (handled in frontend)
*/

-- ============================================
-- BLOCKS TABLE: Restrict modifications to admin/inspector
-- ============================================

DROP POLICY IF EXISTS "Users can create blocks for their projects" ON blocks;
DROP POLICY IF EXISTS "Users can update blocks for their projects" ON blocks;
DROP POLICY IF EXISTS "Users can delete blocks for their projects" ON blocks;

CREATE POLICY "Admins and inspectors can create blocks"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update blocks"
  ON blocks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can delete blocks"
  ON blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- ============================================
-- LEVELS TABLE: Restrict modifications to admin/inspector
-- ============================================

DROP POLICY IF EXISTS "Users can create levels for their projects" ON levels;
DROP POLICY IF EXISTS "Users can update levels for their projects" ON levels;
DROP POLICY IF EXISTS "Users can delete levels for their projects" ON levels;

CREATE POLICY "Admins and inspectors can create levels"
  ON levels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update levels"
  ON levels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can delete levels"
  ON levels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- ============================================
-- DRAWINGS TABLE: Restrict modifications to admin/inspector
-- ============================================

DROP POLICY IF EXISTS "Users can create drawings for their projects" ON drawings;
DROP POLICY IF EXISTS "Users can update drawings for their projects" ON drawings;
DROP POLICY IF EXISTS "Users can delete drawings for their projects" ON drawings;

CREATE POLICY "Admins and inspectors can create drawings"
  ON drawings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update drawings"
  ON drawings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can delete drawings"
  ON drawings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- ============================================
-- DRAWING_PINS TABLE: Allow pin creation by all, restrict updates to creator or admin/inspector
-- ============================================

-- Note: drawing_pins table needs a created_by column to track ownership
-- Check if it exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drawing_pins' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid();
    
    -- Backfill existing records (set to first admin user if exists, otherwise NULL)
    UPDATE drawing_pins 
    SET created_by = (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
    WHERE created_by IS NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can create pins for their projects" ON drawing_pins;
DROP POLICY IF EXISTS "Users can update pins for their projects" ON drawing_pins;
DROP POLICY IF EXISTS "Users can delete pins for their projects" ON drawing_pins;

CREATE POLICY "Authenticated users can create pins"
  ON drawing_pins FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own pins or admins/inspectors can update any"
  ON drawing_pins FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Users can delete their own pins or admins/inspectors can delete any"
  ON drawing_pins FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- ============================================
-- PIN_PHOTOS TABLE: Allow uploads by all, restrict updates to uploader or admin/inspector
-- ============================================

-- pin_photos already has uploaded_by column, so we can use it directly

DROP POLICY IF EXISTS "Authenticated users can upload pin photos" ON pin_photos;
DROP POLICY IF EXISTS "Users can update pin photos" ON pin_photos;
DROP POLICY IF EXISTS "Users can delete pin photos" ON pin_photos;

CREATE POLICY "Authenticated users can upload pin photos"
  ON pin_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own photos or admins/inspectors can update any"
  ON pin_photos FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Users can delete their own photos or admins/inspectors can delete any"
  ON pin_photos FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

-- ============================================
-- INSPECTION_PACKAGES TABLE: Restrict to admin/inspector (project configuration)
-- ============================================

DROP POLICY IF EXISTS "Users can create inspection packages" ON inspection_packages;
DROP POLICY IF EXISTS "Users can update inspection packages" ON inspection_packages;
DROP POLICY IF EXISTS "Users can delete inspection packages" ON inspection_packages;

CREATE POLICY "Admins and inspectors can create inspection packages"
  ON inspection_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can update inspection packages"
  ON inspection_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );

CREATE POLICY "Admins and inspectors can delete inspection packages"
  ON inspection_packages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'inspector')
    )
  );
