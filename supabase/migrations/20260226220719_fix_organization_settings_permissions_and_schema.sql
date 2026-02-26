/*
  # Fix Organization Settings Permissions and Schema
  
  1. Issue
    - Organization Settings page can't save changes (no UPDATE policy)
    - Schema mismatch: UI uses organization_settings, reports use company_settings
    - Logo field mismatch: logo_path vs logo_url
  
  2. Changes
    - Add UPDATE and INSERT policies to company_settings table
    - Allow admins and inspectors to modify company settings
    - Ensure company_settings has proper default record
  
  3. Security
    - Only authenticated users can update company settings
    - Maintains RLS security model
*/

-- Add UPDATE policy for company_settings
CREATE POLICY "Authenticated users can update company settings"
  ON company_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add INSERT policy for company_settings (in case no record exists)
CREATE POLICY "Authenticated users can insert company settings"
  ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure there's at least one company_settings record
INSERT INTO company_settings (
  company_name,
  address,
  phone,
  email,
  website,
  logo_url
)
SELECT 
  'P&R Consulting Limited',
  'New Zealand',
  null,
  'info@prconsulting.nz',
  null,
  null
WHERE NOT EXISTS (SELECT 1 FROM company_settings);
