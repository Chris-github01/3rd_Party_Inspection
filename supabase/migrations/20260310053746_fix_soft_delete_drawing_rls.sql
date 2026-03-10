/*
  # Fix Soft Delete Drawing RLS Issues

  1. Problem
    - The soft_delete_drawing function may be blocked by RLS policies
    - The function needs to bypass RLS to check if drawing exists

  2. Solution
    - Update function to properly handle RLS with SECURITY DEFINER
    - Ensure the function can see all drawings regardless of RLS policies
    - Add better error handling
*/

-- Drop and recreate the function with proper RLS handling
DROP FUNCTION IF EXISTS soft_delete_drawing(uuid);

CREATE OR REPLACE FUNCTION soft_delete_drawing(p_drawing_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_drawing_exists boolean;
  v_user_id uuid;
  v_rows_affected integer;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;

  -- Check if drawing exists (bypassing RLS since function is SECURITY DEFINER)
  -- We need to check the actual table, not through RLS
  SELECT EXISTS (
    SELECT 1 FROM drawings
    WHERE id = p_drawing_id
  ) INTO v_drawing_exists;

  IF NOT v_drawing_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Drawing not found'
    );
  END IF;

  -- Check if already deleted
  SELECT EXISTS (
    SELECT 1 FROM drawings
    WHERE id = p_drawing_id AND deleted_at IS NOT NULL
  ) INTO v_drawing_exists;

  IF v_drawing_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Drawing already deleted'
    );
  END IF;

  -- Soft delete the drawing
  UPDATE drawings
  SET
    deleted_at = now(),
    deleted_by = v_user_id
  WHERE id = p_drawing_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to delete drawing - may have been deleted concurrently'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Drawing moved to trash',
    'drawing_id', p_drawing_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Database error: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION soft_delete_drawing(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION soft_delete_drawing IS 'Moves a drawing to trash (soft delete). Uses SECURITY DEFINER to bypass RLS for the operation.';
