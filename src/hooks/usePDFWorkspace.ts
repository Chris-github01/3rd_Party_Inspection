import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface PDFWorkspace {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  source_type: 'export' | 'upload' | 'generated';
  current_pdf_path: string;
  original_pdf_path: string;
  metadata: Record<string, any>;
  page_count: number;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface PDFOperation {
  id: string;
  workspace_id: string;
  operation_type: string;
  operation_data: Record<string, any>;
  result_pdf_path: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  sequence_number: number;
  can_undo: boolean;
  created_at: string;
  completed_at: string | null;
}

export function usePDFWorkspace(workspaceId: string | null) {
  const [workspace, setWorkspace] = useState<PDFWorkspace | null>(null);
  const [operations, setOperations] = useState<PDFOperation[]>([]);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('pdf_workspaces')
        .select('*')
        .eq('id', workspaceId)
        .maybeSingle();

      if (workspaceError) throw workspaceError;
      if (!workspaceData) throw new Error('Workspace not found');

      setWorkspace(workspaceData);

      await supabase
        .from('pdf_workspaces')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', workspaceId);

      const { data: pdfUrl } = await supabase.storage
        .from('pdf-workspaces')
        .createSignedUrl(workspaceData.current_pdf_path, 3600);

      if (pdfUrl) {
        setCurrentPdfUrl(pdfUrl.signedUrl);
      }

      const { data: operationsData, error: operationsError } = await supabase
        .from('pdf_operations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('sequence_number', { ascending: true });

      if (operationsError) throw operationsError;

      setOperations(operationsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
      console.error('Error loading workspace:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  const createWorkspace = useCallback(async (
    projectId: string,
    name: string,
    pdfFile: File,
    sourceType: 'export' | 'upload' | 'generated' = 'upload'
  ): Promise<PDFWorkspace | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${projectId}/${Date.now()}-${pdfFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('pdf-workspaces')
        .upload(fileName, pdfFile);

      if (uploadError) throw uploadError;

      const { data: newWorkspace, error: insertError } = await supabase
        .from('pdf_workspaces')
        .insert({
          project_id: projectId,
          user_id: user.id,
          name,
          source_type: sourceType,
          current_pdf_path: fileName,
          original_pdf_path: fileName,
          metadata: {
            original_filename: pdfFile.name,
            file_type: pdfFile.type,
          },
          page_count: 0,
          file_size_bytes: pdfFile.size,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setWorkspace(newWorkspace);
      return newWorkspace;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      console.error('Error creating workspace:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateWorkspacePDF = useCallback(async (
    newPdfBlob: Blob,
    operationType: string,
    operationData: Record<string, any>
  ): Promise<boolean> => {
    if (!workspace) return false;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${workspace.project_id}/${Date.now()}-updated.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('pdf-workspaces')
        .upload(fileName, newPdfBlob);

      if (uploadError) throw uploadError;

      const nextSequence = operations.length > 0
        ? Math.max(...operations.map(op => op.sequence_number)) + 1
        : 1;

      const { error: operationError } = await supabase
        .from('pdf_operations')
        .insert({
          workspace_id: workspace.id,
          operation_type: operationType,
          operation_data: operationData,
          result_pdf_path: fileName,
          status: 'completed',
          sequence_number: nextSequence,
          can_undo: true,
          completed_at: new Date().toISOString(),
        });

      if (operationError) throw operationError;

      const { error: updateError } = await supabase
        .from('pdf_workspaces')
        .update({
          current_pdf_path: fileName,
          file_size_bytes: newPdfBlob.size,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspace.id);

      if (updateError) throw updateError;

      await loadWorkspace();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace');
      console.error('Error updating workspace:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workspace, operations, loadWorkspace]);

  const deleteWorkspace = useCallback(async (): Promise<boolean> => {
    if (!workspace) return false;

    try {
      const { error: deleteError } = await supabase
        .from('pdf_workspaces')
        .delete()
        .eq('id', workspace.id);

      if (deleteError) throw deleteError;

      setWorkspace(null);
      setOperations([]);
      setCurrentPdfUrl(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
      console.error('Error deleting workspace:', err);
      return false;
    }
  }, [workspace]);

  useEffect(() => {
    if (workspaceId) {
      loadWorkspace();
    }
  }, [workspaceId, loadWorkspace]);

  return {
    workspace,
    operations,
    currentPdfUrl,
    isLoading,
    error,
    loadWorkspace,
    createWorkspace,
    updateWorkspacePDF,
    deleteWorkspace,
  };
}
