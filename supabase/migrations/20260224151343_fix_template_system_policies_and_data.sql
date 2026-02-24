/*
  # Fix Template System - Complete Solution
  
  ## Problems Identified:
  1. **Empty form_templates table** - No seed data exists
  2. **Missing RLS policies** - No INSERT/UPDATE/DELETE policies for admins
  3. **Non-functional UI** - Template creation button has no action
  
  ## Changes Made:
  
  ### 1. RLS Policies (Security)
  - Add INSERT policy for admin users
  - Add UPDATE policy for admin users  
  - Add DELETE policy for admin users
  - Keep existing SELECT policy for authenticated users
  
  ### 2. Seed Data (Functionality)
  - Add default intumescent inspection template
  - Add default cementitious inspection template
  - Add default NCR template
  - Add default general inspection template
  
  ## Impact:
  - Users can now see existing templates in project wizard
  - Admins can create new templates
  - Templates are properly secured with RLS
  - Project creation workflow is unblocked
*/

-- ============================================================================
-- SECTION 1: Add Missing RLS Policies
-- ============================================================================

-- Allow admins to insert templates
CREATE POLICY "Admins can insert form templates"
  ON form_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Allow admins to update templates
CREATE POLICY "Admins can update form templates"
  ON form_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Allow admins to delete templates
CREATE POLICY "Admins can delete form templates"
  ON form_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================================================
-- SECTION 2: Seed Default Templates
-- ============================================================================

