import { supabase } from '../../../lib/supabase';

export interface BridgeProject {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string | null;
}

export interface BridgeClient {
  id: string;
  name: string;
}

export async function getProjects(): Promise<BridgeProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, client_id, clients(name)')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    client_id: row.client_id ?? null,
    client_name: (row.clients as { name?: string } | null)?.name ?? null,
  }));
}

export async function getClients(): Promise<BridgeClient[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, name: row.name }));
}

export async function getProject(id: string): Promise<BridgeProject | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, client_id, clients(name)')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    client_id: data.client_id ?? null,
    client_name: (data.clients as { name?: string } | null)?.name ?? null,
  };
}

export async function getClient(id: string): Promise<BridgeClient | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, name: data.name };
}
