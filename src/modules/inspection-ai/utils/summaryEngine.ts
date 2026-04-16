import type { InspectionAIItem } from '../types';
import { groupFindings } from './groupingEngine';
import { estimateScope, estimateTotalScope } from './scopeEstimator';
import { getCommercialRiskLevel } from './riskEngine';
import type { CommercialRiskLevel } from './riskEngine';

export interface GroupedSummaryRow {
  defect_type: string;
  system_type: string;
  count: number;
  estimated_area: string;
  estimated_area_m2: number;
  risk_level: CommercialRiskLevel;
  highest_severity: string;
  locations: string[];
  is_systemic: boolean;
}

export interface CommercialSummary {
  total_findings: number;
  total_groups: number;
  high_risk_count: number;
  total_scope_range: string;
  total_scope_m2: number;
  groups: GroupedSummaryRow[];
}

export type { CommercialRiskLevel };

export function generateCommercialSummary(items: InspectionAIItem[]): CommercialSummary {
  const groups = groupFindings(items);
  const totalScope = estimateTotalScope(groups);

  const rows: GroupedSummaryRow[] = groups.map((group) => {
    const scope = estimateScope(group);
    const risk = getCommercialRiskLevel(group.defect_type, group.highest_severity);

    const locations = group.items
      .map((i) => [i.location_level, i.location_grid, i.location_description].filter(Boolean).join(' '))
      .filter(Boolean)
      .slice(0, 4);

    return {
      defect_type: group.defect_type,
      system_type: group.system_type,
      count: group.count,
      estimated_area: scope.range,
      estimated_area_m2: scope.estimated_area_m2,
      risk_level: risk,
      highest_severity: group.highest_severity,
      locations,
      is_systemic: group.count >= 3,
    };
  });

  const highRiskCount = rows.filter((r) => r.risk_level === 'High Risk').length;

  return {
    total_findings: items.length,
    total_groups: groups.length,
    high_risk_count: highRiskCount,
    total_scope_range: totalScope.range,
    total_scope_m2: totalScope.estimated_area_m2,
    groups: rows,
  };
}
