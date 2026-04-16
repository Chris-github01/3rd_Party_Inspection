import { supabase } from '../../../lib/supabase';
import type { InspectionAIItem, InspectionAIItemImage, InspectionAIProject, InspectionAIReport } from '../types';

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
  inspectorName: string,
  projectId?: string | null
): Promise<InspectionAIReport> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('inspection_ai_reports')
    .insert({
      project_name: projectName,
      inspector_name: inspectorName,
      user_id: userData.user.id,
      project_id: projectId ?? null,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create report: ${error.message}`);
  return data;
}

export async function updateReportStatus(
  reportId: string,
  status: 'draft' | 'completed'
): Promise<void> {
  const { error } = await supabase
    .from('inspection_ai_reports')
    .update({ status })
    .eq('id', reportId);

  if (error) throw new Error(`Failed to update report status: ${error.message}`);
}

export async function fetchProjectReports(projectId: string): Promise<InspectionAIReport[]> {
  const { data, error } = await supabase
    .from('inspection_ai_reports')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch project reports: ${error.message}`);
  return data || [];
}

export async function fetchAllProjects(): Promise<InspectionAIProject[]> {
  const { data, error } = await supabase
    .from('inspection_ai_projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch projects: ${error.message}`);
  return data || [];
}

export async function createProject(
  projectName: string,
  clientName: string,
  siteLocation: string
): Promise<InspectionAIProject> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('inspection_ai_projects')
    .insert({
      project_name: projectName,
      client_name: clientName,
      site_location: siteLocation,
      user_id: userData.user.id,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create project: ${error.message}`);
  return data;
}

export async function saveInspectionItem(
  item: Omit<InspectionAIItem, 'id' | 'created_at'> & { inspector_override?: boolean; annotated_image_url?: string | null }
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

export interface PortfolioProjectStat {
  project: InspectionAIProject;
  reportCount: number;
  totalFindings: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  lastInspectedAt: string | null;
  systemTypes: string[];
  defectTypes: string[];
  hasInspectorOverrides: boolean;
}

export async function uploadEvidenceImage(
  file: File,
  itemId: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `evidence/${itemId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, { upsert: false, contentType: file.type });

  if (error) throw new Error(`Evidence upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

export async function addItemImage(
  itemId: string,
  imageUrl: string,
  caption: string,
  sortOrder: number
): Promise<InspectionAIItemImage> {
  const { data, error } = await supabase
    .from('inspection_ai_item_images')
    .insert({ item_id: itemId, image_url: imageUrl, caption, sort_order: sortOrder })
    .select()
    .single();

  if (error) throw new Error(`Failed to save evidence photo: ${error.message}`);
  return data;
}

export async function fetchItemImages(itemId: string): Promise<InspectionAIItemImage[]> {
  const { data, error } = await supabase
    .from('inspection_ai_item_images')
    .select('*')
    .eq('item_id', itemId)
    .order('sort_order')
    .order('created_at');

  if (error) throw new Error(`Failed to fetch evidence photos: ${error.message}`);
  return data || [];
}

export async function deleteItemImage(imageId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_ai_item_images')
    .delete()
    .eq('id', imageId);

  if (error) throw new Error(`Failed to delete evidence photo: ${error.message}`);
}

export async function fetchAllItemImages(
  itemIds: string[]
): Promise<InspectionAIItemImage[]> {
  if (itemIds.length === 0) return [];
  const { data, error } = await supabase
    .from('inspection_ai_item_images')
    .select('*')
    .in('item_id', itemIds)
    .order('sort_order')
    .order('created_at');

  if (error) throw new Error(`Failed to fetch evidence photos: ${error.message}`);
  return data || [];
}

export async function fetchPortfolioStats(): Promise<PortfolioProjectStat[]> {
  const { data: projects, error: pe } = await supabase
    .from('inspection_ai_projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (pe) throw new Error(pe.message);
  if (!projects || projects.length === 0) return [];

  const { data: reports, error: re } = await supabase
    .from('inspection_ai_reports')
    .select('id, project_id, created_at, status, item_count')
    .in('project_id', projects.map((p) => p.id))
    .order('created_at', { ascending: false });

  if (re) throw new Error(re.message);

  const reportIds = (reports || []).map((r) => r.id);
  let items: Array<{
    report_id: string;
    severity: string;
    system_type: string;
    defect_type: string;
    inspector_override: boolean;
  }> = [];

  if (reportIds.length > 0) {
    const { data: itemData, error: ie } = await supabase
      .from('inspection_ai_items')
      .select('report_id, severity, system_type, defect_type, inspector_override')
      .in('report_id', reportIds);

    if (!ie) items = itemData || [];
  }

  return (projects as InspectionAIProject[]).map((project) => {
    const projectReports = (reports || []).filter((r) => r.project_id === project.id);
    const projectReportIds = new Set(projectReports.map((r) => r.id));
    const projectItems = items.filter((i) => projectReportIds.has(i.report_id));

    return {
      project,
      reportCount: projectReports.length,
      totalFindings: projectItems.length,
      highCount: projectItems.filter((i) => i.severity === 'High').length,
      mediumCount: projectItems.filter((i) => i.severity === 'Medium').length,
      lowCount: projectItems.filter((i) => i.severity === 'Low').length,
      lastInspectedAt: projectReports[0]?.created_at ?? null,
      systemTypes: [...new Set(projectItems.map((i) => i.system_type).filter(Boolean))],
      defectTypes: [...new Set(projectItems.map((i) => i.defect_type).filter(Boolean))],
      hasInspectorOverrides: projectItems.some((i) => i.inspector_override),
    };
  });
}
