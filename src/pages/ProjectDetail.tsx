import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, FileText, Users, ClipboardCheck, AlertTriangle, Download, Paperclip, Map, Smartphone, FileCheck, BookOpen, ListChecks, CheckCircle2, Circle, AlertCircle, MapPin } from 'lucide-react';
import { DocumentsTab } from '../components/DocumentsTab';
import { LoadingScheduleTab } from '../components/LoadingScheduleTab';
import { MembersTab } from '../components/MembersTab';
import { InspectionsTab } from '../components/InspectionsTab';
import { NCRsTab } from '../components/NCRsTab';
import { ExportsTab } from '../components/ExportsTab';
import { ExportAttachmentsTab } from '../components/ExportAttachmentsTab';
import { SiteManagerTab } from '../components/SiteManagerTab';
import { ExecutiveSummaryPreview } from '../components/ExecutiveSummaryPreview';
import { IntroductionPreview } from '../components/IntroductionPreview';
import { SoftLockPanel } from '../components/SoftLockPanel';
import { PinCorrectionsTab } from '../components/PinCorrectionsTab';

interface Project {
  id: string;
  name: string;
  client_name: string;
  main_contractor: string;
  site_address: string;
  project_ref: string;
  start_date: string;
  notes: string;
}

interface WorkflowState {
  documents_ready: boolean;
  drawings_ready: boolean;
  locations_ready: boolean;
  members_ready: boolean;
  workflow_ready: boolean;
  counts: {
    documents: number;
    drawings: number;
    pins: number;
    zones: number;
    members_with_locations: number;
  };
}

interface BlockingInfo {
  is_blocked: boolean;
  reasons: Array<{
    type: string;
    message: string;
    action: string;
  }>;
  state: WorkflowState;
}

