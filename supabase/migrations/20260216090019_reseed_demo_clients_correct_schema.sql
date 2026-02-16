/*
  # Re-seed Demo Clients with Correct Schema
  
  ## Overview
  Adds demonstration client data using the correct column names that match the actual database schema.
  
  ## Data Added
  
  ### Clients
  1. Fletcher Construction - Main contractor client
  2. Hawkins NZ - Property management client
  
  ## Changes
  - Uses correct column names: name, company, email, phone, address, contact_person
  - Links demo project if it exists
  
  ## Security
  - Data is safe to insert and does not expose sensitive information
*/

-- Insert demo clients with correct column names
INSERT INTO clients (id, name, company, contact_person, email, phone, address)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'Fletcher Construction',
    'Fletcher Building Limited',
    'Sarah Johnson',
    'sarah.johnson@fclnz.co.nz',
    '+64 9 525 9000',
    '810 Great South Road, Penrose, Auckland 1061'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Hawkins NZ',
    'Hawkins Construction Company Limited',
    'Michael Chen',
    'michael.chen@hawkins.co.nz',
    '+64 9 307 9200',
    '22 The Strand, Parnell, Auckland 1010'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  company = EXCLUDED.company,
  contact_person = EXCLUDED.contact_person,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address;

-- Link demo project to first client (if demo project exists)
UPDATE projects 
SET client_id = '11111111-1111-1111-1111-111111111111'
WHERE name = 'Alfriston Commercial Tower' 
  AND client_id IS NULL;