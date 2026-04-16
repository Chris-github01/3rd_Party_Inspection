import type { GroupedSummaryRow } from './summaryEngine';
import { estimateCost } from './costEstimator';
import { forecastRisk } from './forecastEngine';
import { generateVariation, mergeVariationItems } from './variationEngine';
import type { VariationItem } from './variationEngine';

export interface VariationSummary {
  items: VariationItem[];
  total_groups: number;
  total_count: number;
  total_area_m2: number;
  total_cost_low: number;
  total_cost_high: number;
  total_cost_formatted: string;
  has_high_risk: boolean;
}

function formatNZD(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `$${v.toLocaleString()}`;
}

export function buildVariationSummary(groups: GroupedSummaryRow[]): VariationSummary {
  const items: VariationItem[] = groups.map((group) => {
    const cost = estimateCost(group);
    const forecast = forecastRisk(group);
    return generateVariation(group, cost, forecast);
  });

  const totalArea = items.reduce((sum, i) => sum + i.estimated_area_m2, 0);
  const totalCostLow = items.reduce((sum, i) => sum + (i.cost?.low ?? 0), 0);
  const totalCostHigh = items.reduce((sum, i) => sum + (i.cost?.high ?? 0), 0);
  const totalCount = items.reduce((sum, i) => sum + i.count, 0);
  const hasHighRisk = items.some((i) => i.risk_level === 'High Risk');

  return {
    items,
    total_groups: items.length,
    total_count: totalCount,
    total_area_m2: totalArea,
    total_cost_low: totalCostLow,
    total_cost_high: totalCostHigh,
    total_cost_formatted: `${formatNZD(totalCostLow)} – ${formatNZD(totalCostHigh)}`,
    has_high_risk: hasHighRisk,
  };
}

export function buildMergedVariation(groups: GroupedSummaryRow[]): VariationItem {
  const items = groups.map((group) => {
    const cost = estimateCost(group);
    const forecast = forecastRisk(group);
    return generateVariation(group, cost, forecast);
  });
  return mergeVariationItems(items);
}
