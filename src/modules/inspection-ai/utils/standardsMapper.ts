const STANDARDS_BY_DEFECT: Record<string, string[]> = {
  delamination: ['AS/NZS 2312.1', 'ISO 4628-5'],
  cracking: ['AS/NZS 2312.1', 'ISO 4628-4', 'AS 3894.1'],
  'surface damage': ['AS/NZS 2312.1', 'ISO 4628-1', 'AS 3894.1'],
  'coating failure': ['AS/NZS 2312.1', 'ISO 4628-1', 'AS 3894.1'],
  'missing material': ['AS 4072.1', 'AS/NZS 2312.1'],
  corrosion: ['AS/NZS 2312.1', 'ISO 4628-3', 'AS 3894.1'],
  'corrosion breakthrough': ['AS/NZS 2312.1', 'ISO 4628-3'],
  blistering: ['AS/NZS 2312.1', 'ISO 4628-2'],
  erosion: ['AS/NZS 2312.1', 'ISO 4628-6'],
  disbondment: ['AS/NZS 2312.1', 'ISO 4628-5', 'AS 3894.1'],
  default: ['AS/NZS 2312.1', 'ISO 4628', 'AS 3894.1'],
};

const PENETRATION_STANDARDS = ['AS 4072.1', 'AS/NZS 1530.4'];

export function generateNonConformance(
  defect_type: string,
  element?: string
): string {
  const normalised = defect_type.toLowerCase().trim();

  let applicableStandards = STANDARDS_BY_DEFECT.default;
  for (const [key, standards] of Object.entries(STANDARDS_BY_DEFECT)) {
    if (normalised.includes(key)) {
      applicableStandards = standards;
      break;
    }
  }

  if (element?.toLowerCase() === 'penetration') {
    applicableStandards = [
      ...new Set([...applicableStandards, ...PENETRATION_STANDARDS]),
    ];
  }

  const standardsList = applicableStandards.join(', ');

  return (
    `The observed condition of ${defect_type.toLowerCase()} is not consistent with the ` +
    `expected performance of a coating or passive fire protection system in accordance ` +
    `with relevant industry standards including ${standardsList}. ` +
    `The condition requires remediation to restore conformance.`
  );
}
