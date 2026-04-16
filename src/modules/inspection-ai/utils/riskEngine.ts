export type CommercialRiskLevel = 'High Risk' | 'Moderate Risk' | 'Low Risk';

const HIGH_RISK_DEFECTS = new Set([
  'Delamination',
  'Spalling',
  'Structural Crack',
  'Fire Seal Failure',
  'Corrosion Breakthrough',
  'Disbondment',
]);

export function getCommercialRiskLevel(defectType: string, severity: string): CommercialRiskLevel {
  if (severity === 'High') return 'High Risk';
  if (severity === 'Medium' && HIGH_RISK_DEFECTS.has(defectType)) return 'High Risk';
  if (severity === 'Medium') return 'Moderate Risk';
  return 'Low Risk';
}

export function getRiskColour(risk: CommercialRiskLevel): [number, number, number] {
  switch (risk) {
    case 'High Risk': return [200, 16, 46];
    case 'Moderate Risk': return [217, 119, 6];
    default: return [16, 185, 129];
  }
}

export function getRiskTailwindClass(risk: CommercialRiskLevel): string {
  switch (risk) {
    case 'High Risk': return 'bg-red-100 text-red-800 border-red-200';
    case 'Moderate Risk': return 'bg-amber-100 text-amber-800 border-amber-200';
    default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
}
