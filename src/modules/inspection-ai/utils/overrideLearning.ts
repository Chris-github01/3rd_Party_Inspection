import { supabase } from '../../../lib/supabase';
import type { AIAnalysisResult } from '../types';

export interface OverrideRecord {
  id: string;
  item_id: string;
  report_id: string;
  user_id: string;
  created_at: string;
  system_type: string;
  element_type: string;
  environment: string;
  observed_concern: string;
  v3_family_hint: string | null;
  ai_defect_type: string;
  ai_severity: string;
  ai_confidence: number;
  final_defect_type: string;
  final_severity: string;
  changed_fields: string[];
  notes: string | null;
}

export interface OverrideContext {
  systemType: string;
  elementType: string;
  environment: string;
  observedConcern: string;
  aiDefectType: string;
  aiSeverity: string;
  v3FamilyHint?: string | null;
}

export interface SimilarOverride {
  finalDefectType: string;
  finalSeverity: string;
  count: number;
  percentage: number;
}

export interface OverrideAdjustment {
  suggestedDefectType: string | null;
  suggestedSeverity: string | null;
  confidenceShift: number;
  matchCount: number;
  coachingNote: string | null;
}

export interface SaveOverrideInput {
  itemId: string;
  reportId: string;
  userId: string;
  systemType: string;
  elementType: string;
  environment: string;
  observedConcern: string;
  v3FamilyHint?: string | null;
  aiDefectType: string;
  aiSeverity: string;
  aiConfidence: number;
  finalDefectType: string;
  finalSeverity: string;
  changedFields: string[];
  notes?: string;
}

function contextMatchScore(candidate: OverrideRecord, ctx: OverrideContext): number {
  let score = 0;
  if (candidate.system_type === ctx.systemType) score += 3;
  if (candidate.element_type === ctx.elementType) score += 2;
  if (candidate.environment === ctx.environment) score += 1;
  if (candidate.observed_concern === ctx.observedConcern) score += 2;
  if (candidate.ai_defect_type === ctx.aiDefectType) score += 3;
  if (ctx.v3FamilyHint && candidate.v3_family_hint === ctx.v3FamilyHint) score += 2;
  return score;
}

export async function findSimilarOverrides(ctx: OverrideContext): Promise<OverrideRecord[]> {
  const { data, error } = await supabase
    .from('inspection_ai_overrides')
    .select('*')
    .eq('system_type', ctx.systemType)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !data) return [];

  const MIN_SCORE = 5;
  return (data as OverrideRecord[])
    .filter((r) => contextMatchScore(r, ctx) >= MIN_SCORE)
    .sort((a, b) => contextMatchScore(b, ctx) - contextMatchScore(a, ctx));
}

export function getRecommendedAdjustment(similar: OverrideRecord[]): OverrideAdjustment {
  if (similar.length === 0) {
    return { suggestedDefectType: null, suggestedSeverity: null, confidenceShift: 0, matchCount: 0, coachingNote: null };
  }

  const defectCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = {};

  for (const r of similar) {
    defectCounts[r.final_defect_type] = (defectCounts[r.final_defect_type] ?? 0) + 1;
    severityCounts[r.final_severity] = (severityCounts[r.final_severity] ?? 0) + 1;
  }

  const topDefect = Object.entries(defectCounts).sort((a, b) => b[1] - a[1])[0];
  const topSeverity = Object.entries(severityCounts).sort((a, b) => b[1] - a[1])[0];

  const total = similar.length;
  const topDefectPct = topDefect ? Math.round((topDefect[1] / total) * 100) : 0;
  const topSeverityPct = topSeverity ? Math.round((topSeverity[1] / total) * 100) : 0;

  const CONFIDENCE_THRESHOLD = 60;
  const suggestedDefectType = topDefectPct >= CONFIDENCE_THRESHOLD ? topDefect[0] : null;
  const suggestedSeverity = topSeverityPct >= CONFIDENCE_THRESHOLD ? topSeverity[0] : null;

  let confidenceShift = 0;
  if (suggestedDefectType) {
    if (total >= 10) confidenceShift = 12;
    else if (total >= 5) confidenceShift = 8;
    else if (total >= 2) confidenceShift = 4;
  }

  let coachingNote: string | null = null;
  if (suggestedDefectType && total >= 2) {
    const exampleFamilyHints = [...new Set(similar.map((r) => r.v3_family_hint).filter(Boolean))];
    const familyPart = exampleFamilyHints.length > 0
      ? ` in ${exampleFamilyHints[0]?.replace(/_/g, ' ')} systems`
      : '';
    coachingNote = `Senior inspectors have classified similar cases as ${suggestedDefectType}${familyPart} in ${total} prior correction${total !== 1 ? 's' : ''}.`;
  }

  return { suggestedDefectType, suggestedSeverity, confidenceShift, matchCount: total, coachingNote };
}

