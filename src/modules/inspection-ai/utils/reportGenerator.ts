import type { Severity } from '../types';

export function generateRecommendation(_defect_type: string, system_type: string): string {
  const sys = system_type.toLowerCase();

  if (sys.includes('intumescent')) {
    return 'Remove all damaged or delaminated coating to a sound edge. Prepare the exposed substrate in accordance with the applicable surface preparation standard and reinstate the intumescent coating system to achieve a continuous and uniform application across the affected area. Verify continuity and coverage after application.';
  }

  if (sys.includes('cementitious')) {
    return 'Remove all loose and unsound cementitious material to a stable substrate. Clean and prepare the substrate surface and reapply cementitious fireproofing to restore full continuity of the applied system. Ensure the reinstated area achieves the same surface profile as the surrounding system.';
  }

  if (sys.includes('protective')) {
    return 'Remove all unsound coating to a stable substrate. Prepare the surface in accordance with the applicable surface preparation standard and reinstate the protective coating system to match the original specification, ensuring full coverage, continuity, and compatibility with the existing system.';
  }

  if (sys.includes('firestopping')) {
    return 'Remove all defective or incomplete firestopping materials from the affected penetration or joint. Reinstate the penetration seal using a compatible system to achieve full closure and continuity in accordance with the installation requirements for the system type. Verify no voids or gaps remain after reinstatement.';
  }

  return 'Remove all non-conforming material from the affected area. Prepare the surface in accordance with the applicable standard and reinstate the system to match the original specification. Further investigation may be required to determine the root cause and prevent recurrence.';
}

export function generateRisk(severity: Severity): string {
  switch (severity) {
    case 'High':
      return 'The observed condition presents a high risk of progressive failure if not addressed. Continued deterioration may compromise the performance of the protection system. Immediate remedial action is recommended.';
    case 'Medium':
      return 'Localised degradation has been observed that requires planned maintenance. The condition should be addressed within an agreed remediation timeframe to prevent further deterioration and escalation to a higher risk category.';
    case 'Low':
      return 'A minor defect has been identified. The condition should be monitored during routine inspection activities and addressed during scheduled maintenance works.';
    default:
      return 'Risk level undetermined. Further assessment by a qualified inspector is recommended.';
  }
}
