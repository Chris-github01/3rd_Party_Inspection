import type { DefectGroup } from './groupingEngine';

const EXTENT_M2: Record<string, number> = {
  Localised: 1,
  Moderate: 5,
  Widespread: 12,
};

export interface ScopeEstimate {
  estimated_area_m2: number;
  range: string;
}

export function estimateScope(group: DefectGroup): ScopeEstimate {
  let total = 0;

  group.items.forEach((item) => {
    total += EXTENT_M2[item.extent] ?? 1;
  });

  return {
    estimated_area_m2: total,
    range: `${Math.round(total * 0.8)}–${Math.round(total * 1.2)} m²`,
  };
}

export function estimateTotalScope(groups: DefectGroup[]): ScopeEstimate {
  let total = 0;

  groups.forEach((group) => {
    group.items.forEach((item) => {
      total += EXTENT_M2[item.extent] ?? 1;
    });
  });

  return {
    estimated_area_m2: total,
    range: `${Math.round(total * 0.8)}–${Math.round(total * 1.2)} m²`,
  };
}
