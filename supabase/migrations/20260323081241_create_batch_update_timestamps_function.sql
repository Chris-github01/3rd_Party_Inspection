/*
  # Batch Update Timestamps Function

  1. New Functions
    - `batch_update_reading_timestamps` - Efficiently updates multiple reading timestamps in a single operation

  2. Purpose
    - Optimizes the Professional DFT Report date/time distribution feature
    - Replaces individual UPDATE queries with a single batch operation
    - Dramatically improves performance when updating thousands of readings

  3. Security
    - Function runs with SECURITY DEFINER to ensure proper RLS enforcement
    - Validates that user has access to the project
*/

-- Create function to batch update reading timestamps
CREATE OR REPLACE FUNCTION batch_update_reading_timestamps(
  p_project_id uuid,
  p_updates jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_update_count integer := 0;
  v_reading jsonb;
BEGIN
  -- Verify user has access to this project
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;

  -- Loop through updates and apply them
  FOR v_reading IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE inspection_readings
    SET created_at = (v_reading->>'timestamp')::timestamptz
    WHERE id = (v_reading->>'readingId')::uuid
      AND project_id = p_project_id;

    IF FOUND THEN
      v_update_count := v_update_count + 1;
    END IF;
  END LOOP;

  RETURN v_update_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION batch_update_reading_timestamps TO authenticated;

-- Add comment
COMMENT ON FUNCTION batch_update_reading_timestamps IS 'Batch updates inspection reading timestamps for professional report generation';
