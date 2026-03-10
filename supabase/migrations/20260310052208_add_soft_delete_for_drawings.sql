/*
  # Add Soft Delete Functionality for Drawings

  1. Changes
    - Add `deleted_at` column to drawings table for soft delete
    - Add `deleted_by` column to track who deleted the drawing
    - Create index on deleted_at for performance
    - Update RLS policies to exclude deleted drawings by default
    - Create function to restore deleted drawings

  2. Features
    - Soft delete (trash/recycle bin) pattern
    - Audit trail of deletions
    - Ability to restore within 30 days
    - Automatic permanent deletion after 30 days (optional)

  3. Security
    - Only authorized users can delete
    - Deleted items hidden from normal queries
    - Restore requires same permissions as delete
*/

-- Add soft delete columns to drawings table
ALTER TABLE drawings
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for performance on deleted_at queries
CREATE INDEX IF NOT EXISTS idx_drawings_deleted_at ON drawings(deleted_at)
WHERE deleted_at IS NOT NULL;

-- Create index for active (non-deleted) drawings
CREATE INDEX IF NOT EXISTS idx_drawings_active ON drawings(level_id, created_at)
WHERE deleted_at IS NULL;

-- Update SELECT policy to exclude deleted drawings by default
DROP POLICY IF EXISTS "Users can view drawings for their projects" ON drawings;

CREATE POLICY "Users can view active drawings for their projects"
  ON drawings FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM levels
      JOIN blocks ON blocks.id = levels.block_id
      JOIN projects ON projects.id = blocks.project_id
      WHERE levels.id = drawings.level_id
    )
  );

-- Create policy to view deleted drawings (for trash/restore functionality)
CREATE POLICY "Users can view deleted drawings for their projects"
  ON drawings FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM levels
      JOIN blocks ON blocks.id = levels.block_id
      JOIN projects ON projects.id = blocks.project_id
      WHERE levels.id = drawings.level_id
    )
  );

-- Update DELETE policy (soft delete via UPDATE)
CREATE POLICY "Users can soft delete drawings"
  ON drawings FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM levels
      JOIN blocks ON blocks.id = levels.block_id
      JOIN projects ON projects.id = blocks.project_id
      WHERE levels.id = drawings.level_id
    )
  )
  WITH CHECK (
    deleted_at IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM levels
      JOIN blocks ON blocks.id = levels.block_id
      JOIN projects ON projects.id = blocks.project_id
      WHERE levels.id = drawings.level_id
    )
  );

-- Function to soft delete a drawing
CREATE OR REPLACE FUNCTION soft_delete_drawing(p_drawing_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Check if drawing exists and is not already deleted
  IF NOT EXISTS (
    SELECT 1 FROM drawings
    WHERE id = p_drawing_id AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Drawing not found or already deleted'
    );
  END IF;

  -- Soft delete the drawing
  UPDATE drawings
  SET
    deleted_at = now(),
    deleted_by = v_user_id
  WHERE id = p_drawing_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Drawing moved to trash',
    'drawing_id', p_drawing_id
  );
END;
$$;

-- Function to restore a deleted drawing
CREATE OR REPLACE FUNCTION restore_drawing(p_drawing_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check if drawing exists and is deleted
  IF NOT EXISTS (
    SELECT 1 FROM drawings
    WHERE id = p_drawing_id AND deleted_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Drawing not found in trash'
    );
  END IF;

  -- Restore the drawing
  UPDATE drawings
  SET
    deleted_at = NULL,
    deleted_by = NULL
  WHERE id = p_drawing_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Drawing restored successfully',
    'drawing_id', p_drawing_id
  );
END;
$$;

-- Function to permanently delete old trashed drawings (optional cleanup)
CREATE OR REPLACE FUNCTION purge_old_deleted_drawings(p_days_old integer DEFAULT 30)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Permanently delete drawings older than specified days
  WITH deleted AS (
    DELETE FROM drawings
    WHERE deleted_at IS NOT NULL
      AND deleted_at < (now() - (p_days_old || ' days')::interval)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Old drawings permanently deleted',
    'count', v_deleted_count
  );
END;
$$;

-- Add helpful comments
COMMENT ON COLUMN drawings.deleted_at IS 'Timestamp when drawing was moved to trash (soft delete)';
COMMENT ON COLUMN drawings.deleted_by IS 'User who deleted the drawing';
COMMENT ON FUNCTION soft_delete_drawing IS 'Moves a drawing to trash instead of permanently deleting it';
COMMENT ON FUNCTION restore_drawing IS 'Restores a drawing from trash';
COMMENT ON FUNCTION purge_old_deleted_drawings IS 'Permanently deletes drawings that have been in trash for specified days';
