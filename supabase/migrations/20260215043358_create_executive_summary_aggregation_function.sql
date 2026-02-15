/*
  # Executive Summary Aggregation RPC Function

  ## Overview
  Creates an RPC function to efficiently aggregate all data required for
  generating dynamic executive summaries for inspection reports.

  ## Function Purpose
  Pulls and aggregates data from:
  - Project details (name, address, client)
  - Block/Level information
  - Inspection packages (materials, FRR, fire scenarios)
  - Inspection results (status, dates)
  - Materials (manufacturer, product details)

  ## Returns
  JSON object containing:
  - Project information
  - Client information
  - Blocks and levels inspected
  - Materials list with details
  - FRR ratings list
  - Fire scenarios
  - Overall compliance result
  - Inspection date range
  - Statistics
*/

CREATE OR REPLACE FUNCTION get_executive_summary_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
  project_info jsonb;
  client_info jsonb;
  blocks_levels jsonb;
  materials_list jsonb;
  frr_list jsonb;
  fire_scenarios jsonb;
  inspection_stats jsonb;
  overall_result text;
  has_failed boolean;
BEGIN
  -- Get project and client information
  SELECT jsonb_build_object(
    'project_name', p.project_name,
    'site_address', p.site_address,
    'project_number', p.project_number,
    'client_id', p.client_id
  )
  INTO project_info
  FROM projects p
  WHERE p.id = p_project_id;

  -- Get client information
  SELECT jsonb_build_object(
    'client_name', c.client_name,
    'contact_name', c.contact_name
  )
  INTO client_info
  FROM clients c
  WHERE c.id = (project_info->>'client_id')::uuid;

  -- Get unique blocks and levels inspected
  SELECT jsonb_build_object(
    'blocks', jsonb_agg(DISTINCT jsonb_build_object(
      'id', b.id,
      'name', b.name
    )),
    'levels', jsonb_agg(DISTINCT jsonb_build_object(
      'id', l.id,
      'name', l.name,
      'block_name', b.name
    ))
  )
  INTO blocks_levels
  FROM pin_inspections pi
  LEFT JOIN drawing_pins dp ON dp.id = pi.pin_id
  LEFT JOIN blocks b ON b.id = dp.block_id
  LEFT JOIN levels l ON l.id = dp.level_id
  WHERE pi.project_id = p_project_id
    AND (b.id IS NOT NULL OR l.id IS NOT NULL);

  -- Get unique materials with full details
  SELECT jsonb_agg(DISTINCT jsonb_build_object(
    'material_id', m.id,
    'manufacturer', m.manufacturer,
    'product_name', m.product_name,
    'material_type', m.material_type,
    'certification_standard', m.certification_standard,
    'application_type', m.application_type
  ))
  INTO materials_list
  FROM inspection_packages ip
  LEFT JOIN materials m ON m.id = ip.material_id
  WHERE ip.project_id = p_project_id
    AND m.id IS NOT NULL;

  -- Get unique FRR ratings
  SELECT jsonb_agg(DISTINCT ip.frr_minutes ORDER BY ip.frr_minutes)
  INTO frr_list
  FROM inspection_packages ip
  WHERE ip.project_id = p_project_id
    AND ip.frr_minutes IS NOT NULL;

  -- Get unique fire scenarios
  SELECT jsonb_agg(DISTINCT ip.fire_scenario)
  INTO fire_scenarios
  FROM inspection_packages ip
  WHERE ip.project_id = p_project_id
    AND ip.fire_scenario IS NOT NULL
    AND ip.fire_scenario != '';

  -- Check if any inspections have failed
  SELECT EXISTS(
    SELECT 1
    FROM pin_inspections pi
    WHERE pi.project_id = p_project_id
      AND pi.inspection_status IN ('Failed', 'Rectification_Required')
  )
  INTO has_failed;

  -- Determine overall result
  IF has_failed THEN
    overall_result := 'Non-Compliant';
  ELSE
    overall_result := 'Compliant';
  END IF;

  -- Get inspection statistics
  SELECT jsonb_build_object(
    'total_inspections', COUNT(*),
    'completed_inspections', COUNT(*) FILTER (WHERE pi.inspection_status = 'Completed'),
    'passed_inspections', COUNT(*) FILTER (WHERE pi.inspection_status = 'Completed'),
    'failed_inspections', COUNT(*) FILTER (WHERE pi.inspection_status IN ('Failed', 'Rectification_Required')),
    'draft_inspections', COUNT(*) FILTER (WHERE pi.inspection_status = 'Draft'),
    'min_date', MIN(pi.completed_at),
    'max_date', MAX(pi.completed_at)
  )
  INTO inspection_stats
  FROM pin_inspections pi
  WHERE pi.project_id = p_project_id;

  -- Build final result
  result := jsonb_build_object(
    'project', project_info,
    'client', client_info,
    'blocks_levels', blocks_levels,
    'materials', COALESCE(materials_list, '[]'::jsonb),
    'frr_ratings', COALESCE(frr_list, '[]'::jsonb),
    'fire_scenarios', COALESCE(fire_scenarios, '[]'::jsonb),
    'overall_result', overall_result,
    'inspection_stats', inspection_stats
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_executive_summary_data(uuid) TO authenticated;