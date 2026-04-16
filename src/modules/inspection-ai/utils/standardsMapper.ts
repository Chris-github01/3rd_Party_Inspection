export function generateNonConformance(defect_type: string, element?: string): string {
  const isPenetration = element?.toLowerCase() === 'penetration';

  return `The observed condition of ${defect_type.toLowerCase()} represents a visible defect within the coating or passive fire protection system and is not consistent with the expected condition of a properly applied and maintained system.

This assessment is made in general alignment with:
- AS/NZS 2312.1 (Guide to the Protection of Structural Steel Against Atmospheric Corrosion by the Use of Protective Coatings)
- AS 3894.1 (Site Inspection of Protective Coatings)
- ISO 4628 (Paints and Varnishes — Evaluation of Degradation of Coatings)${isPenetration ? '\n- AS 4072.1 (Components for the Protection of Openings in Fire-Resistant Separating Elements)' : ''}

The defect indicates localised breakdown of system integrity requiring remedial attention.`;
}
