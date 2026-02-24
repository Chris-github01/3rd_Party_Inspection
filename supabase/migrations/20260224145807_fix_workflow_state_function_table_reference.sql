-- Fix calculate_project_workflow_state to use correct table name
-- The function references 'project_workflow_states' but table is 'project_workflow_state'

DROP FUNCTION IF EXISTS calculate_project_workflow_state(uuid);

CREATE OR REPLACE FUNCTION calculate_project_workflow_state(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  state jsonb;
  has_documents boolean;
  has_drawings boolean;
  has_locations boolean;
  has_members_with_locations boolean;
  full_workflow boolean;
  doc_count int;
  drawing_count int;
  pin_count int;
  zone_count int;
  member_count int;
BEGIN
  -- Check for any documents
  SELECT COUNT(*) INTO doc_count
  FROM documents
  WHERE project_id = p_project_id;
  
  has_documents := doc_count > 0;

  -- Check for drawings
  SELECT COUNT(*) INTO drawing_count
  FROM documents
  WHERE project_id = p_project_id
    AND document_type = 'drawing';
  
  has_drawings := drawing_count > 0;

  -- Check for spatial configuration
  SELECT COUNT(*) INTO pin_count
  FROM drawing_pins
  WHERE project_id = p_project_id;

  SELECT COUNT(*) INTO zone_count
  FROM blocks
  WHERE project_id = p_project_id;
  
  has_locations := (pin_count > 0 OR zone_count > 0);

  -- Check for members with location assignments
  SELECT COUNT(*) INTO member_count
  FROM members m
  WHERE m.project_id = p_project_id
    AND (m.block IS NOT NULL OR m.level IS NOT NULL);
  
  has_members_with_locations := member_count > 0;

  -- Workflow is ready if all prerequisites are met
  full_workflow := has_documents AND has_drawings AND has_locations AND has_members_with_locations;

  -- Build state JSON
  state := jsonb_build_object(
    'documents_ready', has_documents,
    'drawings_ready', has_drawings,
    'locations_ready', has_locations,
    'members_ready', has_members_with_locations,
    'workflow_ready', full_workflow,
    'counts', jsonb_build_object(
      'documents', doc_count,
      'drawings', drawing_count,
      'pins', pin_count,
      'zones', zone_count,
      'members_with_locations', member_count
    )
  );

  RETURN state;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_project_workflow_state(uuid) TO authenticated;
