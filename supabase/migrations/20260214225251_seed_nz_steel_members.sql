/*
  # Seed NZ Steel Member Designations

  ## Overview
  Seeds the steel_members library with common NZ/AU structural section designations
  based on standard steel section tables and NZ industry practice.

  ## Data Sources
  - Universal Beams (UB) - Common NZ/AU series
  - Universal Columns (UC) - Common NZ/AU series
  - Parallel Flange Channels (PFC) - Standard depths
  - Welded Beams (WB) - Common depth series
  - Hollow Sections (RHS/SHS/CHS) - Placeholder patterns

  ## Seeding Strategy
  - Insert only if not exists (idempotent)
  - Create aliases for spacing/case variants
  - Mark all as is_standard = true
*/

-- =====================================================
-- HELPER FUNCTION: INSERT MEMBER WITH ALIASES
-- =====================================================

DO $$
DECLARE
  member_record RECORD;
  member_uuid uuid;
  base_designation text;
  spaced_alias text;
BEGIN

-- =====================================================
-- UNIVERSAL BEAMS (UB)
-- =====================================================

FOR base_designation IN
  SELECT unnest(ARRAY[
    '150UB14', '150UB18',
    '180UB18', '180UB22',
    '200UB18', '200UB22', '200UB25',
    '250UB25', '250UB31', '250UB37',
    '310UB32', '310UB40', '310UB46',
    '360UB44', '360UB51', '360UB57',
    '410UB54', '410UB59', '410UB65',
    '460UB67', '460UB74', '460UB82',
    '530UB82', '530UB92', '530UB101',
    '610UB101', '610UB113', '610UB125',
    '690UB125', '690UB140'
  ])
LOOP
  -- Insert member if not exists
  INSERT INTO steel_members (designation, family, standard, is_standard)
  VALUES (base_designation, 'UB', 'NZ', true)
  ON CONFLICT (lower(trim(designation)), standard) DO NOTHING
  RETURNING id INTO member_uuid;
  
  -- If member was inserted, add aliases
  IF member_uuid IS NOT NULL THEN
    -- Spaced variant: "410UB54" -> "410 UB 54"
    spaced_alias := regexp_replace(base_designation, '([0-9]+)(UB)([0-9]+)', '\1 \2 \3');
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, spaced_alias)
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
    
    -- Lowercase variant
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, lower(base_designation))
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
    
    -- Uppercase variant (if different)
    IF base_designation != upper(base_designation) THEN
      INSERT INTO steel_member_aliases (member_id, alias)
      VALUES (member_uuid, upper(base_designation))
      ON CONFLICT (lower(trim(alias))) DO NOTHING;
    END IF;
  END IF;
END LOOP;

-- =====================================================
-- UNIVERSAL COLUMNS (UC)
-- =====================================================

FOR base_designation IN
  SELECT unnest(ARRAY[
    '150UC23', '150UC30', '150UC37',
    '200UC46', '200UC52', '200UC60',
    '250UC72', '250UC89', '250UC107',
    '310UC96', '310UC118', '310UC137', '310UC158',
    '360UC174', '360UC196', '360UC221'
  ])
LOOP
  INSERT INTO steel_members (designation, family, standard, is_standard)
  VALUES (base_designation, 'UC', 'NZ', true)
  ON CONFLICT (lower(trim(designation)), standard) DO NOTHING
  RETURNING id INTO member_uuid;
  
  IF member_uuid IS NOT NULL THEN
    spaced_alias := regexp_replace(base_designation, '([0-9]+)(UC)([0-9]+)', '\1 \2 \3');
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, spaced_alias)
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
    
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, lower(base_designation))
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
    
    IF base_designation != upper(base_designation) THEN
      INSERT INTO steel_member_aliases (member_id, alias)
      VALUES (member_uuid, upper(base_designation))
      ON CONFLICT (lower(trim(alias))) DO NOTHING;
    END IF;
  END IF;
END LOOP;

-- =====================================================
-- PARALLEL FLANGE CHANNELS (PFC)
-- =====================================================

FOR base_designation IN
  SELECT unnest(ARRAY[
    '75PFC', '100PFC', '125PFC', '150PFC',
    '180PFC', '200PFC', '230PFC', '250PFC',
    '300PFC', '380PFC', '400PFC'
  ])
LOOP
  INSERT INTO steel_members (designation, family, standard, is_standard)
  VALUES (base_designation, 'PFC', 'NZ', true)
  ON CONFLICT (lower(trim(designation)), standard) DO NOTHING
  RETURNING id INTO member_uuid;
  
  IF member_uuid IS NOT NULL THEN
    spaced_alias := regexp_replace(base_designation, '([0-9]+)(PFC)', '\1 \2');
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, spaced_alias)
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
    
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, lower(base_designation))
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
  END IF;
END LOOP;

-- =====================================================
-- WELDED BEAMS (WB)
-- =====================================================

