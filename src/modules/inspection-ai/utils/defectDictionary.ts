export const DEFECT_TYPES = [
  "Delamination",
  "Cracking",
  "Mechanical Damage",
  "Missing Coating",
  "Corrosion Breakthrough",
  "Blistering",
  "Spalling",
  "Voids",
  "Incomplete Firestopping",
] as const;

export type DefectType = (typeof DEFECT_TYPES)[number];

export function normaliseDefectType(raw: string): DefectType {
  const cleaned = raw.trim().toLowerCase();
  const match = DEFECT_TYPES.find(
    (d) => d.toLowerCase() === cleaned || cleaned.includes(d.toLowerCase())
  );
  return match ?? "Mechanical Damage";
}
