import type { Severity } from '../types';

const RECOMMENDATION_MAP: Record<string, string> = {
  delamination:
    'Remove all unsound coating to a stable substrate. Prepare the surface in accordance with the applicable surface preparation standard and reinstate the coating system to match the original specification, ensuring full coverage and continuity.',
  cracking:
    'Assess crack width and depth to determine extent of damage. Remove cracked coating material to sound substrate, apply appropriate filler or primer, and reinstate the coating system in accordance with the project specification.',
  'surface damage':
    'Remove loose and damaged material from the affected area. Clean the substrate and apply a compatible repair system in accordance with the applicable product and project specifications.',
  'coating failure':
    'Remove all failed coating to a sound substrate. Prepare the surface to the required standard and apply a new coating system conforming to the project specification. Ensure full cure before returning to service.',
  'missing material':
    'Reinstate the missing coating or passive fire protection material to the full specified thickness. Verify coverage using appropriate measurement techniques after application.',
  corrosion:
    'Remove all corrosion products and contaminants from the substrate. Prepare the surface to the required cleanliness and roughness profile. Apply a corrosion-inhibiting primer and compatible topcoat system.',
  'corrosion breakthrough':
    'Remove all corrosion and failed coating. Prepare steel to minimum Sa 2.5 (ISO 8501-1). Apply a high-performance corrosion protection system compatible with the environment and original specification.',
  blistering:
    'Identify and address the source of moisture or contamination causing blistering. Remove all blistered coating, treat any underlying corrosion, and reinstate the coating system after thorough surface preparation.',
  erosion:
    'Apply additional coating thickness to the eroded area following surface preparation. Verify final dry film thickness meets the specified requirement.',
  disbondment:
    'Remove all disbonded coating to a sound substrate. Investigate the cause of adhesion failure (contamination, moisture, incorrect primer) and address before reinstating the system.',
};

const DEFAULT_RECOMMENDATION =
  'Remove all non-conforming material from the affected area. Prepare the surface in accordance with the applicable surface preparation standard and reinstate the coating or passive fire protection system to match the original project specification.';

export function generateRecommendation(
  defect_type: string,
  system_type?: string
): string {
  const normalised = defect_type.toLowerCase().trim();

  for (const [key, rec] of Object.entries(RECOMMENDATION_MAP)) {
    if (normalised.includes(key)) {
      if (system_type?.toLowerCase().includes('firestopping')) {
        return rec.replace(
          /coating system/gi,
          'passive fire protection system'
        );
      }
      return rec;
    }
  }

  if (system_type?.toLowerCase().includes('firestopping')) {
    return DEFAULT_RECOMMENDATION.replace(
      /coating or passive fire protection system/gi,
      'passive fire protection system'
    );
  }

  return DEFAULT_RECOMMENDATION;
}

export function generateRisk(severity: Severity): string {
  switch (severity) {
    case 'High':
      return 'The observed condition presents a high risk of progressive failure. Immediate action is required to prevent further deterioration and to restore the integrity of the protection system.';
    case 'Medium':
      return 'Localised degradation has been observed that requires planned maintenance. The condition should be addressed within an agreed remediation timeframe to prevent escalation.';
    case 'Low':
      return 'A minor defect has been identified. The condition should be monitored and addressed during scheduled maintenance activities.';
    default:
      return 'Risk level undetermined. Further assessment is recommended.';
  }
}
