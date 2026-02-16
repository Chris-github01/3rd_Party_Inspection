/*
  # Create Introduction and Executive Summary Functions for Actual Schema

  ## Overview
  Creates RPC functions that work with the ACTUAL database schema (not the expected schema).

  ## Schema Differences
  - Uses `inspections` table (not pin_inspections)
  - No inspection_packages table exists
  - materials table has different columns
  - Works with existing members, blocks, levels, documents tables

  ## Changes
  - Create new functions that match actual schema
  - Return minimal data that exists in current database
*/

-- Drop old functions
DROP FUNCTION IF EXISTS get_introduction_data(uuid);
DROP FUNCTION IF EXISTS get_executive_summary_data(uuid);

-- Create get_introduction_data for actual schema
CREATE FUNCTION get_introduction_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
  company_info jsonb;
  project_info jsonb;
  client_info jsonb;
  scope_data jsonb;
  inspection_dates jsonb;
  blocks_levels_list jsonb;
BEGIN
  -- Get company settings
  SELECT jsonb_build_object(
    'company_name', COALESCE(cs.company_name, 'P&R Consulting Limited'),
    'company_logo_url', cs.logo_url,
    'address', cs.address,
    'phone', cs.phone,
    'email', cs.email,
    'website', cs.website
  )
  INTO company_info
  FROM company_settings cs
  ORDER BY cs.created_at DESC
  LIMIT 1;

  -- Fallback if no company_settings exist
  IF company_info IS NULL THEN
    company_info := '{"company_name": "P&R Consulting Limited"}'::jsonb;
  END IF;

  -- Get project information
  SELECT jsonb_build_object(
    'project_name', p.name,
    'site_address', COALESCE(p.site_address, 'the project site'),
    'project_number', p.project_ref,
    'client_id', p.client_id
  )
  INTO project_info
  FROM projects p
  WHERE p.id = p_project_id;

  -- Get client information with NULL safety
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'name', c.name,
      'contact_name', c.contact_person
    )
    FROM clients c
    WHERE c.id = (project_info->>'client_id')::uuid
    LIMIT 1),
    jsonb_build_object(
      'name', COALESCE((SELECT p.client_name FROM projects p WHERE p.id = p_project_id), 'Unknown Client'),
      'contact_name', NULL
    )
  )
  INTO client_info;

  -- Get inspection date range from inspections table
  SELECT jsonb_build_object(
    'min_date', MIN(i.inspection_date),
    'max_date', MAX(i.inspection_date),
    'has_failures', EXISTS(
      SELECT 1
      FROM inspections i2
      WHERE i2.project_id = p_project_id
        AND i2.result = 'fail'
    )
  )
  INTO inspection_dates
  FROM inspections i
  WHERE i.project_id = p_project_id
    AND i.inspection_date IS NOT NULL;

  -- Default if no inspections
  IF inspection_dates IS NULL THEN
    inspection_dates := '{"min_date": null, "max_date": null, "has_failures": false}'::jsonb;
  END IF;

  -- Get scope data (simplified - no inspection_packages table exists)
  scope_data := '{
    "has_intumescent": false,
    "has_cementitious": false,
    "has_board": false,
    "application_categories": [],
    "fire_scenarios": [],
    "material_types": []
  }'::jsonb;

  -- Get blocks and levels
  SELECT jsonb_build_object(
    'blocks', COALESCE(
      (SELECT jsonb_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name))
       FROM blocks b
       WHERE b.project_id = p_project_id),
      '[]'::jsonb
    ),
    'levels', COALESCE(
      (SELECT jsonb_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name))
       FROM levels l
       JOIN blocks b ON l.block_id = b.id
       WHERE b.project_id = p_project_id),
      '[]'::jsonb
    )
  )
  INTO blocks_levels_list;

  -- Build final result
  result := jsonb_build_object(
    'company', company_info,
    'project', project_info,
    'client', client_info,
    'scope', scope_data,
    'inspection_dates', inspection_dates,
    'blocks_levels', blocks_levels_list
  );

  RETURN result;
END;
$$;

-- Create get_executive_summary_data for actual schema
CREATE FUNCTION get_executive_summary_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
  project_info jsonb;
  client_info jsonb;
  blocks_levels jsonb;
  inspection_stats jsonb;
  overall_result text;
  has_failed boolean;
BEGIN
  -- Get project information
  SELECT jsonb_build_object(
    'project_name', p.name,
    'site_address', COALESCE(p.site_address, 'the project site'),
    'project_number', p.project_ref,
    'client_id', p.client_id
  )
  INTO project_info
  FROM projects p
  WHERE p.id = p_project_id;

  -- Get client information with NULL safety
  SELECT COALESCE(
    (SELECT jsonb_build_object(
      'name', c.name,
      'contact_name', c.contact_person
    )
    FROM clients c
    WHERE c.id = (project_info->>'client_id')::uuid
    LIMIT 1),
    jsonb_build_object(
      'name', COALESCE((SELECT p.client_name FROM projects p WHERE p.id = p_project_id), 'Unknown Client'),
      'contact_name', NULL
    )
  )
  INTO client_info;

  -- Get blocks and levels
  SELECT jsonb_build_object(
    'blocks', COALESCE(
      (SELECT jsonb_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name))
       FROM blocks b
       WHERE b.project_id = p_project_id),
      '[]'::jsonb
    ),
    'levels', COALESCE(
      (SELECT jsonb_agg(DISTINCT jsonb_build_object('id', l.id, 'name', l.name))
       FROM levels l
       JOIN blocks b ON l.block_id = b.id
       WHERE b.project_id = p_project_id),
      '[]'::jsonb
    )
  )
  INTO blocks_levels;

  -- Check for failures
  SELECT EXISTS(
    SELECT 1
    FROM inspections i
    WHERE i.project_id = p_project_id
      AND i.result = 'fail'
  )
  INTO has_failed;

  -- Determine result
  IF has_failed THEN
    overall_result := 'Non-Compliant';
  ELSE
    overall_result := 'Compliant';
  END IF;

  -- Get statistics from inspections table
  SELECT jsonb_build_object(
    'total_inspections', COUNT(*),
    'completed_inspections', COUNT(*) FILTER (WHERE i.result IS NOT NULL),
    'passed_inspections', COUNT(*) FILTER (WHERE i.result = 'pass'),
    'failed_inspections', COUNT(*) FILTER (WHERE i.result = 'fail'),
    'draft_inspections', COUNT(*) FILTER (WHERE i.result IS NULL),
    'min_date', MIN(i.inspection_date),
    'max_date', MAX(i.inspection_date)
  )
  INTO inspection_stats
  FROM inspections i
  WHERE i.project_id = p_project_id;

  -- Default if no inspections
  IF inspection_stats IS NULL THEN
    inspection_stats := '{
      "total_inspections": 0,
      "completed_inspections": 0,
      "passed_inspections": 0,
      "failed_inspections": 0,
      "draft_inspections": 0,
      "min_date": null,
      "max_date": null
    }'::jsonb;
  END IF;

  -- Build result (simplified - no materials or FRR data available in current schema)
  result := jsonb_build_object(
    'project', project_info,
    'client', client_info,
    'blocks_levels', blocks_levels,
    'materials', '[]'::jsonb,
    'frr_ratings', '[]'::jsonb,
    'fire_scenarios', '[]'::jsonb,
    'overall_result', overall_result,
    'inspection_stats', inspection_stats
  );

  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_introduction_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_executive_summary_data(uuid) TO authenticated;