/*
  # Fix FRR Values in Loading Schedule Items

  1. Changes
    - Updates all loading_schedule_items where member_mark contains FRR rating
    - Extracts the FRR value from member_mark and updates frr_minutes and frr_format
    - Only applies to standard FRR ratings: 30, 45, 60, 90, 120, 180, 240

  2. Impact
    - Corrects the source parsed data so it displays correctly in Loading Schedule tab
*/

-- Update loading_schedule_items where member_mark contains a standard FRR rating
UPDATE loading_schedule_items
SET 
  frr_minutes = CAST(substring(member_mark FROM 'R(\d{2,3})') AS INTEGER),
  frr_format = CAST(substring(member_mark FROM 'R(\d{2,3})') AS INTEGER) || '/-/-'
WHERE 
  member_mark ~ 'R\d{2,3}'
  AND CAST(substring(member_mark FROM 'R(\d{2,3})') AS INTEGER) IN (30, 45, 60, 90, 120, 180, 240);
