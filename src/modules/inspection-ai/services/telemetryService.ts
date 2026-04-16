import { supabase } from '../../../lib/supabase';

export interface TelemetryFilters {
  projectId?: string;
  systemType?: string;
  dateFrom?: string;
  dateTo?: string;
}

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
  tier1Count: number;
  tier2Count: number;
  escalationRate: number;
  avgLatencyTier1Ms: number;
  avgLatencyTier2Ms: number;
  estimatedCostSavedUsd: number;
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
  tier1: number;
  tier2: number;
}

export interface TierDailyPoint {
  date: string;
  tier1: number;
  tier2: number;
}

export interface OverrideTrendPoint {
  date: string;
  overrideRate: number;
  total: number;
}

export interface AutoEscalatedClass {
  defect_type: string;
  escalation_count: number;
  total_count: number;
  escalation_rate: number;
}

export interface TelemetryData {
  summary: TelemetrySummary;
  severityBreakdown: SeverityBreakdown;
  defectDistribution: DefectDistribution[];
  overridePatterns: OverridePattern[];
  confidenceBuckets: ConfidenceBucket[];
  dailyActivity: DailyActivity[];
  mostOverriddenTypes: { defect_type: string; override_rate: number; count: number }[];
  tierDailyBreakdown: TierDailyPoint[];
  overrideTrend: OverrideTrendPoint[];
  topAutoEscalatedClasses: AutoEscalatedClass[];
  availableProjects: { id: string; project_name: string }[];
  availableSystemTypes: string[];
}

const TIER1_COST_PER_1K = 0.00015;
const TIER2_COST_PER_1K = 0.005;
const AVG_INPUT_TOKENS = 1000;
const AVG_EXTRA_COST_TIER2 = ((TIER2_COST_PER_1K - TIER1_COST_PER_1K) * AVG_INPUT_TOKENS) / 1000;

function buildItemsQuery(filters?: TelemetryFilters) {
  let q = supabase
    .from('inspection_ai_items')
    .select(
      'id, defect_type, severity, confidence, inspector_override, defect_type_override, severity_override, report_id, created_at, tier_used, model_used, latency_ms, system_type'
    );
  if (filters?.systemType) q = q.eq('system_type', filters.systemType);
  if (filters?.dateFrom) q = q.gte('created_at', filters.dateFrom);
  if (filters?.dateTo) q = q.lte('created_at', `${filters.dateTo}T23:59:59`);
  return q;
}

