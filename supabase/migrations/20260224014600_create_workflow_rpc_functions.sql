/*
  # Create Workflow RPC Functions
  
  1. Functions
    - `recompute_project_workflow_state(project_id)` - Authoritative state recalculation
    - `log_workflow_event(project_id, event_type, payload)` - Event logging helper
    - `get_workflow_diagnostics(project_id)` - Debug information
    
  2. Purpose
    - Single source of truth for workflow state
    - Automatically called by triggers
    - Manual refresh capability
*/

-- Function to recompute workflow state (authoritative)
CREATE OR REPLACE FUNCTION recompute_project_workflow_state(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_documents_count int;
  v_loading_items_count int;
  v_members_count int;
  v_drawings_count int;
  v_pins_count int;
  v_inspections_count int;
  v_ncr_count int;
  v_last_import timestamptz;
  v_last_member timestamptz;
BEGIN
  -- Count documents
  SELECT COUNT(*) INTO v_documents_count
  FROM documents
  WHERE project_id = p_project_id;
  
  -- Count loading schedule items
  SELECT COUNT(*) INTO v_loading_items_count
  FROM loading_schedule_items
  WHERE project_id = p_project_id;
  
  -- Get last import timestamp
  SELECT MAX(created_at) INTO v_last_import
  FROM loading_schedule_imports
  WHERE project_id = p_project_id;
  
  -- Count members
  SELECT COUNT(*) INTO v_members_count
  FROM members
  WHERE project_id = p_project_id;
  
  -- Get last member creation timestamp
  SELECT MAX(created_at) INTO v_last_member
  FROM members
  WHERE project_id = p_project_id;
  
  -- Count drawings
  SELECT COUNT(DISTINCT d.id) INTO v_drawings_count
  FROM documents d
  WHERE d.project_id = p_project_id
    AND d.document_type = 'drawing';
  
  -- Count pins
  SELECT COUNT(*) INTO v_pins_count
  FROM drawing_pins
  WHERE project_id = p_project_id;
  
  -- Count inspections
  SELECT COUNT(*) INTO v_inspections_count
  FROM inspections
  WHERE project_id = p_project_id;
  
  -- Count NCRs
  SELECT COUNT(*) INTO v_ncr_count
  FROM ncrs
  WHERE project_id = p_project_id;
  
  -- Upsert workflow state
  INSERT INTO project_workflow_state (
    project_id,
    documents_count,
    loading_items_count,
    members_count,
    drawings_count,
    pins_count,
    inspections_count,
    ncr_count,
    last_import_at,
    last_member_create_at,
    updated_at
  ) VALUES (
    p_project_id,
    v_documents_count,
    v_loading_items_count,
    v_members_count,
    v_drawings_count,
    v_pins_count,
    v_inspections_count,
    v_ncr_count,
    v_last_import,
    v_last_member,
    now()
  )
  ON CONFLICT (project_id) DO UPDATE SET
    documents_count = EXCLUDED.documents_count,
    loading_items_count = EXCLUDED.loading_items_count,
    members_count = EXCLUDED.members_count,
    drawings_count = EXCLUDED.drawings_count,
    pins_count = EXCLUDED.pins_count,
    inspections_count = EXCLUDED.inspections_count,
    ncr_count = EXCLUDED.ncr_count,
    last_import_at = EXCLUDED.last_import_at,
    last_member_create_at = EXCLUDED.last_member_create_at,
    updated_at = now();
END;
$$;

-- Function to log workflow events
CREATE OR REPLACE FUNCTION log_workflow_event(
  p_project_id uuid,
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO workflow_events (
    project_id,
    user_id,
    event_type,
    payload
  ) VALUES (
    p_project_id,
    auth.uid(),
    p_event_type,
    p_payload
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Function to get workflow diagnostics
CREATE OR REPLACE FUNCTION get_workflow_diagnostics(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_state jsonb;
  v_recent_events jsonb;
  v_table_counts jsonb;
BEGIN
  -- Get current workflow state
  SELECT to_jsonb(ws.*) INTO v_state
  FROM project_workflow_state ws
  WHERE ws.project_id = p_project_id;
  
  -- Get recent events (last 20)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', we.id,
      'event_type', we.event_type,
      'payload', we.payload,
      'created_at', we.created_at,
      'user_id', we.user_id
    ) ORDER BY we.created_at DESC
  ) INTO v_recent_events
  FROM (
    SELECT * FROM workflow_events
    WHERE project_id = p_project_id
    ORDER BY created_at DESC
    LIMIT 20
  ) we;
  
  -- Get raw table counts for verification
  SELECT jsonb_build_object(
    'documents', (SELECT COUNT(*) FROM documents WHERE project_id = p_project_id),
    'loading_schedule_imports', (SELECT COUNT(*) FROM loading_schedule_imports WHERE project_id = p_project_id),
    'loading_schedule_items', (SELECT COUNT(*) FROM loading_schedule_items WHERE project_id = p_project_id),
    'members', (SELECT COUNT(*) FROM members WHERE project_id = p_project_id),
    'drawings', (SELECT COUNT(*) FROM documents WHERE project_id = p_project_id AND document_type = 'drawing'),
    'drawing_pins', (SELECT COUNT(*) FROM drawing_pins WHERE project_id = p_project_id),
    'inspections', (SELECT COUNT(*) FROM inspections WHERE project_id = p_project_id),
    'ncrs', (SELECT COUNT(*) FROM ncrs WHERE project_id = p_project_id),
    'blocks', (SELECT COUNT(*) FROM blocks WHERE project_id = p_project_id),
    'levels', (SELECT COUNT(*) FROM levels l JOIN blocks b ON b.id = l.block_id WHERE b.project_id = p_project_id)
  ) INTO v_table_counts;
  
  -- Return combined diagnostics
  RETURN jsonb_build_object(
    'workflow_state', COALESCE(v_state, '{}'::jsonb),
    'recent_events', COALESCE(v_recent_events, '[]'::jsonb),
    'raw_counts', v_table_counts,
    'generated_at', now()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION recompute_project_workflow_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION log_workflow_event(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workflow_diagnostics(uuid) TO authenticated;

-- Recompute state for all existing projects
DO $$
DECLARE
  proj record;
BEGIN
  FOR proj IN SELECT id FROM projects LOOP
    PERFORM recompute_project_workflow_state(proj.id);
  END LOOP;
END $$;