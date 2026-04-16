import type { GroupedSummaryRow } from './summaryEngine';

interface RateRange {
  min: number;
  max: number;
}

const SYSTEM_RATES: Record<string, RateRange> = {
  'Intumescent': { min: 80, max: 140 },
  'Cementitious': { min: 60, max: 110 },
  'Protective Coating': { min: 70, max: 120 },
  'Firestopping': { min: 50, max: 90 },
};

const DEFAULT_RATE: RateRange = { min: 55, max: 105 };

export interface CostEstimate {
  low: number;
  high: number;
  formatted: string;
}

export interface TotalCostEstimate {
  low: number;
  high: number;
  formatted: string;
}

function formatNZD(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return `$${value.toLocaleString()}`;
}

export function estimateCost(group: GroupedSummaryRow): CostEstimate {
  const rate = SYSTEM_RATES[group.system_type] ?? DEFAULT_RATE;
  const area = group.estimated_area_m2 || 1;

  const low = Math.round(rate.min * area);
  const high = Math.round(rate.max * area);

  return {
    low,
    high,
    formatted: `${formatNZD(low)} – ${formatNZD(high)}`,
  };
}

export function estimateTotalCost(groups: GroupedSummaryRow[]): TotalCostEstimate {
  let low = 0;
  let high = 0;

  groups.forEach((group) => {
    const est = estimateCost(group);
    low += est.low;
    high += est.high;
  });

  return {
    low,
    high,
    formatted: `${formatNZD(low)} – ${formatNZD(high)}`,
  };
}

export const COST_DISCLAIMER =
  'Indicative cost range only. Subject to detailed measurement, site verification, and current market rates. Not a quote.';
