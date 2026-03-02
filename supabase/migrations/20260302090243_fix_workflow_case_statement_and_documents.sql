/*
  # Fix workflow blocking function and document data

  1. Fixes
    - Add ELSE clause to get_workflow_blocking_reasons CASE statement
    - Update document with null filename to use proper storage path
  
  2. Changes
    - Add default ELSE case to prevent "case not found" errors
    - Populate missing filename/storage_path fields for orphaned documents
*/

-- Fix the workflow blocking reasons function
CREATE OR REPLACE FUNCTION get_workflow_blocking_reasons(
  p_project_id uuid,
  p_tab_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  state jsonb;
  reasons jsonb := '[]'::jsonb;
BEGIN
  -- Get current state
  state := calculate_project_workflow_state(p_project_id);

  -- Check dependencies based on tab
  CASE p_tab_name
    -- REMOVED: loading_schedule blocking - it should always be accessible
    -- as it's a primary way to upload documents

    WHEN 'site_manager' THEN
      IF NOT (state->>'drawings_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'drawings_missing',
          'message', 'Upload Drawings in Documents',
          'action', 'Go to Documents'
        );
      END IF;

    WHEN 'members' THEN
      IF NOT (state->>'locations_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'locations_missing',
          'message', 'Configure Site Manager - Create Spatial Zones',
          'action', 'Go to Site Manager'
        );
      END IF;

    WHEN 'inspections' THEN
      IF NOT (state->>'locations_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'locations_missing',
          'message', 'Configure locations in Site Manager',
          'action', 'Go to Site Manager'
        );
      END IF;
      IF NOT (state->>'members_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'members_missing',
          'message', 'Assign members to locations',
          'action', 'Go to Member Register'
        );
      END IF;

    WHEN 'ncrs' THEN
      IF NOT (state->>'locations_ready')::boolean THEN
        reasons := reasons || jsonb_build_object(
          'type', 'locations_missing',
          'message', 'Configure locations in Site Manager',
          'action', 'Go to Site Manager'
        );
      END IF;
    
    ELSE
      -- Default case: no blocking for unrecognized tabs
      -- This includes: documents, exports, loading_schedule, pin_corrections
      NULL;
  END CASE;

  RETURN jsonb_build_object(
    'is_blocked', jsonb_array_length(reasons) > 0,
    'reasons', reasons,
    'state', state
  );
END;
$$;

-- Update documents with null filename to use file_path or file_name
UPDATE documents
SET 
  filename = COALESCE(filename, storage_path, file_path),
  storage_path = COALESCE(storage_path, filename, file_path)
WHERE filename IS NULL OR storage_path IS NULL;
