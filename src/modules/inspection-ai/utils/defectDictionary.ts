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
  "Surface Deterioration",
  "Moisture Damage",
  "Unknown",
] as const;

export type DefectType = (typeof DEFECT_TYPES)[number];

export function normaliseDefectType(raw: string): DefectType {
  const cleaned = raw.trim().toLowerCase();
  const exact = DEFECT_TYPES.find((d) => d.toLowerCase() === cleaned);
  if (exact) return exact;
  const partial = DEFECT_TYPES.find((d) => cleaned.includes(d.toLowerCase()));
  return partial ?? "Unknown";
}

export function isKnownDefect(raw: string): boolean {
  return raw !== "Unknown" && DEFECT_TYPES.includes(raw as DefectType);
}