FOR base_designation IN
  SELECT unnest(ARRAY[
    '100WB', '150WB', '200WB', '250WB',
    '310WB', '360WB', '410WB', '460WB',
    '530WB', '610WB', '690WB', '760WB',
    '800WB', '900WB', '1000WB'
  ])
LOOP
  INSERT INTO steel_members (designation, family, standard, is_standard)
  VALUES (base_designation, 'WB', 'NZ', true)
  ON CONFLICT (lower(trim(designation)), standard) DO NOTHING
  RETURNING id INTO member_uuid;
  
  IF member_uuid IS NOT NULL THEN
    spaced_alias := regexp_replace(base_designation, '([0-9]+)(WB)', '\1 \2');
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, spaced_alias)
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
    
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, lower(base_designation))
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
  END IF;
END LOOP;

-- =====================================================
-- HOLLOW SECTIONS - COMMON SIZES
-- =====================================================

-- Common RHS sizes
FOR base_designation IN
  SELECT unnest(ARRAY[
    '50x25x3 RHS', '65x35x3 RHS', '75x50x3 RHS',
    '100x50x4 RHS', '100x50x5 RHS', '100x50x6 RHS',
    '125x75x5 RHS', '150x100x5 RHS', '150x100x6 RHS',
    '200x100x6 RHS', '250x150x6 RHS', '300x200x8 RHS'
  ])
LOOP
  INSERT INTO steel_members (designation, family, standard, is_standard)
  VALUES (base_designation, 'RHS', 'NZ', true)
  ON CONFLICT (lower(trim(designation)), standard) DO NOTHING
  RETURNING id INTO member_uuid;
  
  IF member_uuid IS NOT NULL THEN
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, lower(base_designation))
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
  END IF;
END LOOP;

-- Common SHS sizes
FOR base_designation IN
  SELECT unnest(ARRAY[
    '40x40x3 SHS', '50x50x3 SHS', '50x50x4 SHS',
    '75x75x3 SHS', '75x75x5 SHS',
    '100x100x4 SHS', '100x100x5 SHS', '100x100x6 SHS',
    '125x125x5 SHS', '150x150x6 SHS', '200x200x6 SHS'
  ])
LOOP
  INSERT INTO steel_members (designation, family, standard, is_standard)
  VALUES (base_designation, 'SHS', 'NZ', true)
  ON CONFLICT (lower(trim(designation)), standard) DO NOTHING
  RETURNING id INTO member_uuid;
  
  IF member_uuid IS NOT NULL THEN
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, lower(base_designation))
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
  END IF;
END LOOP;

-- Common CHS sizes
FOR base_designation IN
  SELECT unnest(ARRAY[
    '48.3x3.2 CHS', '60.3x3.2 CHS', '76.1x3.6 CHS',
    '88.9x4.0 CHS', '114.3x4.5 CHS', '139.7x5.0 CHS',
    '168.3x5.0 CHS', '219.1x6.4 CHS', '273.0x6.4 CHS'
  ])
LOOP
  INSERT INTO steel_members (designation, family, standard, is_standard)
  VALUES (base_designation, 'CHS', 'NZ', true)
  ON CONFLICT (lower(trim(designation)), standard) DO NOTHING
  RETURNING id INTO member_uuid;
  
  IF member_uuid IS NOT NULL THEN
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, lower(base_designation))
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
  END IF;
END LOOP;

-- =====================================================
-- EQUAL ANGLES (EA)
-- =====================================================

FOR base_designation IN
  SELECT unnest(ARRAY[
    '50x50x5 EA', '65x65x6 EA', '75x75x6 EA',
    '100x100x8 EA', '125x125x10 EA', '150x150x12 EA'
  ])
LOOP
  INSERT INTO steel_members (designation, family, standard, is_standard)
  VALUES (base_designation, 'EA', 'NZ', true)
  ON CONFLICT (lower(trim(designation)), standard) DO NOTHING
  RETURNING id INTO member_uuid;
  
  IF member_uuid IS NOT NULL THEN
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, lower(base_designation))
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
  END IF;
END LOOP;

-- =====================================================
-- UNEQUAL ANGLES (UA)
-- =====================================================

FOR base_designation IN
  SELECT unnest(ARRAY[
    '75x50x6 UA', '100x75x8 UA', '125x75x10 UA',
    '150x100x10 UA', '150x100x12 UA', '200x150x12 UA'
  ])
LOOP
  INSERT INTO steel_members (designation, family, standard, is_standard)
  VALUES (base_designation, 'UA', 'NZ', true)
  ON CONFLICT (lower(trim(designation)), standard) DO NOTHING
  RETURNING id INTO member_uuid;
  
  IF member_uuid IS NOT NULL THEN
    INSERT INTO steel_member_aliases (member_id, alias)
    VALUES (member_uuid, lower(base_designation))
    ON CONFLICT (lower(trim(alias))) DO NOTHING;
  END IF;
END LOOP;

END $$;