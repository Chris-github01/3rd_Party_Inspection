/*
  # Fix Loading Schedule Tab Workflow Blocking
  
  1. Changes
    - Remove incorrect blocking logic for loading_schedule tab
    - Loading schedule upload IS a document upload, so it should never be blocked
    - This was creating a circular dependency
  
  2. Impact
    - Users can now access Loading Schedule tab immediately
    - Uploading loading schedules will populate documents and unblock other tabs
*/

-- Update the workflow blocking function to remove loading_schedule blocking
CREATE OR REPLACE FUNCTION get_workflow_blocking_reasons(
  p_project_id uuid,
  p_tab_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  END CASE;

  RETURN jsonb_build_object(
    'is_blocked', jsonb_array_length(reasons) > 0,
    'reasons', reasons,
    'state', state
  );
END;
$$;