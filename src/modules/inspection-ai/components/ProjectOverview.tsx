import { useState, useEffect } from 'react';
import { FolderOpen, FileText, Calendar, Clock, ChevronRight, Plus, MapPin, Building2, ArrowLeft, CheckCircle, CreditCard as Edit3 } from 'lucide-react';
import { fetchProjectReports } from '../services/storageService';
import type { InspectionAIProject, InspectionAIReport } from '../types';
import { format } from 'date-fns';

function ReportStatusBadge({ status }: { status?: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3" />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <Edit3 className="w-3 h-3" />
      Draft
    </span>
  );
}

export function ProjectOverview({
  project,
  onBack,
  onOpenReport,
  onNewReport,
}: {
  project: InspectionAIProject;
  onBack: () => void;
  onOpenReport: (report: InspectionAIReport) => void;
  onNewReport: () => void;
}) {
  const [reports, setReports] = useState<InspectionAIReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectReports(project.id)
      .then(setReports)
      .finally(() => setLoading(false));
  }, [project.id]);

  const totalFindings = reports.reduce((acc, r) => acc + (r.item_count ?? 0), 0);
  const lastDate = reports[0]?.created_at
    ? format(new Date(reports[0].created_at), 'd MMM yyyy')
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Projects</span>
          </button>
          <p className="font-bold text-slate-900 text-sm truncate max-w-[160px]">
            {project.project_name}
          </p>
          <button
            onClick={onNewReport}
            className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Inspect
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-900 text-base leading-tight">
                {project.project_name}
              </h2>
              {(project.client_name || project.site_location) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  {project.client_name && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Building2 className="w-3.5 h-3.5" />
                      {project.client_name}
                    </span>
                  )}
                  {project.site_location && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {project.site_location}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{reports.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Sessions</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{totalFindings}</p>
              <p className="text-xs text-slate-500 mt-0.5">Findings</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-slate-900 leading-tight">
                {lastDate ?? '—'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Last Inspect</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Inspection Sessions
            </h3>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto mb-2" />
              Loading sessions…
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-600 text-sm">No inspections yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Start an inspection to capture findings for this project
              </p>
              <button
                onClick={onNewReport}
                className="inline-flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Start First Inspection
              </button>
            </div>
          ) : (
            reports.map((report) => (
              <button
                key={report.id}
                onClick={() => onOpenReport(report)}
                className="w-full bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:border-slate-400 transition-all active:scale-98 text-left"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-slate-900 text-sm">
                      {report.inspector_name}
                    </p>
                    <ReportStatusBadge status={report.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(report.created_at), 'd MMM yyyy')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {format(new Date(report.created_at), 'h:mm a')}
                    </span>
                    {(report.item_count ?? 0) > 0 && (
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {report.item_count} finding{report.item_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
