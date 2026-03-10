/*
  # Create Pin Export Selection Function

  1. Purpose
    - Fetch all pins from a project with photo counts
    - Used for "Inspection Report with Photos" export selection UI
    - Shows pin number, member details, status, and photo count

  2. Function
    - `get_pins_for_photo_export_selection(p_project_id uuid)`
    - Returns pins ordered by pin_number
    - Includes member details and photo counts
    - Filters by project_id

  3. Return Data
    - Pin identification (id, pin_number, label)
    - Member details (member_mark, section, steel_type)
    - Status and coordinates
    - Photo count per pin
*/

CREATE OR REPLACE FUNCTION get_pins_for_photo_export_selection(p_project_id uuid)
RETURNS TABLE (
  pin_id uuid,
  pin_number text,
  label text,
  status text,
  steel_type text,
  member_id uuid,
  member_mark text,
  section_size text,
  element_type text,
  frr_format text,
  coating_product text,
  dft_required_microns int,
  photo_count bigint,
  has_photos boolean,
  x float,
  y float,
  page_number int,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
STABLE
AS $$
  SELECT
    dp.id as pin_id,
    dp.pin_number,
    dp.label,
    dp.status,
    dp.steel_type,
    dp.member_id,
    m.member_mark,
    COALESCE(m.section_size, lsi.section_size_normalized, m.section) as section_size,
    COALESCE(m.element_type, lsi.element_type) as element_type,
    COALESCE(
      m.override_json->>'frr_format',
      m.frr_format,
      lsi.frr_format,
      'Not specified'
    ) as frr_format,
    COALESCE(
      m.override_json->>'coating_product',
      m.coating_system,
      lsi.coating_product,
      ''
    ) as coating_product,
    COALESCE(
      (m.override_json->>'dft_required_microns')::int,
      m.required_dft_microns,
      lsi.dft_required_microns
    ) as dft_required_microns,
    -- Count photos for this pin
    (
      SELECT COUNT(*)
      FROM pin_photos pp
      WHERE pp.pin_id = dp.id
    ) as photo_count,
    -- Check if pin has photos
    (
      SELECT COUNT(*) > 0
      FROM pin_photos pp
      WHERE pp.pin_id = dp.id
    ) as has_photos,
    dp.x,
    dp.y,
    dp.page_number,
    dp.created_at
  FROM
    drawing_pins dp
  LEFT JOIN
    members m ON dp.member_id = m.id
  LEFT JOIN
    loading_schedule_items lsi ON m.loading_schedule_item_id = lsi.id
  WHERE
    dp.project_id = p_project_id
    AND dp.member_id IS NOT NULL
  ORDER BY
    dp.pin_number NULLS LAST,
    dp.created_at ASC;
$$;

COMMENT ON FUNCTION get_pins_for_photo_export_selection IS
'Returns all pins for a project with member details and photo counts. Used for selecting pins to include in photo export reports.';
