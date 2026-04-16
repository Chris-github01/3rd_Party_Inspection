import type { InspectionAIItem } from '../types';

export interface DefectTrend {
  defect_type: string;
  count: number;
  percentage: number;
}

export interface SystemTrend {
  system_type: string;
  count: number;
  percentage: number;
}

export interface TrendAnalysis {
  defect_trends: DefectTrend[];
  system_trends: SystemTrend[];
  dominant_defect: string | null;
  dominant_system: string | null;
  concentration_warning: boolean;
}

export function calculateTrends(items: InspectionAIItem[]): TrendAnalysis {
  if (items.length === 0) {
    return {
      defect_trends: [],
      system_trends: [],
      dominant_defect: null,
      dominant_system: null,
      concentration_warning: false,
    };
  }

  const defectCounts: Record<string, number> = {};
  const systemCounts: Record<string, number> = {};

  items.forEach((item) => {
    defectCounts[item.defect_type] = (defectCounts[item.defect_type] ?? 0) + 1;
    systemCounts[item.system_type] = (systemCounts[item.system_type] ?? 0) + 1;
  });

  const defect_trends: DefectTrend[] = Object.entries(defectCounts)
    .map(([defect_type, count]) => ({
      defect_type,
      count,
      percentage: Math.round((count / items.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const system_trends: SystemTrend[] = Object.entries(systemCounts)
    .map(([system_type, count]) => ({
      system_type,
      count,
      percentage: Math.round((count / items.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const dominant_defect = defect_trends[0]?.defect_type ?? null;
  const dominant_system = system_trends[0]?.system_type ?? null;
  const topPct = defect_trends[0]?.percentage ?? 0;
  const concentration_warning = topPct >= 50 && items.length >= 4;

  return {
    defect_trends,
    system_trends,
    dominant_defect,
    dominant_system,
    concentration_warning,
  };
}
