/*
  # Create Approve and Create Members RPC Function
  
  1. Function
    - `approve_loading_and_create_members(project_id, import_id)` 
    - Transactional member creation from loading schedule
    - Deduplication on member_mark
    - Returns detailed results
    
  2. Features
    - Validates staging items exist
    - Creates or updates members
    - Logs workflow event
    - Returns comprehensive statistics
    
  3. Error Handling
    - Validates required fields
    - Handles duplicates gracefully
    - Returns detailed error information
*/

CREATE OR REPLACE FUNCTION approve_loading_and_create_members(
  p_project_id uuid,
  p_import_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_count int := 0;
  v_updated_count int := 0;
  v_skipped_count int := 0;
  v_error_count int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_item record;
  v_member_id uuid;
  v_existing_member_id uuid;
BEGIN
  -- Validate that items exist
  IF NOT EXISTS (
    SELECT 1 FROM loading_schedule_items
    WHERE project_id = p_project_id
      AND (p_import_id IS NULL OR import_id = p_import_id)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No loading schedule items found for this project',
      'created_members', 0,
      'updated_members', 0,
      'skipped_members', 0,
      'errors', '[]'::jsonb
    );
  END IF;
  
  -- Process each loading schedule item
  FOR v_item IN 
    SELECT *
    FROM loading_schedule_items
    WHERE project_id = p_project_id
      AND (p_import_id IS NULL OR import_id = p_import_id)
    ORDER BY created_at
  LOOP
    BEGIN
      -- Validate required fields
      IF v_item.section_size_normalized IS NULL OR v_item.section_size_normalized = '' THEN
        v_error_count := v_error_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'item_id', v_item.id,
          'member_mark', v_item.member_mark,
          'error', 'Missing section size'
        );
        CONTINUE;
      END IF;
      
      -- Check if member already exists (by member_mark if provided, or section+level+block)
      v_existing_member_id := NULL;
      
      IF v_item.member_mark IS NOT NULL AND v_item.member_mark != '' THEN
        SELECT id INTO v_existing_member_id
        FROM members
        WHERE project_id = p_project_id
          AND LOWER(TRIM(member_mark)) = LOWER(TRIM(v_item.member_mark))
        LIMIT 1;
      END IF;
      
      -- If member exists, update it
      IF v_existing_member_id IS NOT NULL THEN
        UPDATE members SET
          section = v_item.section_size_normalized,
          frr_minutes = COALESCE(v_item.frr_minutes, frr_minutes),
          coating_system = COALESCE(v_item.coating_product, coating_system),
          required_dft_microns = COALESCE(v_item.dft_required_microns, required_dft_microns),
          element_type = COALESCE(v_item.element_type, element_type),
          updated_at = now()
        WHERE id = v_existing_member_id;
        
        v_updated_count := v_updated_count + 1;
      ELSE
        -- Create new member
        INSERT INTO members (
          project_id,
          member_mark,
          section,
          element_type,
          frr_minutes,
          coating_system,
          required_dft_microns,
          status,
          notes
        ) VALUES (
          p_project_id,
          COALESCE(v_item.member_mark, 'AUTO-' || substring(v_item.id::text, 1, 8)),
          v_item.section_size_normalized,
          COALESCE(v_item.element_type, 'beam'),
          COALESCE(v_item.frr_minutes, 0),
          COALESCE(v_item.coating_product, 'Unknown'),
          v_item.dft_required_microns,
          'not_started',
          'Auto-imported from loading schedule on ' || to_char(now(), 'YYYY-MM-DD HH24:MI')
        )
        RETURNING id INTO v_member_id;
        
        v_created_count := v_created_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'item_id', v_item.id,
        'member_mark', v_item.member_mark,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  -- Log workflow event
  PERFORM log_workflow_event(
    p_project_id,
    'MEMBERS_CREATED',
    jsonb_build_object(
      'created', v_created_count,
      'updated', v_updated_count,
      'skipped', v_skipped_count,
      'errors', v_error_count,
      'import_id', p_import_id
    )
  );
  
  -- Recompute workflow state
  PERFORM recompute_project_workflow_state(p_project_id);
  
  -- Return results
  RETURN jsonb_build_object(
    'success', true,
    'created_members', v_created_count,
    'updated_members', v_updated_count,
    'skipped_members', v_skipped_count,
    'error_count', v_error_count,
    'errors', v_errors,
    'total_processed', v_created_count + v_updated_count + v_skipped_count + v_error_count
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION approve_loading_and_create_members(uuid, uuid) TO authenticated;