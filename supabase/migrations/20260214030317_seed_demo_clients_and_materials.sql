/*
  # Seed Demo Data for Clients and Materials
  
  ## Overview
  Adds demonstration data to showcase the new features:
  - 2 sample clients
  - 4 sample materials from different manufacturers
  - Links existing demo project to a client
  
  ## Data Added
  
  ### Clients
  1. Fletcher Construction - Main contractor client
  2. Hawkins NZ - Property management client
  
  ### Materials
  1. Nullifire S605 - Intumescent coating
  2. Carboline Nullifire - Intumescent topcoat
  3. Jotun Jotamastic - Primer
  4. Promat CAFCO - Cementitious spray
  
  ## Notes
  - Uses safe INSERT with ON CONFLICT to avoid duplicate data
  - Links demo project if it exists
*/

-- Insert demo clients
INSERT INTO clients (id, client_name, main_contractor, contact_name, contact_email, contact_phone, billing_notes)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'Fletcher Construction',
    'Fletcher Building Limited',
    'Sarah Johnson',
    'sarah.johnson@fclnz.co.nz',
    '+64 9 525 9000',
    'Net 30 days. PO required for all invoices.'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Hawkins NZ',
    NULL,
    'Michael Chen',
    'michael.chen@hawkins.co.nz',
    '+64 9 307 9200',
    'Net 45 days. Monthly billing cycle.'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert demo materials
INSERT INTO material_library (id, manufacturer, product_name, type, limits_json, notes)
VALUES 
  (
    '33333333-3333-3333-3333-333333333333',
    'Nullifire',
    'S605 Water-based Intumescent',
    'intumescent',
    '{
      "min_temp_c": 5,
      "max_temp_c": 35,
      "max_rh_pct": 85,
      "dew_point_spread_min_c": 3
    }'::jsonb,
    'Water-based intumescent coating for structural steel. Provides up to 120 minutes fire protection. Apply in multiple coats to achieve required DFT.'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Carboline',
    'Nullifire FX5210',
    'topcoat',
    '{
      "min_temp_c": 10,
      "max_temp_c": 30,
      "max_rh_pct": 80,
      "dew_point_spread_min_c": 3
    }'::jsonb,
    'High-performance topcoat for intumescent systems. Provides aesthetic finish and UV protection.'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Jotun',
    'Jotamastic 87 GF',
    'primer',
    '{
      "min_temp_c": 5,
      "max_temp_c": 40,
      "max_rh_pct": 85,
      "dew_point_spread_min_c": 3
    }'::jsonb,
    'Solvent-free epoxy primer. Excellent adhesion to blast-cleaned steel. Surface preparation to ISO 8501-1 Sa 2.5 required.'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'Promat',
    'CAFCO 300',
    'cementitious',
    '{
      "min_temp_c": 5,
      "max_temp_c": 35,
      "max_rh_pct": 90,
      "dew_point_spread_min_c": 2
    }'::jsonb,
    'Spray-applied cementitious fireproofing. Provides up to 4 hours fire rating. Applied thickness measured with pin system.'
  )
ON CONFLICT (id) DO NOTHING;

-- Link demo project to first client (if demo project exists)
UPDATE projects 
SET client_id = '11111111-1111-1111-1111-111111111111'
WHERE name = 'Alfriston Commercial Tower' 
  AND client_id IS NULL;
