/*
  # NZ Steel Member Library Schema

  ## Overview
  Creates a comprehensive steel member library system for NZ/AU structural sections
  with fast typeahead search capabilities for onsite field use.

  ## New Types
  - steel_member_family enum: Classification of structural steel sections

  ## New Tables
  
  ### 1. steel_members
  Core library of steel member designations (UB, UC, PFC, RHS, SHS, CHS, etc.)
  - Includes standard NZ designations (seeded)
  - Supports custom member additions by users
  - Stores optional dimensions for reference
  
  ### 2. steel_member_aliases
  Alternative search terms for members (spacing/case variants)
  - Enables flexible search: "410UB54", "410 UB 54", "410ub54"
  
  ## RPC Functions
  - search_steel_members: Fast prefix-based typeahead search with family filtering
  
  ## Indexes
  - Prefix search optimization using text_pattern_ops
  - Family-based filtering
  - Unique constraint on designation + standard
  
  ## Security
  - All tables have RLS enabled
  - Users can read all members
  - Users can create custom members
  - Only creators can update/delete their custom members
*/

-- =====================================================
-- 1. CREATE ENUM TYPE
-- =====================================================

DO $$ BEGIN
  CREATE TYPE steel_member_family AS ENUM (
    'UB',
    'UC',
    'PFC',
    'WB',
    'RHS',
    'SHS',
    'CHS',
    'EA',
    'UA',
    'PLATE',
    'FLAT',
    'BAR',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. STEEL MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS steel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  designation text NOT NULL,
  family steel_member_family NOT NULL,
  standard text NOT NULL DEFAULT 'NZ',
  depth_mm numeric,
  width_mm numeric,
  thickness_mm numeric,
  mass_kg_per_m numeric,
  notes text,
  is_standard boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique index on normalized designation + standard
CREATE UNIQUE INDEX IF NOT EXISTS idx_steel_members_designation_standard 
  ON steel_members(lower(trim(designation)), standard);

-- Create index on family for filtering
CREATE INDEX IF NOT EXISTS idx_steel_members_family 
  ON steel_members(family);

-- Create index for prefix search optimization
CREATE INDEX IF NOT EXISTS idx_steel_members_designation_prefix 
  ON steel_members(designation text_pattern_ops);

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_steel_members_sort 
  ON steel_members(is_standard DESC, designation ASC);

ALTER TABLE steel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all steel members"
  ON steel_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create custom steel members"
  ON steel_members FOR INSERT
  TO authenticated
  WITH CHECK (is_standard = false);

CREATE POLICY "Users can update their custom steel members"
  ON steel_members FOR UPDATE
  TO authenticated
  USING (is_standard = false AND created_by = auth.uid())
  WITH CHECK (is_standard = false AND created_by = auth.uid());

CREATE POLICY "Users can delete their custom steel members"
  ON steel_members FOR DELETE
  TO authenticated
  USING (is_standard = false AND created_by = auth.uid());

-- =====================================================
-- 3. STEEL MEMBER ALIASES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS steel_member_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES steel_members(id) ON DELETE CASCADE,
  alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique index on normalized alias
CREATE UNIQUE INDEX IF NOT EXISTS idx_steel_member_aliases_alias 
  ON steel_member_aliases(lower(trim(alias)));

-- Create index on member_id for cascade lookups
CREATE INDEX IF NOT EXISTS idx_steel_member_aliases_member 
  ON steel_member_aliases(member_id);

-- Create index for prefix search
CREATE INDEX IF NOT EXISTS idx_steel_member_aliases_prefix 
  ON steel_member_aliases(alias text_pattern_ops);

ALTER TABLE steel_member_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all steel member aliases"
  ON steel_member_aliases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create aliases for their custom members"
  ON steel_member_aliases FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM steel_members 
      WHERE steel_members.id = steel_member_aliases.member_id 
      AND steel_members.created_by = auth.uid()
    )
  );

-- =====================================================
-- 4. FAST TYPEAHEAD SEARCH RPC FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION search_steel_members(
  q text DEFAULT NULL,
  fam steel_member_family DEFAULT NULL,
  lim int DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  designation text,
  family steel_member_family,
  standard text,
  is_standard boolean,
  depth_mm numeric,
  width_mm numeric,
  thickness_mm numeric,
  mass_kg_per_m numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (m.id)
    m.id,
    m.designation,
    m.family,
    m.standard,
    m.is_standard,
    m.depth_mm,
    m.width_mm,
    m.thickness_mm,
    m.mass_kg_per_m
  FROM steel_members m
  LEFT JOIN steel_member_aliases a ON a.member_id = m.id
  WHERE
    (q IS NULL OR q = '' OR 
     lower(m.designation) LIKE lower(q) || '%' OR
     lower(a.alias) LIKE lower(q) || '%')
    AND (fam IS NULL OR m.family = fam)
  ORDER BY m.id, m.is_standard DESC, m.designation ASC
  LIMIT lim;
$$;

-- =====================================================
-- 5. UPDATE DRAWING_PINS TO REFERENCE STEEL MEMBERS
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drawing_pins' AND column_name = 'steel_member_id'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN steel_member_id uuid REFERENCES steel_members(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drawing_pins' AND column_name = 'member_name'
  ) THEN
    ALTER TABLE drawing_pins ADD COLUMN member_name text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_drawing_pins_steel_member 
  ON drawing_pins(steel_member_id);

-- =====================================================
-- 6. UPDATE PIN_INSPECTIONS TO REFERENCE STEEL MEMBERS
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pin_inspections' AND column_name = 'steel_member_id'
  ) THEN
    ALTER TABLE pin_inspections ADD COLUMN steel_member_id uuid REFERENCES steel_members(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pin_inspections' AND column_name = 'member_designation_snapshot'
  ) THEN
    ALTER TABLE pin_inspections ADD COLUMN member_designation_snapshot text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pin_inspections_steel_member 
  ON pin_inspections(steel_member_id);