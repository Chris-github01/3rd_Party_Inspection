/*
  # Fix get_project_members_for_dropdown RPC Function

  1. Changes
    - Drop the broken function that references non-existent columns
    - Recreate the correct function that uses actual schema columns
    - Function properly joins with loading_schedule_items for complete data

  2. Security
    - Uses SECURITY DEFINER for proper access control
    - Returns comprehensive member data for dropdown display
*/

-- Drop the broken function
DROP FUNCTION IF EXISTS get_project_members_for_dropdown(uuid) CASCADE;

-- Recreate the correct function with proper column names
CREATE OR REPLACE FUNCTION get_project_members_for_dropdown(p_project_id uuid)
RETURNS TABLE (
  member_id uuid,
  member_mark text,
  section_size text,
  frr_format text,
  coating_product text,
  dft_required_microns int,
  loading_schedule_ref text,
  element_type text,
  source text
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id as member_id,
    m.member_mark,
    COALESCE(m.section_size, lsi.section_size_normalized, m.section) as section_size,
    COALESCE(
      m.override_json->>'frr_format',
      m.frr_format,
      lsi.frr_format,
      CASE 
        WHEN m.frr_minutes > 0 THEN m.frr_minutes::text || '/-/-'
        ELSE NULL
      END
    ) as frr_format,
    COALESCE(
      m.override_json->>'coating_product',
      m.coating_system,
      lsi.coating_product
    ) as coating_product,
    COALESCE(
      (m.override_json->>'dft_required_microns')::int,
      m.required_dft_microns,
      lsi.dft_required_microns
    ) as dft_required_microns,
    lsi.loading_schedule_ref,
    COALESCE(m.element_type, lsi.element_type) as element_type,
    COALESCE(m.source, 'manual'::text) as source
  FROM members m
  LEFT JOIN loading_schedule_items lsi ON lsi.id = m.loading_schedule_item_id
  WHERE m.project_id = p_project_id
  ORDER BY 
    COALESCE(m.member_mark, '') NULLS LAST,
    COALESCE(m.section_size, lsi.section_size_normalized, m.section, '') NULLS LAST;
$$;