import type { CommercialSummary } from './summaryEngine';

export interface InspectionSnapshot {
  report_id: string;
  project_name: string;
  date: string;
  total_findings: number;
  high_risk_count: number;
  total_scope_m2: number;
  total_cost_low: number;
  total_cost_high: number;
}

export interface InspectionComparison {
  change_in_findings: number;
  change_in_high_risk: number;
  change_in_scope_m2: number;
  trend: 'improving' | 'worsening' | 'stable';
  summary: string;
}

const HISTORY_KEY = 'inspection_ai_history';

export function saveSnapshot(
  reportId: string,
  projectName: string,
  summary: CommercialSummary,
  costLow: number,
  costHigh: number
): void {
  const existing = loadHistory();
  const snapshot: InspectionSnapshot = {
    report_id: reportId,
    project_name: projectName,
    date: new Date().toISOString(),
    total_findings: summary.total_findings,
    high_risk_count: summary.high_risk_count,
    total_scope_m2: summary.total_scope_m2,
    total_cost_low: costLow,
    total_cost_high: costHigh,
  };

  const updated = [snapshot, ...existing.filter((s) => s.report_id !== reportId)].slice(0, 20);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // storage quota — silently skip
  }
}

export function loadHistory(): InspectionSnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InspectionSnapshot[];
  } catch {
    return [];
  }
}

export function compareInspections(
  current: CommercialSummary,
  previous: InspectionSnapshot
): InspectionComparison {
  const changeFinding = current.total_findings - previous.total_findings;
  const changeRisk = current.high_risk_count - previous.high_risk_count;
  const changeScope = current.total_scope_m2 - previous.total_scope_m2;

  let trend: InspectionComparison['trend'];
  if (changeFinding <= 0 && changeRisk <= 0) trend = 'improving';
  else if (changeFinding > 2 || changeRisk > 1) trend = 'worsening';
  else trend = 'stable';

  const parts: string[] = [];
  if (changeFinding > 0) parts.push(`+${changeFinding} findings`);
  else if (changeFinding < 0) parts.push(`${changeFinding} findings`);
  if (changeRisk > 0) parts.push(`+${changeRisk} high-risk groups`);
  else if (changeRisk < 0) parts.push(`${changeRisk} high-risk groups`);

  const summary = parts.length > 0 ? `vs. previous: ${parts.join(', ')}` : 'No significant change vs. previous inspection';

  return {
    change_in_findings: changeFinding,
    change_in_high_risk: changeRisk,
    change_in_scope_m2: changeScope,
    trend,
    summary,
  };
}
