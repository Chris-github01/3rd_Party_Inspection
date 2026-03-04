/*
  # Remove Workflow Blocking Restrictions

  ## Changes
  - Updates `get_workflow_blocking_reasons` function to never block any tabs
  - All tabs are now accessible with warnings only (no hard blocks)
  - Aligns database behavior with workflow.ts which sets `isAccessible: () => true`

  ## Rationale
  Users should be able to access all tabs regardless of workflow state.
  The UI will show helpful warnings and guidance, but never block access.
*/

-- Update the blocking function to never block (only return warnings in state)
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
BEGIN
  -- Get current state
  state := calculate_project_workflow_state(p_project_id);

  -- All tabs are accessible - return state with no blocking
  -- The frontend workflow.ts handles warnings and guidance
  RETURN jsonb_build_object(
    'is_blocked', false,
    'reasons', '[]'::jsonb,
    'state', state
  );
END;
$$;
