/**
 * Workflow Context Provider
 *
 * Manages workflow state with real-time updates
 * Provides diagnostics and state refresh capabilities
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { WorkflowState, WorkflowDiagnostics } from '../workflow/workflow';

interface WorkflowContextType {
  workflowState: WorkflowState | null;
  diagnostics: WorkflowDiagnostics | null;
  loading: boolean;
  error: string | null;
  refreshState: () => Promise<void>;
  loadDiagnostics: () => Promise<void>;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children, projectId }: { children: ReactNode; projectId: string }) {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [diagnostics, setDiagnostics] = useState<WorkflowDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load workflow state
  const loadWorkflowState = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('project_workflow_state')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No state exists yet, trigger creation
          await supabase.rpc('recompute_project_workflow_state', { p_project_id: projectId });
          // Retry fetch
          const { data: retryData } = await supabase
            .from('project_workflow_state')
            .select('*')
            .eq('project_id', projectId)
            .single();
          setWorkflowState(retryData);
        } else {
          throw fetchError;
        }
      } else {
        setWorkflowState(data);
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to load workflow state:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Refresh state by calling RPC
  const refreshState = async () => {
    try {
      setLoading(true);
      await supabase.rpc('recompute_project_workflow_state', { p_project_id: projectId });
      await loadWorkflowState();
    } catch (err: any) {
      console.error('Failed to refresh workflow state:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load diagnostics
  const loadDiagnostics = async () => {
    try {
      const { data, error: diagError } = await supabase.rpc('get_workflow_diagnostics', {
        p_project_id: projectId
      });

      if (diagError) throw diagError;
      setDiagnostics(data);
    } catch (err: any) {
      console.error('Failed to load diagnostics:', err);
      setError(err.message);
    }
  };

  // Initial load
  useEffect(() => {
    loadWorkflowState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Subscribe to workflow state changes
  useEffect(() => {
    const channel = supabase
      .channel(`workflow-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_workflow_state',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Workflow state updated:', payload);
          if (payload.new) {
            setWorkflowState(payload.new as WorkflowState);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  return (
    <WorkflowContext.Provider
      value={{
        workflowState,
        diagnostics,
        loading,
        error,
        refreshState,
        loadDiagnostics
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
