/**
 * Workflow Stepper Component
 *
 * Visual indicator of workflow progress with actionable next steps
 * Shows counts and readiness for each workflow step
 */

import { CheckCircle2, Circle, AlertCircle, ChevronRight } from 'lucide-react';
import { useWorkflow } from '../contexts/WorkflowContext';
import { WORKFLOW_STEPS, calculateWorkflowProgress, WorkflowStepId } from '../workflow/workflow';

interface WorkflowStepperProps {
  currentStep: WorkflowStepId;
  onNavigate: (stepId: WorkflowStepId) => void;
}

export default function WorkflowStepper({ currentStep, onNavigate }: WorkflowStepperProps) {
  const { workflowState, loading } = useWorkflow();

  if (loading || !workflowState) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-3/4"></div>
      </div>
    );
  }

  const progress = calculateWorkflowProgress(workflowState);
  const visibleSteps = WORKFLOW_STEPS.filter(s => s.id !== 'site-mode');

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Workflow Progress</span>
          <span className="text-sm font-bold text-blue-300">{progress}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {visibleSteps.map((step) => {
          const isReady = step.isReady(workflowState);
          const isCurrent = step.id === currentStep;
          const warnings = step.getWarnings(workflowState);
          const hasWarnings = warnings.length > 0;

          return (
            <button
              key={step.id}
              onClick={() => onNavigate(step.id)}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg border transition-all
                ${isCurrent
                  ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }
              `}
              title={warnings.join('\n')}
            >
              {/* Icon */}
              <div className="mb-2">
                {isReady ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : hasWarnings ? (
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-400" />
                )}
              </div>

              {/* Label */}
              <div className="text-xs font-medium text-white text-center mb-1">
                {step.title}
              </div>

              {/* Count Badge */}
              {step.id === 'documents' && (
                <div className="text-xs text-blue-300">{workflowState.documents_count}</div>
              )}
              {step.id === 'loading-schedule' && (
                <div className="text-xs text-blue-300">
                  {workflowState.loading_items_count > 0
                    ? `${workflowState.loading_items_count} items`
                    : 'None'}
                </div>
              )}
              {step.id === 'members' && (
                <div className="text-xs text-blue-300">{workflowState.members_count}</div>
              )}
              {step.id === 'site-manager' && (
                <div className="text-xs text-blue-300">
                  {workflowState.pins_count} pins
                </div>
              )}
              {step.id === 'inspections' && (
                <div className="text-xs text-blue-300">{workflowState.inspections_count}</div>
              )}
              {step.id === 'ncrs' && (
                <div className="text-xs text-blue-300">{workflowState.ncr_count}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Current Step Details */}
      {(() => {
        const step = WORKFLOW_STEPS.find(s => s.id === currentStep);
        if (!step) return null;

        const warnings = step.getWarnings(workflowState);
        const actions = step.getActions(workflowState);

        if (warnings.length === 0 && actions.length === 0) return null;

        return (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            {/* Warnings */}
            {warnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-amber-200 mb-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            ))}

            {/* Actions */}
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => action.target && onNavigate(action.target)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    {action.label}
                    {action.target && <ChevronRight className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
