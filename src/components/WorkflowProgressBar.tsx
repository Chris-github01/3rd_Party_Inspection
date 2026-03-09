import { CheckCircle2, Circle, Clock, FileText, List, Map, Users, ClipboardCheck, AlertTriangle, MapPin, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface WorkflowStage {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
  description: string;
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    route: '/projects',
    description: 'Upload loading schedules and drawings'
  },
  {
    id: 'loading_schedule',
    label: 'Loading Schedule',
    icon: List,
    route: '/projects',
    description: 'Parse and review fire protection data'
  },
  {
    id: 'site_manager',
    label: 'Site Manager',
    icon: Map,
    route: '/projects',
    description: 'Organize by blocks/levels and place pins'
  },
  {
    id: 'member_register',
    label: 'Member Register',
    icon: Users,
    route: '/projects',
    description: 'Register members with quantities'
  },
  {
    id: 'inspections',
    label: 'Inspections',
    icon: ClipboardCheck,
    route: '/projects',
    description: 'Conduct on-site inspections'
  },
  {
    id: 'ncrs',
    label: 'NCRs',
    icon: AlertTriangle,
    route: '/projects',
    description: 'Non-conformance reports'
  },
  {
    id: 'pin_corrections',
    label: 'Pin Corrections',
    icon: MapPin,
    route: '/projects',
    description: 'Review pin placements'
  },
  {
    id: 'exports',
    label: 'Exports',
    icon: Download,
    route: '/projects',
    description: 'Generate final reports'
  }
];

interface WorkflowProgressBarProps {
  projectId: string;
  currentStage?: string;
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  compact?: boolean;
}

interface ProjectStatus {
  documents_uploaded: boolean;
  loading_schedule_parsed: boolean;
  site_manager_configured: boolean;
  members_registered: boolean;
  inspections_started: boolean;
  has_ncrs: boolean;
  pin_corrections_reviewed: boolean;
  exports_generated: boolean;
}

export function WorkflowProgressBar({
  projectId,
  currentStage,
  orientation = 'horizontal',
  showLabels = true,
  compact = false
}: WorkflowProgressBarProps) {
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>({
    documents_uploaded: false,
    loading_schedule_parsed: false,
    site_manager_configured: false,
    members_registered: false,
    inspections_started: false,
    has_ncrs: false,
    pin_corrections_reviewed: false,
    exports_generated: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjectStatus();
  }, [projectId]);

  const loadProjectStatus = async () => {
    try {
      setLoading(true);

      // Check documents
      const { data: documents } = await supabase
        .from('documents')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      // Check loading schedule
      const { data: schedules } = await supabase
        .from('loading_schedule_imports')
        .select('id')
        .eq('project_id', projectId)
        .in('status', ['completed', 'needs_review'])
        .limit(1);

      // Check site manager (drawings with pins)
      const { data: pins } = await supabase
        .from('drawing_pins')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      // Check members
      const { data: members } = await supabase
        .from('members')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      // Check inspections
      const { data: inspections } = await supabase
        .from('inspections')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      // Check NCRs
      const { data: ncrs } = await supabase
        .from('ncrs')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      // Check pin corrections
      const { data: corrections } = await supabase
        .from('pin_corrections')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      // Check if any exports/reports generated (could check for report generation timestamps)
      const { data: project } = await supabase
        .from('projects')
        .select('updated_at')
        .eq('id', projectId)
        .single();

      setProjectStatus({
        documents_uploaded: (documents?.length || 0) > 0,
        loading_schedule_parsed: (schedules?.length || 0) > 0,
        site_manager_configured: (pins?.length || 0) > 0,
        members_registered: (members?.length || 0) > 0,
        inspections_started: (inspections?.length || 0) > 0,
        has_ncrs: (ncrs?.length || 0) > 0,
        pin_corrections_reviewed: (corrections?.length || 0) > 0,
        exports_generated: false // This could be enhanced with actual export tracking
      });
    } catch (error) {
      console.error('Error loading project status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageStatus = (stageId: string): 'completed' | 'active' | 'pending' => {
    if (currentStage === stageId) return 'active';

    const statusMap: Record<string, boolean> = {
      documents: projectStatus.documents_uploaded,
      loading_schedule: projectStatus.loading_schedule_parsed,
      site_manager: projectStatus.site_manager_configured,
      member_register: projectStatus.members_registered,
      inspections: projectStatus.inspections_started,
      ncrs: projectStatus.has_ncrs,
      pin_corrections: projectStatus.pin_corrections_reviewed,
      exports: projectStatus.exports_generated
    };

    return statusMap[stageId] ? 'completed' : 'pending';
  };

  const getStageColor = (status: 'completed' | 'active' | 'pending'): string => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'active':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      case 'pending':
        return 'text-slate-500 bg-slate-700/50 border-slate-600/50';
    }
  };

  const getConnectorColor = (fromStatus: 'completed' | 'active' | 'pending'): string => {
    return fromStatus === 'completed' ? 'bg-green-500/50' : 'bg-slate-600/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orientation === 'vertical') {
    return (
      <div className="space-y-2">
        {WORKFLOW_STAGES.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const Icon = stage.icon;
          const isLast = index === WORKFLOW_STAGES.length - 1;

          return (
            <div key={stage.id} className="relative">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${getStageColor(
                      status
                    )}`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : status === 'active' ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 h-12 mt-2 ${getConnectorColor(status)}`}
                    />
                  )}
                </div>

                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`font-medium ${
                        status === 'completed'
                          ? 'text-green-300'
                          : status === 'active'
                          ? 'text-blue-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {stage.label}
                    </h4>
                    {status === 'completed' && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full">
                        Done
                      </span>
                    )}
                    {status === 'active' && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  {showLabels && !compact && (
                    <p className="text-xs text-slate-500 mt-1">{stage.description}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center justify-between min-w-max px-4 py-6">
        {WORKFLOW_STAGES.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const Icon = stage.icon;
          const isLast = index === WORKFLOW_STAGES.length - 1;

          return (
            <div key={stage.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${getStageColor(
                    status
                  )}`}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : status === 'active' ? (
                    <Clock className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>

                {showLabels && (
                  <div className="mt-2 text-center" style={{ maxWidth: compact ? '80px' : '120px' }}>
                    <p
                      className={`text-sm font-medium ${
                        status === 'completed'
                          ? 'text-green-300'
                          : status === 'active'
                          ? 'text-blue-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {stage.label}
                    </p>
                    {!compact && (
                      <p className="text-xs text-slate-500 mt-1">{stage.description}</p>
                    )}
                  </div>
                )}
              </div>

              {!isLast && (
                <div className="flex items-center mx-2" style={{ width: compact ? '40px' : '60px' }}>
                  <div className={`h-0.5 w-full ${getConnectorColor(status)}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