export async function fetchTelemetry(filters?: TelemetryFilters): Promise<TelemetryData> {
  const [reportsRes, itemsRes, evidenceRes, overridesRes, projectsRes] = await Promise.all([
    supabase.from('inspection_ai_reports').select('id, project_id, created_at'),
    buildItemsQuery(filters),
    supabase.from('inspection_ai_item_images').select('id, item_id', { count: 'exact' }),
    supabase.from('inspection_ai_overrides').select(
      'ai_defect_type, final_defect_type, system_type, changed_fields, created_at'
    ),
    supabase.from('inspection_ai_projects').select('id, project_name').order('project_name'),
  ]);

  const reports = reportsRes.data ?? [];
  const items = itemsRes.data ?? [];
  const evidenceCount = evidenceRes.count ?? 0;
  const overrides = overridesRes.data ?? [];

  const filteredReportIds = filters?.projectId
    ? new Set(reports.filter((r) => r.project_id === filters.projectId).map((r) => r.id))
    : null;
  const visibleItems = filteredReportIds
    ? items.filter((i) => filteredReportIds.has(i.report_id))
    : items;

  const totalReports = filteredReportIds ? filteredReportIds.size : reports.length;
  const totalFindings = visibleItems.length;
  const totalEvidencePhotos = evidenceCount;
  const totalOverrides = overrides.length;

  const itemsWithAI = visibleItems.filter((i) => i.confidence > 0);
  const avgConfidence = itemsWithAI.length
    ? Math.round(itemsWithAI.reduce((s, i) => s + i.confidence, 0) / itemsWithAI.length)
    : 0;

  const overriddenItems = visibleItems.filter(
    (i) => i.inspector_override || i.defect_type_override || i.severity_override
  );
  const overrideRate = totalFindings ? Math.round((overriddenItems.length / totalFindings) * 100) : 0;
  const aiSuccessRate = totalFindings
    ? Math.round((visibleItems.filter((i) => i.confidence > 0).length / totalFindings) * 100)
    : 0;

  const findingsPerReport = totalReports ? Math.round((totalFindings / totalReports) * 10) / 10 : 0;
  const evidencePerFinding = totalFindings ? Math.round((totalEvidencePhotos / totalFindings) * 10) / 10 : 0;

  const tieredItems = visibleItems.filter((i) => i.tier_used === 1 || i.tier_used === 2);
  const tier1Items = tieredItems.filter((i) => i.tier_used === 1);
  const tier2Items = tieredItems.filter((i) => i.tier_used === 2);
  const tier1Count = tier1Items.length;
  const tier2Count = tier2Items.length;
  const escalationRate = tieredItems.length > 0 ? Math.round((tier2Count / tieredItems.length) * 100) : 0;

  const tier1WithLatency = tier1Items.filter((i) => (i.latency_ms ?? 0) > 0);
  const tier2WithLatency = tier2Items.filter((i) => (i.latency_ms ?? 0) > 0);
  const avgLatencyTier1Ms = tier1WithLatency.length
    ? Math.round(tier1WithLatency.reduce((s, i) => s + (i.latency_ms ?? 0), 0) / tier1WithLatency.length)
    : 0;
  const avgLatencyTier2Ms = tier2WithLatency.length
    ? Math.round(tier2WithLatency.reduce((s, i) => s + (i.latency_ms ?? 0), 0) / tier2WithLatency.length)
    : 0;

  const estimatedCostSavedUsd = Math.round(tier1Count * AVG_EXTRA_COST_TIER2 * 100) / 100;

  const severityBreakdown: SeverityBreakdown = { High: 0, Medium: 0, Low: 0 };
  for (const item of visibleItems) {
    const sev = item.severity_override ?? item.severity;
    if (sev === 'High') severityBreakdown.High++;
    else if (sev === 'Medium') severityBreakdown.Medium++;
    else if (sev === 'Low') severityBreakdown.Low++;
  }

  const defectMap = new Map<string, { count: number; overrides: number; confSum: number }>();
  for (const item of visibleItems) {
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
  for (const item of visibleItems) {
    const c = item.confidence ?? 0;
    for (const b of buckets) {
      if (c >= b.min && c <= b.max) { b.count++; break; }
    }
  }

  const activityMap = new Map<
    string,
    { findings: number; overrides: number; reports: Set<string>; tier1: number; tier2: number }
  >();
  for (const item of visibleItems) {
    const date = item.created_at?.slice(0, 10) ?? '';
    if (!date) continue;
    const entry = activityMap.get(date) ?? { findings: 0, overrides: 0, reports: new Set(), tier1: 0, tier2: 0 };
    entry.findings++;
    if (item.inspector_override || item.defect_type_override) entry.overrides++;
    if (item.report_id) entry.reports.add(item.report_id);
    if (item.tier_used === 1) entry.tier1++;
    if (item.tier_used === 2) entry.tier2++;
    activityMap.set(date, entry);
  }
  const dailyActivity: DailyActivity[] = Array.from(activityMap.entries())
    .map(([date, v]) => ({
      date,
      findings: v.findings,
      overrides: v.overrides,
      reports: v.reports.size,
      tier1: v.tier1,
      tier2: v.tier2,
    }))
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

  const tierDailyBreakdown: TierDailyPoint[] = dailyActivity
    .filter((d) => d.tier1 + d.tier2 > 0)
    .map((d) => ({ date: d.date, tier1: d.tier1, tier2: d.tier2 }));

  const overrideTrend: OverrideTrendPoint[] = dailyActivity
    .filter((d) => d.findings >= 3)
    .map((d) => ({
      date: d.date,
      overrideRate: Math.round((d.overrides / d.findings) * 100),
      total: d.findings,
    }));

  const escalationMap = new Map<string, { escalated: number; total: number }>();
  for (const item of visibleItems) {
    if (!item.defect_type) continue;
    const entry = escalationMap.get(item.defect_type) ?? { escalated: 0, total: 0 };
    entry.total++;
    if (item.tier_used === 2) entry.escalated++;
    escalationMap.set(item.defect_type, entry);
  }
  const topAutoEscalatedClasses: AutoEscalatedClass[] = Array.from(escalationMap.entries())
    .filter(([, v]) => v.total >= 3 && v.escalated > 0)
    .map(([defect_type, v]) => ({
      defect_type,
      escalation_count: v.escalated,
      total_count: v.total,
      escalation_rate: Math.round((v.escalated / v.total) * 100),
    }))
    .sort((a, b) => b.escalation_count - a.escalation_count)
    .slice(0, 8);

  const availableSystemTypes = Array.from(
    new Set(visibleItems.map((i) => (i.system_type as string) ?? '').filter(Boolean))
  ).sort();

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
      tier1Count,
      tier2Count,
      escalationRate,
      avgLatencyTier1Ms,
      avgLatencyTier2Ms,
      estimatedCostSavedUsd,
    },
    severityBreakdown,
    defectDistribution,
    overridePatterns,
    confidenceBuckets: buckets,
    dailyActivity,
    mostOverriddenTypes,
    tierDailyBreakdown,
    overrideTrend,
    topAutoEscalatedClasses,
    availableProjects: projectsRes.data ?? [],
    availableSystemTypes,
  };
}
