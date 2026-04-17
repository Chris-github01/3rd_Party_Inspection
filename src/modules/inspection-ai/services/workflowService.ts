import { supabase } from '../../../lib/supabase';
import type { InspectionAIProject } from '../types';

export interface WorkflowSession {
  id: string;
  organization_id: string;
  project_id: string;
  block_id: string | null;
  level_id: string | null;
  inspector_name: string;
  status: 'draft' | 'completed';
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface WorkflowItem {
  id: string;
  organization_id: string;
  project_id: string;
  session_id: string | null;
  drawing_pin_id: string | null;
  drawing_id: string | null;
  item_number: number;
  system_type: string;
  element_type: string;
  environment: string;
  observed_concern: string;
  is_new_install: boolean;
  location_level: string;
  location_grid: string;
  location_description: string;
  extent: string;
  image_url: string | null;
  ai_result: Record<string, unknown> | null;
  defect_type: string;
  severity: string;
  observation: string;
  non_conformance: string;
  recommendation: string;
  risk: string;
  confidence: number;
  defect_type_override: string | null;
  severity_override: string | null;
  observation_override: string | null;
  inspector_override: boolean;
  status: 'draft' | 'saved' | 'reviewed' | 'pass' | 'fail' | 'defect';
  annotated_image_url: string | null;
  inspector_name: string;
  created_at: string;
  updated_at: string;
  evidence_photos?: EvidencePhoto[];
}

export interface EvidencePhoto {
  id: string;
  item_id: string;
  image_url: string;
  caption: string;
  sort_order: number;
  created_at: string;
}

export interface ProjectSummary {
  id: string;
  organization_id: string;
  project_name: string;
  client_name: string;
  site_location: string;
  created_at: string;
  block_count: number;
  level_count: number;
  drawing_count: number;
  item_count: number;
  high_count: number;
  defect_count: number;
  pass_count: number;
  last_inspection_at: string | null;
}

export async function fetchProjectSummaries(organizationId: string): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from('inspection_project_summary')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectSummary[];
}

export async function createSession(payload: {
  organization_id: string;
  project_id: string;
  block_id?: string | null;
  level_id?: string | null;
  inspector_name: string;
}): Promise<WorkflowSession> {
  const { data, error } = await supabase
    .from('inspection_sessions')
    .insert({ ...payload, status: 'draft' })
    .select()
    .single();
  if (error) throw error;
  return data as WorkflowSession;
}

export async function completeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('inspection_sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function getNextItemNumber(projectId: string): Promise<number> {
  const { data } = await supabase
    .from('inspection_workflow_items')
    .select('item_number')
    .eq('project_id', projectId)
    .order('item_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.item_number ?? 0) as number) + 1;
}

export async function saveWorkflowItem(payload: Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at' | 'evidence_photos'>): Promise<WorkflowItem> {
  const { data, error } = await supabase
    .from('inspection_workflow_items')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as WorkflowItem;
}

export async function updateWorkflowItem(id: string, patch: Partial<WorkflowItem>): Promise<void> {
  const { error } = await supabase
    .from('inspection_workflow_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchProjectItems(projectId: string): Promise<WorkflowItem[]> {
  const { data, error } = await supabase
    .from('inspection_workflow_items')
    .select('*')
    .eq('project_id', projectId)
    .order('item_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowItem[];
}

export async function uploadEvidencePhoto(
  itemId: string,
  organizationId: string,
  file: File,
  caption: string,
  sortOrder: number,
): Promise<EvidencePhoto> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `evidence/${organizationId}/${itemId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('inspection-ai-images')
    .upload(path, file, { upsert: false });
  if (upErr) throw upErr;

  const { data: urlData } = supabase.storage.from('inspection-ai-images').getPublicUrl(path);
  const imageUrl = urlData.publicUrl;

  const { data, error } = await supabase
    .from('inspection_evidence_photos')
    .insert({ item_id: itemId, organization_id: organizationId, image_url: imageUrl, caption, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as EvidencePhoto;
}

export async function fetchEvidencePhotos(itemId: string): Promise<EvidencePhoto[]> {
  const { data, error } = await supabase
    .from('inspection_evidence_photos')
    .select('*')
    .eq('item_id', itemId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EvidencePhoto[];
}

export async function deleteEvidencePhoto(id: string): Promise<void> {
  const { error } = await supabase.from('inspection_evidence_photos').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchSessionItems(sessionId: string): Promise<WorkflowItem[]> {
  const { data, error } = await supabase
    .from('inspection_workflow_items')
    .select('*')
    .eq('session_id', sessionId)
    .order('item_number', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowItem[];
}

export async function fetchSessions(projectId: string): Promise<WorkflowSession[]> {
  const { data, error } = await supabase
    .from('inspection_sessions')
    .select('*')
    .eq('project_id', projectId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkflowSession[];
}

export async function createInspectionProject(payload: {
  organization_id: string;
  project_name: string;
  client_name: string;
  site_location: string;
  user_id: string;
}): Promise<InspectionAIProject> {
  const { data, error } = await supabase
    .from('inspection_ai_projects')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as InspectionAIProject;
}

export async function fetchOrgProjects(organizationId: string): Promise<InspectionAIProject[]> {
  const { data, error } = await supabase
    .from('inspection_ai_projects')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InspectionAIProject[];
}
