/*
  # Company Settings and Introduction Data RPC

  ## Overview
  1. Creates company_settings table for branding/company information
  2. Creates RPC function to aggregate data for dynamic introduction generation
  3. Seeds default company settings

  ## New Tables
  - `company_settings`
    - `id` (uuid, primary key)
    - `company_name` (text) - Company name for reports
    - `company_logo_url` (text) - Optional logo URL
    - `address` (text) - Company address
    - `phone` (text) - Contact phone
    - `email` (text) - Contact email
    - `website` (text) - Company website
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## RPC Function
  - `get_introduction_data(project_id)` - Aggregates all data for introduction generation

  ## Security
  - Enable RLS on company_settings
  - Allow authenticated users to read settings
  - Only allow authenticated users to update settings
*/

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'P&R Consulting Limited',
  company_logo_url text,
  address text,
  phone text,
  email text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view company settings"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update company settings"
  ON company_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert company settings"
  ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Seed default company settings
INSERT INTO company_settings (company_name, email, phone)
VALUES ('P&R Consulting Limited', 'info@prconsulting.co.nz', '+64 XXX XXX')
ON CONFLICT DO NOTHING;

-- Create RPC function for introduction data aggregation
CREATE OR REPLACE FUNCTION get_introduction_data(p_project_id uuid)
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
    'company_name', cs.company_name,
    'company_logo_url', cs.company_logo_url,
    'address', cs.address,
    'phone', cs.phone,
    'email', cs.email,
    'website', cs.website
  )
  INTO company_info
  FROM company_settings cs
  ORDER BY cs.created_at DESC
  LIMIT 1;

  -- Get project information
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

  -- Get inspection date range
  SELECT jsonb_build_object(
    'min_date', MIN(pi.completed_at),
    'max_date', MAX(pi.completed_at),
    'has_failures', EXISTS(
      SELECT 1
      FROM pin_inspections pi2
      WHERE pi2.project_id = p_project_id
        AND pi2.inspection_status IN ('Failed', 'Rectification_Required')
    )
  )
  INTO inspection_dates
  FROM pin_inspections pi
  WHERE pi.project_id = p_project_id
    AND pi.completed_at IS NOT NULL;

  -- Get scope data (material types and application categories)
  SELECT jsonb_build_object(
    'has_intumescent', EXISTS(
      SELECT 1
      FROM inspection_packages ip
      LEFT JOIN materials m ON m.id = ip.material_id
      WHERE ip.project_id = p_project_id
        AND (
          m.material_type ILIKE '%intumescent%'
          OR m.material_type ILIKE '%thin film%'
        )
    ),
    'has_cementitious', EXISTS(
      SELECT 1
      FROM inspection_packages ip
      LEFT JOIN materials m ON m.id = ip.material_id
      WHERE ip.project_id = p_project_id
        AND m.material_type ILIKE '%cementitious%'
    ),
    'has_board', EXISTS(
      SELECT 1
      FROM inspection_packages ip
      LEFT JOIN materials m ON m.id = ip.material_id
      WHERE ip.project_id = p_project_id
        AND (
          m.material_type ILIKE '%board%'
          OR m.material_type ILIKE '%panel%'
        )
    ),
    'application_categories', (
      SELECT jsonb_agg(DISTINCT ip.application_category)
      FROM inspection_packages ip
      WHERE ip.project_id = p_project_id
        AND ip.application_category IS NOT NULL
        AND ip.application_category != ''
    ),
    'fire_scenarios', (
      SELECT jsonb_agg(DISTINCT ip.fire_scenario)
      FROM inspection_packages ip
      WHERE ip.project_id = p_project_id
        AND ip.fire_scenario IS NOT NULL
        AND ip.fire_scenario != ''
    ),
    'material_types', (
      SELECT jsonb_agg(DISTINCT m.material_type)
      FROM inspection_packages ip
      LEFT JOIN materials m ON m.id = ip.material_id
      WHERE ip.project_id = p_project_id
        AND m.material_type IS NOT NULL
    )
  )
  INTO scope_data;

  -- Get blocks and levels
  SELECT jsonb_build_object(
    'blocks', jsonb_agg(DISTINCT jsonb_build_object(
      'id', b.id,
      'name', b.name
    )),
    'levels', jsonb_agg(DISTINCT jsonb_build_object(
      'id', l.id,
      'name', l.name
    ))
  )
  INTO blocks_levels_list
  FROM pin_inspections pi
  LEFT JOIN drawing_pins dp ON dp.id = pi.pin_id
  LEFT JOIN blocks b ON b.id = dp.block_id
  LEFT JOIN levels l ON l.id = dp.level_id
  WHERE pi.project_id = p_project_id
    AND (b.id IS NOT NULL OR l.id IS NOT NULL);

  -- Build final result
  result := jsonb_build_object(
    'company', COALESCE(company_info, '{"company_name": "P&R Consulting Limited"}'::jsonb),
    'project', project_info,
    'client', client_info,
    'scope', scope_data,
    'inspection_dates', inspection_dates,
    'blocks_levels', blocks_levels_list
  );

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_introduction_data(uuid) TO authenticated;