type TabType = 'documents' | 'loading-schedule' | 'members' | 'inspections' | 'ncrs' | 'attachments' | 'exports' | 'site-manager' | 'executive-summary' | 'introduction' | 'pin-corrections';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [blockingInfo, setBlockingInfo] = useState<Record<string, BlockingInfo>>({});
  const [showStatusPanel, setShowStatusPanel] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject();
      loadWorkflowState();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowState = async () => {
    if (!id) return;

    try {
      // Calculate and get current workflow state
      const { data: stateData, error: stateError } = await supabase
        .rpc('calculate_project_workflow_state', { p_project_id: id });

      if (stateError) throw stateError;
      setWorkflowState(stateData);

      // Get blocking reasons for each tab
      const tabsToCheck = ['loading_schedule', 'site_manager', 'members', 'inspections', 'ncrs'];
      const blockingPromises = tabsToCheck.map(async (tabName) => {
        const { data, error } = await supabase
          .rpc('get_workflow_blocking_reasons', {
            p_project_id: id,
            p_tab_name: tabName
          });

        if (error) throw error;
        return { tabName, data };
      });

      const results = await Promise.all(blockingPromises);
      const blockingMap: Record<string, BlockingInfo> = {};
      results.forEach(({ tabName, data }) => {
        blockingMap[tabName] = data;
      });
      setBlockingInfo(blockingMap);
    } catch (error) {
      console.error('Error loading workflow state:', error);
    }
  };

  const handleTabAction = (action: string) => {
    // Map actions to tabs
    const actionToTab: Record<string, TabType> = {
      'Go to Documents': 'documents',
      'Upload Drawings': 'documents',
      'Go to Site Manager': 'site-manager',
      'Go to Member Register': 'members'
    };

    const targetTab = actionToTab[action];
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white/10 backdrop-blur-sm flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white/10 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Project not found</h2>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'documents' as TabType, label: 'Documents', icon: FileText },
    { id: 'loading-schedule' as TabType, label: 'Loading Schedule', icon: ListChecks },
    { id: 'site-manager' as TabType, label: 'Site Manager', icon: Map },
    { id: 'members' as TabType, label: 'Member Register', icon: Users },
    { id: 'inspections' as TabType, label: 'Inspections', icon: ClipboardCheck },
    { id: 'ncrs' as TabType, label: 'NCRs', icon: AlertTriangle },
    { id: 'pin-corrections' as TabType, label: 'Pin Corrections', icon: MapPin },
    { id: 'attachments' as TabType, label: 'Export Attachments', icon: Paperclip },
    { id: 'introduction' as TabType, label: 'Introduction', icon: BookOpen },
    { id: 'executive-summary' as TabType, label: 'Executive Summary', icon: FileCheck },
    { id: 'exports' as TabType, label: 'Exports', icon: Download },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-blue-100 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </button>

          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {workflowState && (
                  <button
                    onClick={() => setShowStatusPanel(!showStatusPanel)}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
                  >
                    {workflowState.workflow_ready ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    )}
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                      {workflowState.workflow_ready ? 'Workflow Active' : 'Workflow Incomplete'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => navigate(`/projects/${project.id}/site`)}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Smartphone className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm sm:text-base font-medium whitespace-nowrap">Site Mode</span>
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-blue-100">
              <span className="truncate max-w-full sm:max-w-none">Client: {project.client_name}</span>
              {project.main_contractor && <span className="truncate max-w-full sm:max-w-none">Contractor: {project.main_contractor}</span>}
              {project.project_ref && <span className="truncate max-w-full sm:max-w-none">Ref: {project.project_ref}</span>}
            </div>

            {/* Workflow Status Panel */}
            {showStatusPanel && workflowState && (
              <div className="mt-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Project Workflow Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    {workflowState.documents_ready ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs text-blue-100">Documents</div>
                      <div className="text-xs text-slate-300">
                        {workflowState.counts.documents} files
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {workflowState.drawings_ready ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs text-blue-100">Drawings</div>
                      <div className="text-xs text-slate-300">
                        {workflowState.counts.drawings} uploaded
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {workflowState.locations_ready ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs text-blue-100">Locations</div>
                      <div className="text-xs text-slate-300">
                        {workflowState.counts.pins + workflowState.counts.zones} configured
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {workflowState.members_ready ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs text-blue-100">Members</div>
                      <div className="text-xs text-slate-300">
                        {workflowState.counts.members_with_locations} assigned
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-1 border-b border-white/10 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 sm:px-4 py-3 min-h-[48px] border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-300'
                      : 'border-transparent text-blue-100 hover:text-white hover:border-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.length > 12 ? tab.label.substring(0, 10) + '...' : tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeTab === 'site-manager' ? (
        <div className="flex-1 overflow-hidden">
          {blockingInfo['site_manager']?.is_blocked ? (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
                  <SoftLockPanel
                    title="Spatial Mapping Unavailable"
                    reasons={blockingInfo['site_manager'].reasons}
                    onActionClick={handleTabAction}
                  />
                </div>
              </div>
            </div>
          ) : (
            <SiteManagerTab projectId={project.id} />
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
              {activeTab === 'documents' && <DocumentsTab projectId={project.id} />}

              {activeTab === 'loading-schedule' && (
                blockingInfo['loading_schedule']?.is_blocked ? (
                  <SoftLockPanel
                    title="Engineering Data Unavailable"
                    reasons={blockingInfo['loading_schedule'].reasons}
                    onActionClick={handleTabAction}
                  />
                ) : (
                  <LoadingScheduleTab projectId={project.id} />
                )
              )}

              {activeTab === 'members' && (
                blockingInfo['members']?.is_blocked ? (
                  <SoftLockPanel
                    title="Member Assignment Limited"
                    reasons={blockingInfo['members'].reasons}
                    onActionClick={handleTabAction}
                  />
                ) : (
                  <MembersTab projectId={project.id} />
                )
              )}

              {activeTab === 'inspections' && (
                blockingInfo['inspections']?.is_blocked ? (
                  <SoftLockPanel
                    title="Inspection Module Unavailable"
                    reasons={blockingInfo['inspections'].reasons}
                    onActionClick={handleTabAction}
                  />
                ) : (
                  <InspectionsTab projectId={project.id} />
                )
              )}

              {activeTab === 'ncrs' && (
                blockingInfo['ncrs']?.is_blocked ? (
                  <SoftLockPanel
                    title="NCR Module Unavailable"
                    reasons={blockingInfo['ncrs'].reasons}
                    onActionClick={handleTabAction}
                  />
                ) : (
                  <NCRsTab projectId={project.id} />
                )
              )}

              {activeTab === 'attachments' && <ExportAttachmentsTab projectId={project.id} />}
              {activeTab === 'pin-corrections' && <PinCorrectionsTab project={project} />}
              {activeTab === 'introduction' && <IntroductionPreview projectId={project.id} />}
              {activeTab === 'executive-summary' && <ExecutiveSummaryPreview projectId={project.id} />}
              {activeTab === 'exports' && <ExportsTab project={project} />}
            </div>          </div>
        </div>
      )}
    </div>
  );
}
