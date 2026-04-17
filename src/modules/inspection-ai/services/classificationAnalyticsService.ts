import { supabase } from '../../../lib/supabase';
import type { ImageCategory, ImageCategorySource } from '../types';

export interface CategoryStat {
  category: ImageCategory;
  count: number;
  avg_confidence: number | null;
  override_count: number;
}

export interface ClassificationStats {
  total_images: number;
  ai_classified: number;
  manually_overridden: number;
  pending: number;
  avg_confidence: number | null;
  ai_correction_rate: number;
  manual_override_rate: number;
  by_category: CategoryStat[];
  worst_categories: CategoryStat[];
}

export interface DisagreementRow {
  id: string;
  drawing_id: string;
  heuristic_category: string | null;
  ai_category: string;
  ai_confidence: number | null;
  ai_source: string;
  agreed: boolean;
  created_at: string;
}

export interface CorrectionRow {
  id: string;
  drawing_id: string;
  drawing_name: string;
  heuristic_category: string | null;
  ai_category: string | null;
  original_category: string;
  original_source: string;
  original_confidence: number | null;
  manual_category: string;
  corrected_by: string;
  created_at: string;
}

export async function fetchClassificationStats(): Promise<ClassificationStats> {
  const { data, error } = await supabase.rpc('get_image_classification_stats');
  if (error) throw new Error(error.message);
  return data as ClassificationStats;
}

export async function fetchRecentDisagreements(limit = 50): Promise<DisagreementRow[]> {
  const { data, error } = await supabase
    .from('image_classification_disagreements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as DisagreementRow[];
}

export async function exportMonthlyCorrections(
  year: number,
  month: number
): Promise<CorrectionRow[]> {
  const { data, error } = await supabase.rpc('export_classification_corrections_csv', {
    p_year: year,
    p_month: month,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as CorrectionRow[];
}

export function convertToCSV(rows: CorrectionRow[]): string {
  if (rows.length === 0) return '';
  const headers = [
    'id',
    'drawing_id',
    'drawing_name',
    'heuristic_category',
    'ai_category',
    'original_category',
    'original_source',
    'original_confidence',
    'manual_category',
    'corrected_by',
    'created_at',
  ];

  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = [
    headers.join(','),
    ...rows.map(r =>
      headers.map(h => escape((r as Record<string, unknown>)[h])).join(',')
    ),
  ];
  return lines.join('\n');
}

export async function logDisagreement(
  drawingId: string,
  heuristicCategory: ImageCategory | null,
  aiCategory: ImageCategory,
  aiConfidence: number,
  aiSource: ImageCategorySource
): Promise<void> {
  const agreed = heuristicCategory === aiCategory;
  await supabase.from('image_classification_disagreements').insert({
    drawing_id: drawingId,
    heuristic_category: heuristicCategory,
    ai_category: aiCategory,
    ai_confidence: aiConfidence,
    ai_source: aiSource,
    agreed,
  });
}