export function applyOverrideWeighting(result: AIAnalysisResult, adjustment: OverrideAdjustment): AIAnalysisResult {
  if (adjustment.matchCount === 0) return result;

  const newConfidence = Math.min(100, result.confidence + adjustment.confidenceShift);

  return {
    ...result,
    confidence: newConfidence,
    _v4SuggestedDefectType: adjustment.suggestedDefectType ?? undefined,
    _v4SuggestedSeverity: adjustment.suggestedSeverity ?? undefined,
    _v4MatchCount: adjustment.matchCount,
    _v4CoachingNote: adjustment.coachingNote ?? undefined,
    _v4ConfidenceShift: adjustment.confidenceShift,
  } as AIAnalysisResult & {
    _v4SuggestedDefectType?: string;
    _v4SuggestedSeverity?: string;
    _v4MatchCount?: number;
    _v4CoachingNote?: string;
    _v4ConfidenceShift?: number;
  };
}

export async function saveOverride(input: SaveOverrideInput): Promise<void> {
  const { error } = await supabase.from('inspection_ai_overrides').insert({
    item_id: input.itemId,
    report_id: input.reportId,
    user_id: input.userId,
    system_type: input.systemType,
    element_type: input.elementType,
    environment: input.environment,
    observed_concern: input.observedConcern,
    v3_family_hint: input.v3FamilyHint ?? null,
    ai_defect_type: input.aiDefectType,
    ai_severity: input.aiSeverity,
    ai_confidence: input.aiConfidence,
    final_defect_type: input.finalDefectType,
    final_severity: input.finalSeverity,
    changed_fields: input.changedFields,
    notes: input.notes ?? null,
  });

  if (error) {
    console.warn('[Brain v4] Override save failed (non-blocking):', error.message);
  }
}

export interface OverrideAnalytics {
  totalOverrides: number;
  topCorrectedFrom: Array<{ aiType: string; count: number; topCorrection: string }>;
  topCorrectedTo: Array<{ finalType: string; count: number }>;
  overrideRateBySystem: Array<{ system: string; count: number }>;
  recentOverrides: OverrideRecord[];
}

export async function fetchOverrideAnalytics(): Promise<OverrideAnalytics> {
  const { data, error } = await supabase
    .from('inspection_ai_overrides')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !data) {
    return { totalOverrides: 0, topCorrectedFrom: [], topCorrectedTo: [], overrideRateBySystem: [], recentOverrides: [] };
  }

  const records = data as OverrideRecord[];

  const fromMap: Record<string, { count: number; corrections: Record<string, number> }> = {};
  const toMap: Record<string, number> = {};
  const systemMap: Record<string, number> = {};

  for (const r of records) {
    if (!fromMap[r.ai_defect_type]) fromMap[r.ai_defect_type] = { count: 0, corrections: {} };
    fromMap[r.ai_defect_type].count++;
    fromMap[r.ai_defect_type].corrections[r.final_defect_type] =
      (fromMap[r.ai_defect_type].corrections[r.final_defect_type] ?? 0) + 1;

    toMap[r.final_defect_type] = (toMap[r.final_defect_type] ?? 0) + 1;
    systemMap[r.system_type] = (systemMap[r.system_type] ?? 0) + 1;
  }

  const topCorrectedFrom = Object.entries(fromMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([aiType, v]) => {
      const topCorrection = Object.entries(v.corrections).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      return { aiType, count: v.count, topCorrection };
    });

  const topCorrectedTo = Object.entries(toMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([finalType, count]) => ({ finalType, count }));

  const overrideRateBySystem = Object.entries(systemMap)
    .sort((a, b) => b[1] - a[1])
    .map(([system, count]) => ({ system, count }));

  return {
    totalOverrides: records.length,
    topCorrectedFrom,
    topCorrectedTo,
    overrideRateBySystem,
    recentOverrides: records.slice(0, 10),
  };
}
