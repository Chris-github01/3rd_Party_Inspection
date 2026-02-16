/*
  # Fix FRR Values from Member Marks

  1. Changes
    - Updates all members where member_mark contains FRR rating (e.g., R60, R90, R120)
    - Extracts the FRR value from member_mark and updates frr_minutes and frr_format
    - Only applies to standard FRR ratings: 30, 45, 60, 90, 120, 180, 240

  2. Impact
    - Corrects incorrect FRR values that were parsed from other columns
    - Example: R60 members showing 90 min will now show 60 min
*/

-- Update members where member_mark contains a standard FRR rating
UPDATE members
SET 
  frr_minutes = CAST(substring(member_mark FROM 'R(\d{2,3})') AS INTEGER),
  frr_format = CAST(substring(member_mark FROM 'R(\d{2,3})') AS INTEGER) || '/-/-'
WHERE 
  member_mark ~ 'R\d{2,3}'
  AND CAST(substring(member_mark FROM 'R(\d{2,3})') AS INTEGER) IN (30, 45, 60, 90, 120, 180, 240);
