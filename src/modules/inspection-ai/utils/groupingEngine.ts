import type { InspectionAIItem } from '../types';

export interface DefectGroup {
  defect_type: string;
  system_type: string;
  count: number;
  items: InspectionAIItem[];
  highest_severity: string;
}

export function groupFindings(items: InspectionAIItem[]): DefectGroup[] {
  const groups: Record<string, DefectGroup> = {};

  const severityRank: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

  items.forEach((item) => {
    const key = `${item.defect_type}__${item.system_type}`;

    if (!groups[key]) {
      groups[key] = {
        defect_type: item.defect_type,
        system_type: item.system_type,
        count: 0,
        items: [],
        highest_severity: 'Low',
      };
    }

    groups[key].count++;
    groups[key].items.push(item);

    const current = groups[key].highest_severity;
    if ((severityRank[item.severity] ?? 0) > (severityRank[current] ?? 0)) {
      groups[key].highest_severity = item.severity;
    }
  });

  return Object.values(groups).sort((a, b) => {
    const sr = severityRank[b.highest_severity] - severityRank[a.highest_severity];
    if (sr !== 0) return sr;
    return b.count - a.count;
  });
}
