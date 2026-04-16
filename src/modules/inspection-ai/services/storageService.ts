import { supabase } from '../../../lib/supabase';
import type { InspectionAIItem, InspectionAIReport } from '../types';

const BUCKET = 'inspection-ai-images';

export async function uploadInspectionImage(
  file: File,
  reportId: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${reportId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, { upsert: false, contentType: file.type });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

export async function createReport(
  projectName: string,
  inspectorName: string
): Promise<InspectionAIReport> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('inspection_ai_reports')
    .insert({
      project_name: projectName,
      inspector_name: inspectorName,
      user_id: userData.user.id,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create report: ${error.message}`);
  return data;
}

export async function saveInspectionItem(
  item: Omit<InspectionAIItem, 'id' | 'created_at'>
): Promise<InspectionAIItem> {
  const { data, error } = await supabase
    .from('inspection_ai_items')
    .insert(item)
    .select()
    .single();

  if (error) throw new Error(`Failed to save item: ${error.message}`);
  return data;
}

export async function fetchReport(reportId: string): Promise<InspectionAIReport | null> {
  const { data, error } = await supabase
    .from('inspection_ai_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch report: ${error.message}`);
  return data;
}

export async function fetchReportItems(reportId: string): Promise<InspectionAIItem[]> {
  const { data, error } = await supabase
    .from('inspection_ai_items')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at');

  if (error) throw new Error(`Failed to fetch items: ${error.message}`);
  return data || [];
}

export async function fetchAllReports(): Promise<InspectionAIReport[]> {
  const { data, error } = await supabase
    .from('inspection_ai_reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
  return data || [];
}
