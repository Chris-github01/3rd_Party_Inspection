import { supabase } from '../../../lib/supabase';

export interface TelemetrySummary {
  totalReports: number;
  totalFindings: number;
  totalEvidencePhotos: number;
  totalOverrides: number;
  avgConfidence: number;
  aiSuccessRate: number;
  overrideRate: number;
  findingsPerReport: number;
  evidencePerFinding: number;
}

export interface SeverityBreakdown {
  High: number;
  Medium: number;
  Low: number;
}

export interface DefectDistribution {
  defect_type: string;
  count: number;
  override_count: number;
  avg_confidence: number;
}

export interface OverridePattern {
  ai_defect_type: string;
  final_defect_type: string;
  count: number;
  system_type: string;
}

export interface ConfidenceBucket {
  label: string;
  count: number;
  min: number;
  max: number;
}

export interface DailyActivity {
  date: string;
  findings: number;
  overrides: number;
  reports: number;
}

export interface TelemetryData {
  summary: TelemetrySummary;
  severityBreakdown: SeverityBreakdown;
  defectDistribution: DefectDistribution[];
  overridePatterns: OverridePattern[];
  confidenceBuckets: ConfidenceBucket[];
  dailyActivity: DailyActivity[];
  mostOverriddenTypes: { defect_type: string; override_rate: number; count: number }[];
}

export async function fetchTelemetry(): Promise<TelemetryData> {
  const [
    reportsRes,
    itemsRes,
    evidenceRes,
    overridesRes,
  ] = await Promise.all([
    supabase.from('inspection_ai_reports').select('id, created_at', { count: 'exact' }),
    supabase.from('inspection_ai_items').select(
      'id, defect_type, severity, confidence, inspector_override, defect_type_override, severity_override, report_id, created_at'
    ),
    supabase.from('inspection_ai_item_images').select('id, item_id', { count: 'exact' }),
    supabase.from('inspection_ai_overrides').select(
      'ai_defect_type, final_defect_type, system_type, changed_fields, created_at'
    ),
  ]);

  const reports = reportsRes.data ?? [];
  const items = itemsRes.data ?? [];
  const evidenceCount = evidenceRes.count ?? 0;
  const overrides = overridesRes.data ?? [];

  const totalReports = reports.length;
  const totalFindings = items.length;
  const totalEvidencePhotos = evidenceCount;
  const totalOverrides = overrides.length;

  const itemsWithAI = items.filter((i) => i.confidence > 0);
  const avgConfidence = itemsWithAI.length
    ? Math.round(itemsWithAI.reduce((s, i) => s + i.confidence, 0) / itemsWithAI.length)
    : 0;

  const overriddenItems = items.filter((i) => i.inspector_override || i.defect_type_override || i.severity_override);
  const overrideRate = totalFindings ? Math.round((overriddenItems.length / totalFindings) * 100) : 0;
  const aiSuccessRate = totalFindings
    ? Math.round((items.filter((i) => i.confidence > 0).length / totalFindings) * 100)
    : 0;

  const findingsPerReport = totalReports ? Math.round((totalFindings / totalReports) * 10) / 10 : 0;
  const evidencePerFinding = totalFindings ? Math.round((totalEvidencePhotos / totalFindings) * 10) / 10 : 0;

  const severityBreakdown: SeverityBreakdown = { High: 0, Medium: 0, Low: 0 };
  for (const item of items) {
    const sev = item.severity_override ?? item.severity;
    if (sev === 'High') severityBreakdown.High++;
    else if (sev === 'Medium') severityBreakdown.Medium++;
    else if (sev === 'Low') severityBreakdown.Low++;
  }

  const defectMap = new Map<string, { count: number; overrides: number; confSum: number }>();
  for (const item of items) {
    const dt = item.defect_type_override ?? item.defect_type;
    if (!dt) continue;
    const existing = defectMap.get(dt) ?? { count: 0, overrides: 0, confSum: 0 };
    existing.count++;
    if (item.defect_type_override && item.defect_type_override !== item.defect_type) existing.overrides++;
    existing.confSum += item.confidence ?? 0;
    defectMap.set(dt, existing);
  }
  const defectDistribution: DefectDistribution[] = Array.from(defectMap.entries())
    .map(([defect_type, v]) => ({
      defect_type,
      count: v.count,
      override_count: v.overrides,
      avg_confidence: v.count ? Math.round(v.confSum / v.count) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const overridePatternMap = new Map<string, { count: number; system_type: string }>();
  for (const o of overrides) {
    if (!o.ai_defect_type || !o.final_defect_type) continue;
    if (o.ai_defect_type === o.final_defect_type) continue;
    const key = `${o.ai_defect_type}→${o.final_defect_type}|${o.system_type ?? ''}`;
    const existing = overridePatternMap.get(key) ?? { count: 0, system_type: o.system_type ?? '' };
    existing.count++;
    overridePatternMap.set(key, existing);
  }
  const overridePatterns: OverridePattern[] = Array.from(overridePatternMap.entries())
    .map(([key, v]) => {
      const [pair] = key.split('|');
      const [ai, final] = pair.split('→');
      return { ai_defect_type: ai, final_defect_type: final, count: v.count, system_type: v.system_type };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const buckets: ConfidenceBucket[] = [
    { label: '0% — AI failed', count: 0, min: 0, max: 0 },
    { label: '1–49% — Low', count: 0, min: 1, max: 49 },
    { label: '50–69% — Medium', count: 0, min: 50, max: 69 },
    { label: '70–89% — Good', count: 0, min: 70, max: 89 },
    { label: '90–100% — High', count: 0, min: 90, max: 100 },
  ];
  for (const item of items) {
    const c = item.confidence ?? 0;
    for (const b of buckets) {
      if (c >= b.min && c <= b.max) { b.count++; break; }
    }
  }

  const activityMap = new Map<string, { findings: number; overrides: number; reports: Set<string> }>();
  for (const item of items) {
    const date = item.created_at?.slice(0, 10) ?? '';
    if (!date) continue;
    const entry = activityMap.get(date) ?? { findings: 0, overrides: 0, reports: new Set() };
    entry.findings++;
    if (item.inspector_override || item.defect_type_override) entry.overrides++;
    if (item.report_id) entry.reports.add(item.report_id);
    activityMap.set(date, entry);
  }
  const dailyActivity: DailyActivity[] = Array.from(activityMap.entries())
    .map(([date, v]) => ({ date, findings: v.findings, overrides: v.overrides, reports: v.reports.size }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const mostOverriddenTypes = defectDistribution
    .filter((d) => d.count >= 2)
    .map((d) => ({
      defect_type: d.defect_type,
      override_rate: d.count ? Math.round((d.override_count / d.count) * 100) : 0,
      count: d.count,
    }))
    .sort((a, b) => b.override_rate - a.override_rate)
    .slice(0, 8);

  return {
    summary: {
      totalReports,
      totalFindings,
      totalEvidencePhotos,
      totalOverrides,
      avgConfidence,
      aiSuccessRate,
      overrideRate,
      findingsPerReport,
      evidencePerFinding,
    },
    severityBreakdown,
    defectDistribution,
    overridePatterns,
    confidenceBuckets: buckets,
    dailyActivity,
    mostOverriddenTypes,
  };
}
