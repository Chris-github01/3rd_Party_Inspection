/*
  # Fix Executive Summary ORDER BY Error
  
  1. Issue
    - get_executive_summary_data() has SQL error: column "dp.pin_number" must appear in GROUP BY
    - ORDER BY dp.pin_number is outside jsonb_agg which causes error
  
  2. Fix
    - Move ORDER BY inside the jsonb_agg aggregate function
    - This is valid SQL: jsonb_agg(value ORDER BY column)
  
  3. Security
    - No security changes
*/

DROP FUNCTION IF EXISTS get_executive_summary_data(uuid);

CREATE OR REPLACE FUNCTION get_executive_summary_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  company_data jsonb;
  project_data jsonb;
  client_data jsonb;
  blocks_levels_data jsonb;
  materials_data jsonb;
  frr_data jsonb;
  fire_scenarios_data jsonb;
  inspection_stats_data jsonb;
  drawings_pins_summary jsonb;
  overall_result_value text;
BEGIN
  -- Get company settings WITH LOGO
  SELECT jsonb_build_object(
    'company_name', COALESCE(cs.company_name, 'P&R Consulting Limited'),
    'company_logo_url', cs.logo_url,
    'address', cs.address,
    'phone', cs.phone,
    'email', cs.email,
    'website', cs.website
  )
  INTO company_data
  FROM company_settings cs
  LIMIT 1;

  -- Get project and client data
  SELECT jsonb_build_object(
    'project_name', p.name,
    'site_address', p.site_address,
    'project_number', p.project_ref,
    'client_id', p.client_id
  )
  INTO project_data
  FROM projects p
  WHERE p.id = p_project_id;

  SELECT jsonb_build_object(
    'name', c.name,
    'contact_name', c.contact_person
  )
  INTO client_data
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.id = p_project_id;

  -- Get blocks and levels
  SELECT jsonb_build_object(
    'blocks', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name))
       FROM blocks b
       WHERE b.project_id = p_project_id),
      '[]'::jsonb
    ),
    'levels', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'block_name', b.name))
       FROM levels l
       LEFT JOIN blocks b ON b.id = l.block_id
       WHERE b.project_id = p_project_id),
      '[]'::jsonb
    )
  )
  INTO blocks_levels_data;

  -- Get ACTUAL materials from members
  SELECT COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'material_id', fpm.id,
      'manufacturer', fpm.manufacturer,
      'product_name', fpm.product_name,
      'material_type', fpm.material_type
    )),
    '[]'::jsonb
  )
  INTO materials_data
  FROM members m
  LEFT JOIN fire_protection_materials fpm ON fpm.id = m.coating_system::uuid
  WHERE m.project_id = p_project_id
    AND fpm.id IS NOT NULL;

  -- Get ACTUAL FRR ratings from members
  SELECT COALESCE(
    jsonb_agg(DISTINCT m.frr_minutes ORDER BY m.frr_minutes),
    '[]'::jsonb
  )
  INTO frr_data
  FROM members m
  WHERE m.project_id = p_project_id
    AND m.frr_minutes IS NOT NULL;

  -- Get fire scenarios (placeholder for now)
  fire_scenarios_data := '[]'::jsonb;

  -- Calculate inspection statistics
  SELECT jsonb_build_object(
    'total_inspections', COUNT(*),
    'completed_inspections', COUNT(*) FILTER (WHERE i.inspection_status != 'Draft'),
    'passed_inspections', COUNT(*) FILTER (WHERE i.result = 'pass'),
    'failed_inspections', COUNT(*) FILTER (WHERE i.result = 'fail'),
    'draft_inspections', COUNT(*) FILTER (WHERE i.inspection_status = 'Draft'),
    'min_date', MIN(i.inspection_date_time),
    'max_date', MAX(i.inspection_date_time)
  )
  INTO inspection_stats_data
  FROM inspections i
  WHERE i.project_id = p_project_id;

  -- Determine overall result
  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE i.result = 'fail') > 0 THEN 'Non-Compliant'
    WHEN COUNT(*) FILTER (WHERE i.result = 'pass') > 0 THEN 'Compliant'
    ELSE 'Pending'
  END
  INTO overall_result_value
  FROM inspections i
  WHERE i.project_id = p_project_id
    AND i.inspection_status != 'Draft';

  -- Get drawings and pins summary with detailed pin information
  -- FIX: Move ORDER BY inside jsonb_agg
  SELECT jsonb_build_object(
    'total_drawings', COALESCE(
      (SELECT COUNT(DISTINCT d.id)
       FROM drawings d
       LEFT JOIN levels l ON l.id = d.level_id
       LEFT JOIN blocks b ON b.id = l.block_id
       WHERE b.project_id = p_project_id),
      0
    ),
    'total_pins', COALESCE(
      (SELECT COUNT(*)
       FROM drawing_pins dp
       WHERE dp.project_id = p_project_id),
      0
    ),
    'pins_summary', COALESCE(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'pin_id', dp.id,
           'pin_number', dp.pin_number,
           'label', dp.label,
           'steel_type', dp.steel_type,
           'pin_type', dp.pin_type,
           'status', dp.status,
           'block_name', b.name,
           'level_name', l.name,
           'drawing_page', dp.page_number,
           'member_mark', m.member_mark,
           'has_photos', EXISTS(SELECT 1 FROM pin_photos pp WHERE pp.pin_id = dp.id)
         ) ORDER BY dp.pin_number
       )
       FROM drawing_pins dp
       LEFT JOIN blocks b ON b.id = dp.block_id
       LEFT JOIN levels l ON l.id = dp.level_id
       LEFT JOIN members m ON m.id = dp.member_id
       WHERE dp.project_id = p_project_id),
      '[]'::jsonb
    )
  )
  INTO drawings_pins_summary;

  -- Build complete result WITH COMPANY DATA
  result := jsonb_build_object(
    'company', company_data,
    'project', project_data,
    'client', COALESCE(client_data, '{}'::jsonb),
    'blocks_levels', blocks_levels_data,
    'materials', materials_data,
    'frr_ratings', frr_data,
    'fire_scenarios', fire_scenarios_data,
    'overall_result', overall_result_value,
    'inspection_stats', inspection_stats_data,
    'drawings_pins', drawings_pins_summary
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_executive_summary_data(uuid) TO authenticated;

COMMENT ON FUNCTION get_executive_summary_data(uuid) IS 'Returns executive summary data including company info with logo, project stats, materials, FRR ratings, inspection statistics, and detailed drawings/pins information for report generation';
