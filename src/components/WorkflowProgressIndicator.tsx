import { CheckCircle2, Circle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface WorkflowProgressIndicatorProps {
  projectId: string;
}

interface WorkflowCompletion {
  total: number;
  completed: number;
  percentage: number;
}

export function WorkflowProgressIndicator({ projectId }: WorkflowProgressIndicatorProps) {
  const [completion, setCompletion] = useState<WorkflowCompletion>({
    total: 8,
    completed: 0,
    percentage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompletion();
  }, [projectId]);

  const loadCompletion = async () => {
    try {
      setLoading(true);
      let completedCount = 0;

      // Check each workflow stage
      const checks = await Promise.all([
        // Documents
        supabase.from('documents').select('id').eq('project_id', projectId).limit(1),
        // Loading Schedule
        supabase.from('loading_schedule_imports').select('id').eq('project_id', projectId).in('status', ['completed', 'needs_review']).limit(1),
        // Site Manager (pins)
        supabase.from('drawing_pins').select('id').eq('project_id', projectId).limit(1),
        // Members
        supabase.from('members').select('id').eq('project_id', projectId).limit(1),
        // Inspections
        supabase.from('inspections').select('id').eq('project_id', projectId).limit(1),
        // NCRs
        supabase.from('ncrs').select('id').eq('project_id', projectId).limit(1),
        // Pin Corrections
        supabase.from('pin_corrections').select('id').eq('project_id', projectId).limit(1),
        // Inspection Readings (proxy for exports readiness)
        supabase.from('inspection_readings').select('id').eq('project_id', projectId).limit(1)
      ]);

      completedCount = checks.filter(({ data }) => (data?.length || 0) > 0).length;

      const percentage = Math.round((completedCount / 8) * 100);

      setCompletion({
        total: 8,
        completed: completedCount,
        percentage
      });
    } catch (error) {
      console.error('Error loading workflow completion:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg border border-slate-600/50">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Loading...</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (completion.percentage === 100) return 'text-green-400 bg-green-500/20 border-green-500/50';
    if (completion.percentage >= 50) return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
    if (completion.percentage > 0) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
    return 'text-slate-400 bg-slate-700/50 border-slate-600/50';
  };

  const getStatusIcon = () => {
    if (completion.percentage === 100) return <CheckCircle2 className="w-4 h-4" />;
    return <Circle className="w-4 h-4" />;
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor()}`}>
      {getStatusIcon()}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">
            {completion.completed}/{completion.total} Stages
          </span>
          <span className="text-xs opacity-75">({completion.percentage}%)</span>
        </div>
        <div className="w-32 h-1 bg-slate-700/50 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full transition-all duration-500 ${
              completion.percentage === 100
                ? 'bg-green-500'
                : completion.percentage >= 50
                ? 'bg-blue-500'
                : 'bg-yellow-500'
            }`}
            style={{ width: `${completion.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
