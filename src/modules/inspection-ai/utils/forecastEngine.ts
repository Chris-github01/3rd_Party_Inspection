import type { GroupedSummaryRow } from './summaryEngine';

export type ForecastLabel =
  | 'Escalating Risk'
  | 'Recurring Pattern'
  | 'Isolated Condition';

export interface RiskForecast {
  label: ForecastLabel;
  description: string;
  urgency: 'critical' | 'moderate' | 'low';
}

export function forecastRisk(group: GroupedSummaryRow): RiskForecast {
  if (group.count >= 5 && group.risk_level === 'High Risk') {
    return {
      label: 'Escalating Risk',
      description: `Systemic high-risk issue detected across ${group.count} locations — immediate remediation recommended.`,
      urgency: 'critical',
    };
  }

  if (group.count >= 3) {
    return {
      label: 'Recurring Pattern',
      description: `Recurring defect pattern observed across ${group.count} locations — likely systemic cause.`,
      urgency: 'moderate',
    };
  }

  return {
    label: 'Isolated Condition',
    description: 'Appears isolated — monitor for recurrence.',
    urgency: 'low',
  };
}

export function getForecastColour(urgency: RiskForecast['urgency']): string {
  switch (urgency) {
    case 'critical': return 'bg-red-50 text-red-800 border-red-200';
    case 'moderate': return 'bg-amber-50 text-amber-800 border-amber-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function getForecastPDFRGB(urgency: RiskForecast['urgency']): [number, number, number] {
  switch (urgency) {
    case 'critical': return [200, 16, 46];
    case 'moderate': return [217, 119, 6];
    default: return [100, 116, 139];
  }
}
