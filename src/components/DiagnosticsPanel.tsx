/**
 * Diagnostics Panel Component
 *
 * Shows detailed workflow state, events, and system information
 * Essential for debugging workflow issues
 */

import { useState, useEffect } from 'react';
import { X, RefreshCw, Bug, Check, AlertCircle } from 'lucide-react';
import { useWorkflow } from '../contexts/WorkflowContext';
import { useAuth } from '../contexts/AuthContext';

interface DiagnosticsPanelProps {
  projectId: string;
  onClose: () => void;
}

export default function DiagnosticsPanel({ projectId, onClose }: DiagnosticsPanelProps) {
  const { workflowState, diagnostics, loading, error, refreshState, loadDiagnostics } = useWorkflow();
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshState();
    await loadDiagnostics();
    setLastRefresh(new Date());
    setRefreshing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/20 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Workflow Diagnostics</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh diagnostics"
            >
              <RefreshCw className={`w-4 h-4 text-blue-300 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-300">Error Loading Diagnostics</div>
                  <div className="text-sm text-red-200 mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Workflow State */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              Workflow State
            </h3>
            {workflowState ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-400">Documents</div>
                  <div className="text-white font-medium">{workflowState.documents_count}</div>
                </div>
                <div>
                  <div className="text-slate-400">Loading Items</div>
                  <div className="text-white font-medium">{workflowState.loading_items_count}</div>
                </div>
                <div>
                  <div className="text-slate-400">Members</div>
                  <div className="text-white font-medium">{workflowState.members_count}</div>
                </div>
                <div>
                  <div className="text-slate-400">Drawings</div>
                  <div className="text-white font-medium">{workflowState.drawings_count}</div>
                </div>
                <div>
                  <div className="text-slate-400">Pins</div>
                  <div className="text-white font-medium">{workflowState.pins_count}</div>
                </div>
                <div>
                  <div className="text-slate-400">Inspections</div>
                  <div className="text-white font-medium">{workflowState.inspections_count}</div>
                </div>
                <div>
                  <div className="text-slate-400">NCRs</div>
                  <div className="text-white font-medium">{workflowState.ncr_count}</div>
                </div>
                <div>
                  <div className="text-slate-400">Last Updated</div>
                  <div className="text-white font-medium text-xs">
                    {new Date(workflowState.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400">Loading...</div>
            )}

            {workflowState?.last_error && (
              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded">
                <div className="text-xs text-red-300 font-medium">Last Error</div>
                <div className="text-xs text-red-200 mt-1">{workflowState.last_error}</div>
                <div className="text-xs text-red-200/70 mt-1">
                  {new Date(workflowState.last_error_at!).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Raw Table Counts */}
          {diagnostics?.raw_counts && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Raw Database Counts</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(diagnostics.raw_counts).map(([table, count]) => (
                  <div key={table} className="flex justify-between">
                    <span className="text-slate-400">{table}:</span>
                    <span className="text-white font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Events */}
          {diagnostics?.recent_events && diagnostics.recent_events.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Recent Events</h3>
              <div className="space-y-2">
                {diagnostics.recent_events.map((event) => (
                  <div key={event.id} className="p-2 bg-white/5 rounded border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-blue-300">{event.event_type}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    {Object.keys(event.payload).length > 0 && (
                      <div className="text-xs text-slate-300 mt-1 font-mono">
                        {JSON.stringify(event.payload, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Profile */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Current User</h3>
            {profile ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-white">{profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Name:</span>
                  <span className="text-white">{profile.name || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Role:</span>
                  <span className="text-white font-medium">{profile.role}</span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400">Loading profile...</div>
            )}
          </div>

          {/* System Info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">System Information</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Project ID:</span>
                <span className="text-white font-mono">{projectId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Refresh:</span>
                <span className="text-white">{lastRefresh.toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connection:</span>
                <span className="text-green-400 font-medium">Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-white/5">
          <div className="text-xs text-slate-400">
            Diagnostics generated at {diagnostics ? new Date(diagnostics.generated_at).toLocaleString() : 'N/A'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