-- Template 1: Intumescent Coating Inspection
INSERT INTO form_templates (template_name, applies_to, template_json)
VALUES (
  'Standard Intumescent Inspection',
  'intumescent',
  '{
    "sections": [
      {
        "title": "Surface Preparation",
        "fields": [
          {
            "id": "surface_cleanliness",
            "label": "Surface Cleanliness",
            "type": "select",
            "options": ["Clean", "Contaminated", "Requires Cleaning"],
            "required": true
          },
          {
            "id": "substrate_condition",
            "label": "Substrate Condition",
            "type": "select",
            "options": ["Good", "Fair", "Poor", "Damaged"],
            "required": true
          }
        ]
      },
      {
        "title": "Application Quality",
        "fields": [
          {
            "id": "coating_uniformity",
            "label": "Coating Uniformity",
            "type": "select",
            "options": ["Uniform", "Slight Variation", "Uneven"],
            "required": true
          },
          {
            "id": "edge_coverage",
            "label": "Edge Coverage",
            "type": "select",
            "options": ["Complete", "Partial", "Inadequate"],
            "required": true
          },
          {
            "id": "runs_sags",
            "label": "Runs/Sags Present",
            "type": "select",
            "options": ["None", "Minor", "Significant"],
            "required": false
          }
        ]
      },
      {
        "title": "DFT Measurements",
        "fields": [
          {
            "id": "measurement_method",
            "label": "Measurement Method",
            "type": "select",
            "options": ["Digital Gauge", "Wet Film Gauge", "Calculated"],
            "required": true
          },
          {
            "id": "dft_conformity",
            "label": "DFT Conformity",
            "type": "select",
            "options": ["Conforms", "Below Spec", "Above Spec"],
            "required": true
          }
        ]
      }
    ]
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Template 2: Cementitious Coating Inspection
INSERT INTO form_templates (template_name, applies_to, template_json)
VALUES (
  'Standard Cementitious Inspection',
  'cementitious',
  '{
    "sections": [
      {
        "title": "Application Assessment",
        "fields": [
          {
            "id": "spray_coverage",
            "label": "Spray Coverage",
            "type": "select",
            "options": ["Complete", "Incomplete", "Patchy"],
            "required": true
          },
          {
            "id": "adhesion_quality",
            "label": "Adhesion Quality",
            "type": "select",
            "options": ["Excellent", "Good", "Fair", "Poor"],
            "required": true
          },
          {
            "id": "surface_finish",
            "label": "Surface Finish",
            "type": "select",
            "options": ["Smooth", "Textured", "Rough", "Uneven"],
            "required": true
          }
        ]
      },
      {
        "title": "Thickness Verification",
        "fields": [
          {
            "id": "measurement_locations",
            "label": "Measurement Locations",
            "type": "number",
            "required": true
          },
          {
            "id": "thickness_uniformity",
            "label": "Thickness Uniformity",
            "type": "select",
            "options": ["Uniform", "Varied", "Inconsistent"],
            "required": true
          }
        ]
      },
      {
        "title": "Visual Quality",
        "fields": [
          {
            "id": "cracks_present",
            "label": "Cracks Present",
            "type": "select",
            "options": ["None", "Hairline", "Significant"],
            "required": true
          },
          {
            "id": "delamination",
            "label": "Delamination",
            "type": "select",
            "options": ["None", "Minor", "Major"],
            "required": true
          }
        ]
      }
    ]
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Template 3: NCR Template
INSERT INTO form_templates (template_name, applies_to, template_json)
VALUES (
  'Standard NCR Form',
  'ncr',
  '{
    "sections": [
      {
        "title": "Non-Conformance Details",
        "fields": [
          {
            "id": "defect_type",
            "label": "Defect Type",
            "type": "select",
            "options": ["Coating Thickness", "Surface Defect", "Coverage Issue", "Application Error", "Other"],
            "required": true
          },
          {
            "id": "severity",
            "label": "Severity",
            "type": "select",
            "options": ["Minor", "Major", "Critical"],
            "required": true
          },
          {
            "id": "immediate_action",
            "label": "Immediate Action Required",
            "type": "select",
            "options": ["Yes", "No"],
            "required": true
          }
        ]
      },
      {
        "title": "Corrective Action",
        "fields": [
          {
            "id": "proposed_remedy",
            "label": "Proposed Remedy",
            "type": "textarea",
            "required": true
          },
          {
            "id": "responsible_party",
            "label": "Responsible Party",
            "type": "text",
            "required": true
          },
          {
            "id": "target_completion",
            "label": "Target Completion Date",
            "type": "date",
            "required": true
          }
        ]
      }
    ]
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- Template 4: General Inspection Template
INSERT INTO form_templates (template_name, applies_to, template_json)
VALUES (
  'General Fire Protection Inspection',
  'both',
  '{
    "sections": [
      {
        "title": "Environmental Conditions",
        "fields": [
          {
            "id": "ambient_temp",
            "label": "Ambient Temperature (°C)",
            "type": "number",
            "required": true
          },
          {
            "id": "steel_temp",
            "label": "Steel Temperature (°C)",
            "type": "number",
            "required": true
          },
          {
            "id": "relative_humidity",
            "label": "Relative Humidity (%)",
            "type": "number",
            "required": true
          }
        ]
      },
      {
        "title": "General Observations",
        "fields": [
          {
            "id": "overall_condition",
            "label": "Overall Condition",
            "type": "select",
            "options": ["Excellent", "Good", "Satisfactory", "Poor"],
            "required": true
          },
          {
            "id": "workmanship",
            "label": "Workmanship Quality",
            "type": "select",
            "options": ["Excellent", "Good", "Adequate", "Substandard"],
            "required": true
          }
        ]
      },
      {
        "title": "Compliance",
        "fields": [
          {
            "id": "specification_compliance",
            "label": "Specification Compliance",
            "type": "select",
            "options": ["Compliant", "Minor Deviations", "Non-Compliant"],
            "required": true
          }
        ]
      }
    ]
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify templates were created
DO $$
DECLARE
  template_count INT;
BEGIN
  SELECT COUNT(*) INTO template_count FROM form_templates;
  
  IF template_count >= 4 THEN
    RAISE NOTICE '✓ Successfully created % templates', template_count;
  ELSE
    RAISE WARNING '⚠ Only % templates created, expected 4 or more', template_count;
  END IF;
END $$;
