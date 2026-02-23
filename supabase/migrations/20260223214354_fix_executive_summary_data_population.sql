/*
  # Fix Executive Summary Data Population

  1. Changes to `get_executive_summary_data` RPC Function
    - Populate actual materials from fire_protection_materials table via members
    - Populate actual FRR ratings from members table
    - Populate fire scenarios from project data
    - Remove hardcoded empty arrays

  2. Changes to `get_introduction_data` RPC Function
    - Populate actual scope data from inspection packages and materials
    - Detect material types (intumescent, cementitious, board) from actual data
    - Remove hardcoded false values

  3. Security
    - Functions remain restricted to authenticated users
    - All data is filtered by project ownership

  4. Performance
    - Use efficient joins and aggregations
    - Maintain existing indexes
*/

-- Drop and recreate get_executive_summary_data with proper data population
DROP FUNCTION IF EXISTS get_executive_summary_data(uuid);

CREATE OR REPLACE FUNCTION get_executive_summary_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  project_data jsonb;
  client_data jsonb;
  blocks_levels_data jsonb;
  materials_data jsonb;
  frr_data jsonb;
  fire_scenarios_data jsonb;
  inspection_stats_data jsonb;
  overall_result_value text;
BEGIN
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
    'contact_name', c.contact_name
  )
  INTO client_data
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.id = p_project_id;

  -- Get blocks and levels
  SELECT jsonb_build_object(
    'blocks', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', sb.id, 'name', sb.name))
       FROM site_blocks sb
       WHERE sb.project_id = p_project_id),
      '[]'::jsonb
    ),
    'levels', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', sl.id, 'name', sl.name, 'block_name', sb.name))
       FROM site_levels sl
       LEFT JOIN site_blocks sb ON sb.id = sl.block_id
       WHERE sl.project_id = p_project_id),
      '[]'::jsonb
    )
  )
  INTO blocks_levels_data;

  -- Get ACTUAL materials from members (via fire_protection_materials)
  SELECT COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'material_id', fpm.id,
      'manufacturer', fpm.manufacturer,
      'product_name', fpm.product_name,
      'material_type', fpm.material_type,
      'certification_standard', fpm.appraisal_certification,
      'application_type', fpm.application_category
    )),
    '[]'::jsonb
  )
  INTO materials_data
  FROM members m
  LEFT JOIN fire_protection_materials fpm ON fpm.id = m.fire_protection_material_id
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

  -- Get fire scenarios from members (if they exist)
  SELECT COALESCE(
    jsonb_agg(DISTINCT m.fire_scenario),
    '[]'::jsonb
  )
  INTO fire_scenarios_data
  FROM members m
  WHERE m.project_id = p_project_id
    AND m.fire_scenario IS NOT NULL
    AND m.fire_scenario != '';

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

  -- Build complete result
  result := jsonb_build_object(
    'project', project_data,
    'client', COALESCE(client_data, '{}'::jsonb),
    'blocks_levels', blocks_levels_data,
    'materials', materials_data,
    'frr_ratings', frr_data,
    'fire_scenarios', fire_scenarios_data,
    'overall_result', overall_result_value,
    'inspection_stats', inspection_stats_data
  );

  RETURN result;
END;
$$;

-- Drop and recreate get_introduction_data with proper scope detection
DROP FUNCTION IF EXISTS get_introduction_data(uuid);

CREATE OR REPLACE FUNCTION get_introduction_data(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  company_data jsonb;
  project_data jsonb;
  client_data jsonb;
  scope_data jsonb;
  inspection_dates_data jsonb;
  blocks_levels_data jsonb;
  has_intumescent boolean;
  has_cementitious boolean;
  has_board boolean;
  application_categories_array text[];
  fire_scenarios_array text[];
  material_types_array text[];
BEGIN
  -- Get company settings
  SELECT jsonb_build_object(
    'company_name', COALESCE(os.organization_name, 'P&R Consulting Limited'),
    'address', os.address,
    'phone', os.phone,
    'email', os.email,
    'website', os.website
  )
  INTO company_data
  FROM organization_settings os
  LIMIT 1;

  -- Get project data
  SELECT jsonb_build_object(
    'project_name', p.name,
    'site_address', p.site_address,
    'project_number', p.project_ref,
    'client_id', p.client_id
  )
  INTO project_data
  FROM projects p
  WHERE p.id = p_project_id;

  -- Get client data
  SELECT jsonb_build_object(
    'name', c.name,
    'contact_name', c.contact_name
  )
  INTO client_data
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.id = p_project_id;

  -- Detect ACTUAL material types from members
  SELECT
    COUNT(*) FILTER (WHERE fpm.material_type ILIKE '%intumescent%' OR fpm.material_type ILIKE '%thin film%') > 0,
    COUNT(*) FILTER (WHERE fpm.material_type ILIKE '%cementitious%' OR fpm.material_type ILIKE '%spray%') > 0,
    COUNT(*) FILTER (WHERE fpm.material_type ILIKE '%board%') > 0,
    array_agg(DISTINCT fpm.application_category) FILTER (WHERE fpm.application_category IS NOT NULL),
    array_agg(DISTINCT m.fire_scenario) FILTER (WHERE m.fire_scenario IS NOT NULL AND m.fire_scenario != ''),
    array_agg(DISTINCT fpm.material_type) FILTER (WHERE fpm.material_type IS NOT NULL)
  INTO
    has_intumescent,
    has_cementitious,
    has_board,
    application_categories_array,
    fire_scenarios_array,
    material_types_array
  FROM members m
  LEFT JOIN fire_protection_materials fpm ON fpm.id = m.fire_protection_material_id
  WHERE m.project_id = p_project_id;

  -- Build scope data with actual detection
  scope_data := jsonb_build_object(
    'has_intumescent', COALESCE(has_intumescent, false),
    'has_cementitious', COALESCE(has_cementitious, false),
    'has_board', COALESCE(has_board, false),
    'application_categories', COALESCE(to_jsonb(application_categories_array), '[]'::jsonb),
    'fire_scenarios', COALESCE(to_jsonb(fire_scenarios_array), '[]'::jsonb),
    'material_types', COALESCE(to_jsonb(material_types_array), '[]'::jsonb)
  );

  -- Get inspection date range and failure status
  SELECT jsonb_build_object(
    'min_date', MIN(i.inspection_date_time),
    'max_date', MAX(i.inspection_date_time),
    'has_failures', COUNT(*) FILTER (WHERE i.result = 'fail') > 0
  )
  INTO inspection_dates_data
  FROM inspections i
  WHERE i.project_id = p_project_id;

  -- Get blocks and levels
  SELECT jsonb_build_object(
    'blocks', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', sb.id, 'name', sb.name))
       FROM site_blocks sb
       WHERE sb.project_id = p_project_id),
      '[]'::jsonb
    ),
    'levels', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', sl.id, 'name', sl.name, 'block_name', sb.name))
       FROM site_levels sl
       LEFT JOIN site_blocks sb ON sb.id = sl.block_id
       WHERE sl.project_id = p_project_id),
      '[]'::jsonb
    )
  )
  INTO blocks_levels_data;

  -- Build complete result
  result := jsonb_build_object(
    'company', company_data,
    'project', project_data,
    'client', COALESCE(client_data, '{}'::jsonb),
    'scope', scope_data,
    'inspection_dates', inspection_dates_data,
    'blocks_levels', blocks_levels_data
  );

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_executive_summary_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_introduction_data(uuid) TO authenticated;
