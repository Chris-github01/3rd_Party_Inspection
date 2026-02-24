/**
 * Deterministic Workflow Engine
 *
 * Single source of truth for workflow state based on project_workflow_state table
 * No circular dependencies - Documents and Loading Schedule always accessible
 */

export interface WorkflowState {
  project_id: string;
  documents_count: number;
  loading_items_count: number;
  members_count: number;
  drawings_count: number;
  pins_count: number;
  inspections_count: number;
  ncr_count: number;
  last_import_at: string | null;
  last_member_create_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface WorkflowEvent {
  id: string;
  project_id: string;
  user_id: string | null;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface WorkflowDiagnostics {
  workflow_state: WorkflowState | null;
  recent_events: WorkflowEvent[];
  raw_counts: {
    documents: number;
    loading_schedule_imports: number;
    loading_schedule_items: number;
    members: number;
    drawings: number;
    drawing_pins: number;
    inspections: number;
    ncrs: number;
    blocks: number;
    levels: number;
  };
  generated_at: string;
}

export type WorkflowStepId =
  | 'documents'
  | 'loading-schedule'
  | 'site-manager'
  | 'members'
  | 'inspections'
  | 'ncrs'
  | 'exports'
  | 'site-mode';

export interface WorkflowStep {
  id: WorkflowStepId;
  title: string;
  description: string;
  isAccessible: (state: WorkflowState) => boolean;
  isReady: (state: WorkflowState) => boolean;
  getWarnings: (state: WorkflowState) => string[];
  getActions: (state: WorkflowState) => WorkflowAction[];
}

export interface WorkflowAction {
  label: string;
  target: WorkflowStepId | null;
  action?: () => void;
}

/**
 * Workflow Step Definitions
 *
 * NO CIRCULAR DEPENDENCIES:
 * - Documents: Always accessible
 * - Loading Schedule: Always accessible
 * - Others: May warn but still accessible
 */
export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'documents',
    title: 'Documents',
    description: 'Upload project documents and drawings',
    isAccessible: () => true, // Always accessible
    isReady: (state) => state.documents_count > 0,
    getWarnings: (state) => {
      const warnings: string[] = [];
      if (state.documents_count === 0) {
        warnings.push('No documents uploaded yet');
      }
      if (state.drawings_count === 0) {
        warnings.push('No drawings uploaded - required for Site Manager');
      }
      return warnings;
    },
    getActions: (state) => {
      if (state.documents_count === 0) {
        return [{ label: 'Upload Documents', target: null }];
      }
      return [];
    }
  },

  {
    id: 'loading-schedule',
    title: 'Loading Schedule',
    description: 'Import fire protection loading schedule',
    isAccessible: () => true, // Always accessible - NO BLOCKING
    isReady: (state) => state.loading_items_count > 0 && state.members_count > 0,
    getWarnings: (state) => {
      const warnings: string[] = [];
      if (state.loading_items_count === 0) {
        warnings.push('No loading schedule imported yet');
      } else if (state.members_count === 0) {
        warnings.push(`${state.loading_items_count} items imported but not approved - click "Approve & Create Member Register"`);
      }
      return warnings;
    },
    getActions: (state) => {
      if (state.loading_items_count === 0) {
        return [{ label: 'Upload Loading Schedule', target: null }];
      }
      if (state.members_count === 0) {
        return [{ label: 'Approve & Create Members', target: null }];
      }
      return [];
    }
  },

  {
    id: 'site-manager',
    title: 'Site Manager',
    description: 'Configure blocks, levels, and pin members to drawings',
    isAccessible: () => true, // Always accessible but may warn
    isReady: (state) => state.drawings_count > 0 && state.pins_count > 0,
    getWarnings: (state) => {
      const warnings: string[] = [];
      if (state.drawings_count === 0) {
        warnings.push('No drawings uploaded - upload in Documents tab');
      }
      if (state.members_count === 0) {
        warnings.push('No members available - import loading schedule first');
      }
      if (state.pins_count === 0 && state.drawings_count > 0) {
        warnings.push('No members pinned to drawings yet');
      }
      return warnings;
    },
    getActions: (state) => {
      const actions: WorkflowAction[] = [];
      if (state.drawings_count === 0) {
        actions.push({ label: 'Go to Documents', target: 'documents' });
      }
      if (state.members_count === 0) {
        actions.push({ label: 'Import Loading Schedule', target: 'loading-schedule' });
      }
      return actions;
    }
  },

