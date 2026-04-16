import type { GroupedSummaryRow } from './summaryEngine';
import type { CostEstimate } from './costEstimator';
import type { RiskForecast } from './forecastEngine';

export interface VariationItem {
  id: string;
  title: string;
  description: string;
  scope: string;
  system_type: string;
  defect_type: string;
  count: number;
  estimated_area: string;
  estimated_area_m2: number;
  risk_level: string;
  cost?: CostEstimate;
  forecast?: RiskForecast;
  locations: string[];
  is_merged: boolean;
  merged_from?: string[];
}

const SCOPE_LINES = [
  'Remove all defective material to a sound substrate.',
  'Prepare and clean all surfaces in accordance with manufacturer and relevant standards requirements.',
  'Reinstate the system to match original specification and performance requirements.',
  'Ensure continuity of fire protection across all affected areas and interfaces.',
  'Provide inspector hold points prior to reinstatement and at completion.',
];

function buildDescription(group: GroupedSummaryRow, forecast?: RiskForecast): string {
  const condition = forecast
    ? forecast.label === 'Escalating Risk'
      ? 'a systemic and escalating condition'
      : forecast.label === 'Recurring Pattern'
      ? 'a recurring condition across multiple locations'
      : 'an observed condition'
    : 'an observed condition';

  return (
    `Remedial works are required to address ${group.defect_type.toLowerCase()} ` +
    `affecting ${group.system_type.toLowerCase()} systems. ` +
    `The condition has been identified across ${group.count} location${group.count !== 1 ? 's' : ''} ` +
    `and is considered ${condition}. ` +
    `The total indicative affected area is ${group.estimated_area}.`
  );
}

export function generateVariation(
  group: GroupedSummaryRow,
  cost?: CostEstimate,
  forecast?: RiskForecast
): VariationItem {
  return {
    id: `${group.defect_type}-${group.system_type}`.replace(/\s+/g, '-').toLowerCase(),
    title: `${group.defect_type} – ${group.system_type}`,
    description: buildDescription(group, forecast),
    scope: SCOPE_LINES.join('\n'),
    system_type: group.system_type,
    defect_type: group.defect_type,
    count: group.count,
    estimated_area: group.estimated_area,
    estimated_area_m2: group.estimated_area_m2,
    risk_level: group.risk_level,
    cost,
    forecast,
    locations: group.locations,
    is_merged: false,
  };
}

export function mergeVariationItems(items: VariationItem[]): VariationItem {
  const totalArea = items.reduce((sum, i) => sum + i.estimated_area_m2, 0);
  const totalCount = items.reduce((sum, i) => sum + i.count, 0);
  const riskPriority: Record<string, number> = { 'High Risk': 3, 'Medium Risk': 2, 'Low Risk': 1 };
  const highestRisk = items.sort((a, b) => (riskPriority[b.risk_level] ?? 0) - (riskPriority[a.risk_level] ?? 0))[0].risk_level;

  const systemTypes = [...new Set(items.map((i) => i.system_type))];
  const defectTypes = [...new Set(items.map((i) => i.defect_type))];
  const allLocations = [...new Set(items.flatMap((i) => i.locations))].slice(0, 6);

  const totalCostLow = items.reduce((sum, i) => sum + (i.cost?.low ?? 0), 0);
  const totalCostHigh = items.reduce((sum, i) => sum + (i.cost?.high ?? 0), 0);

  const formatNZD = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

  const mergedDescription =
    `Remedial works are required to address multiple defect conditions ` +
    `(${defectTypes.join(', ')}) affecting ${systemTypes.join(' and ')} systems. ` +
    `Conditions have been identified across ${totalCount} location${totalCount !== 1 ? 's' : ''} ` +
    `with a combined indicative affected area of approximately ${totalArea.toFixed(1)} m².`;

  return {
    id: 'merged-variation',
    title: `Combined Variation – ${systemTypes.join(' / ')}`,
    description: mergedDescription,
    scope: SCOPE_LINES.join('\n'),
    system_type: systemTypes.join(', '),
    defect_type: defectTypes.join(', '),
    count: totalCount,
    estimated_area: `${totalArea.toFixed(1)} m²`,
    estimated_area_m2: totalArea,
    risk_level: highestRisk,
    cost: totalCostLow > 0
      ? { low: totalCostLow, high: totalCostHigh, formatted: `${formatNZD(totalCostLow)} – ${formatNZD(totalCostHigh)}` }
      : undefined,
    locations: allLocations,
    is_merged: true,
    merged_from: items.map((i) => i.title),
  };
}

export const VARIATION_DISCLAIMER =
  'Indicative scope based on observed conditions only. Not a formal variation claim. Subject to contract review, detailed measurement, and approval by the relevant parties.';
