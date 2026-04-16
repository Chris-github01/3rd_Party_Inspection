export const OBSERVATION_TEMPLATES: Record<string, string> = {
  'Delamination': 'Loss of adhesion observed resulting in separation of coating layers from the substrate or between coats.',
  'Cracking': 'Visible cracking observed within the applied coating system, indicating stress or cure-related failure.',
  'Mechanical Damage': 'Physical damage to the coating system observed, likely resulting from impact or abrasion during construction activities.',
  'Missing Coating': 'Areas of missing coating observed exposing the underlying substrate to the surrounding environment.',
  'Corrosion Breakthrough': 'Corrosion products visible through the coating system, indicating breakdown of the protective barrier.',
  'Blistering': 'Blistering observed at the coating surface indicating localised loss of adhesion and potential moisture ingress.',
  'Spalling': 'Material breakdown and detachment observed within the applied system, indicating structural integrity concern.',
  'Voids': 'Voids or gaps present within the applied system, resulting in incomplete coverage and reduced performance.',
  'Incomplete Firestopping': 'Firestopping installation observed as incomplete or absent at the inspected penetration or joint.',
  'Surface Deterioration': 'Generalised surface weathering observed, including chalking, fading, or superficial degradation without a specific defect mechanism.',
  'Moisture Damage': 'Evidence of moisture ingress or water staining observed within or beneath the coating system, without active corrosion.',
  'Unknown': 'Defect type could not be determined from available visual evidence. Inspector classification required.',
  'Disbondment': 'Disbondment of the coating system observed, with separation occurring at the coating-substrate interface.',
  'Contamination': 'Surface contamination observed beneath or within the coating system, compromising adhesion integrity.',
  'Incorrect Application': 'Evidence of incorrect application technique observed, resulting in non-uniform coating distribution.',
  'Insufficient DFT': 'Dry film thickness measurements indicate insufficient coating build-up relative to the specified system.',
  'Holidays / Pinholes': 'Coating holidays or pinholes observed, resulting in areas of zero coating thickness over the substrate.',
};

export function getObservationTemplate(defectType: string): string {
  return OBSERVATION_TEMPLATES[defectType] ?? '';
}