  {
    id: 'members',
    title: 'Member Register',
    description: 'Manage structural members',
    isAccessible: () => true, // Always accessible but may warn
    isReady: (state) => state.members_count > 0,
    getWarnings: (state) => {
      const warnings: string[] = [];
      if (state.members_count === 0) {
        warnings.push('No members in register - import loading schedule or add manually');
      }
      return warnings;
    },
    getActions: (state) => {
      if (state.members_count === 0) {
        return [
          { label: 'Import Loading Schedule', target: 'loading-schedule' },
          { label: 'Add Members Manually', target: null }
        ];
      }
      return [];
    }
  },

  {
    id: 'inspections',
    title: 'Inspections',
    description: 'Record field inspections and DFT readings',
    isAccessible: () => true, // Always accessible but may warn
    isReady: (state) => state.members_count > 0 && state.inspections_count > 0,
    getWarnings: (state) => {
      const warnings: string[] = [];
      if (state.members_count === 0) {
        warnings.push('No members available - create members first');
      }
      if (state.inspections_count === 0) {
        warnings.push('No inspections recorded yet');
      }
      return warnings;
    },
    getActions: (state) => {
      if (state.members_count === 0) {
        return [{ label: 'Go to Member Register', target: 'members' }];
      }
      return [];
    }
  },

  {
    id: 'ncrs',
    title: 'NCRs',
    description: 'Track non-conformance reports',
    isAccessible: () => true, // Always accessible
    isReady: (state) => state.members_count > 0,
    getWarnings: (state) => {
      const warnings: string[] = [];
      if (state.members_count === 0) {
        warnings.push('No members available - create members first');
      }
      return warnings;
    },
    getActions: (state) => {
      if (state.members_count === 0) {
        return [{ label: 'Go to Member Register', target: 'members' }];
      }
      return [];
    }
  },

  {
    id: 'exports',
    title: 'Exports',
    description: 'Generate PDF reports',
    isAccessible: () => true, // Always accessible but may warn
    isReady: (state) => state.inspections_count > 0 || state.ncr_count > 0,
    getWarnings: (state) => {
      const warnings: string[] = [];
      if (state.inspections_count === 0 && state.ncr_count === 0) {
        warnings.push('No inspections or NCRs recorded - limited report content');
      }
      return warnings;
    },
    getActions: (state) => {
      if (state.inspections_count === 0) {
        return [{ label: 'Go to Inspections', target: 'inspections' }];
      }
      return [];
    }
  },

  {
    id: 'site-mode',
    title: 'Site Mode',
    description: 'Mobile field inspection interface',
    isAccessible: () => true, // Always accessible
    isReady: (state) => state.members_count > 0 && state.drawings_count > 0,
    getWarnings: (state) => {
      const warnings: string[] = [];
      if (state.members_count === 0) {
        warnings.push('No members available - limited functionality');
      }
      if (state.drawings_count === 0) {
        warnings.push('No drawings uploaded - pins view unavailable');
      }
      return warnings;
    },
    getActions: (state) => {
      const actions: WorkflowAction[] = [];
      if (state.members_count === 0) {
        actions.push({ label: 'Import Loading Schedule', target: 'loading-schedule' });
      }
      if (state.drawings_count === 0) {
        actions.push({ label: 'Upload Drawings', target: 'documents' });
      }
      return actions;
    }
  }
];

/**
 * Get workflow step by ID
 */
export function getWorkflowStep(stepId: WorkflowStepId): WorkflowStep | undefined {
  return WORKFLOW_STEPS.find(step => step.id === stepId);
}

/**
 * Calculate overall workflow progress percentage
 */
export function calculateWorkflowProgress(state: WorkflowState): number {
  const steps = WORKFLOW_STEPS.filter(s => s.id !== 'site-mode'); // Exclude site-mode from progress
  const readySteps = steps.filter(step => step.isReady(state));
  return Math.round((readySteps.length / steps.length) * 100);
}

/**
 * Get next recommended action
 */
export function getNextRecommendedAction(state: WorkflowState): { step: WorkflowStep; action: WorkflowAction } | null {
  for (const step of WORKFLOW_STEPS) {
    if (!step.isReady(state)) {
      const actions = step.getActions(state);
      if (actions.length > 0) {
        return { step, action: actions[0] };
      }
    }
  }
  return null;
}
