/*
  # Create Demo Project
  
  ## Overview
  Creates a sample project with members for demonstration purposes.
  
  ## Demo Data Created
  
  ### 1. Demo Project
  - Alfriston College 3rd Party Inspection
  - Sample members with SC601 coating system
  - Ready for inspections to be added
  
  ## Usage
  - Register a user via the application (inspector@demo.com / demo123)
  - The demo project will be available in the dashboard
  - Add inspections to the demo members
*/

DO $$
DECLARE
  v_project_id uuid;
  v_member_b734_id uuid;
  v_member_c105_id uuid;
BEGIN
  INSERT INTO projects (
    name,
    client_name,
    main_contractor,
    site_address,
    project_ref,
    start_date,
    notes
  ) VALUES (
    'Alfriston College 3rd Party Inspection',
    'Alfriston College',
    'ABC Construction Ltd',
    '123 College Road, Wellington',
    'ALC-2024-001',
    '2024-01-15',
    'Third party verification of intumescent fireproofing application on structural steel'
  )
  RETURNING id INTO v_project_id;

  INSERT INTO members (
    project_id,
    member_mark,
    element_type,
    section,
    level,
    block,
    frr_minutes,
    coating_system,
    required_dft_microns,
    required_thickness_mm,
    status,
    notes
  ) VALUES 
    (
      v_project_id,
      'B734',
      'beam',
      '610UB125',
      'L2',
      'B',
      120,
      'SC601',
      580,
      NULL,
      'not_started',
      'Main structural beam in Block B'
    ),
    (
      v_project_id,
      'C105',
      'column',
      '310UC118',
      'L1',
      'A',
      90,
      'SC601',
      480,
      NULL,
      'not_started',
      'Primary column in Block A'
    ),
    (
      v_project_id,
      'B735',
      'beam',
      '610UB125',
      'L2',
      'B',
      120,
      'SC601',
      580,
      NULL,
      'not_started',
      NULL
    ),
    (
      v_project_id,
      'B736',
      'beam',
      '610UB125',
      'L2',
      'B',
      120,
      'SC601',
      580,
      NULL,
      'not_started',
      NULL
    ),
    (
      v_project_id,
      'C106',
      'column',
      '310UC118',
      'L1',
      'A',
      90,
      'SC601',
      480,
      NULL,
      'not_started',
      NULL
    ),
    (
      v_project_id,
      'B737',
      'beam',
      '530UB92',
      'L3',
      'C',
      90,
      'SC902',
      420,
      NULL,
      'not_started',
      'Alternative coating system'
    );

END $$;
