/*
  # Client Logos Management System

  1. New Tables
    - `client_logos`
      - `id` (uuid, primary key)
      - `name` (text) - Client name
      - `logo_url` (text) - Path to logo image
      - `display_order` (integer) - Order in which logos appear
      - `active` (boolean) - Whether to display this logo
      - `preserve_colors` (boolean) - If true, show original colors; if false, apply white filter
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `client_logos` table
    - Add policy for public read access (website display)
    - Add policy for authenticated users to manage logos

  3. Initial Data
    - Seed with existing client logos
*/

CREATE TABLE IF NOT EXISTS client_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  preserve_colors boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_logos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view active logos (for public website)
CREATE POLICY "Anyone can view active logos"
  ON client_logos
  FOR SELECT
  USING (active = true);

-- Allow authenticated users to view all logos
CREATE POLICY "Authenticated users can view all logos"
  ON client_logos
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to manage logos
CREATE POLICY "Authenticated users can insert logos"
  ON client_logos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update logos"
  ON client_logos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete logos"
  ON client_logos
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_client_logos_display_order ON client_logos(display_order);
CREATE INDEX IF NOT EXISTS idx_client_logos_active ON client_logos(active);

-- Seed initial logos
INSERT INTO client_logos (name, logo_url, display_order, active, preserve_colors) VALUES
  ('LT McGuinness', '/images/clients/LT-McGuinness-Logo-Colour-with-black.png', 1, true, false),
  ('Kalmar', '/images/clients/Kalmar-Logo@2x.png', 2, true, false),
  ('Naylor Love', '/images/clients/naylor-love-logo.png', 3, true, false),
  ('Watts & Hughes', '/images/clients/wh.png', 4, true, false),
  ('Cook Brothers Construction', '/images/clients/CookBrothersConstructionBlockLogo_CMYK.jpg', 5, true, false),
  ('Hawkins', '/images/clients/hawk.png', 6, true, true),
  ('Cassidy Construction', '/images/clients/cass.png', 7, true, true)
ON CONFLICT DO NOTHING;
