import { useState, useEffect } from 'react';
import {
  Building2, MapPin, AlertTriangle, CheckCircle, XCircle,
  ChevronRight, FileText, Plus, BarChart2, Layers, Loader2,
  Calendar, User
} from 'lucide-react';
import type { InspectionAIProject } from '../types';
import type { WorkflowItem, ProjectSummary } from '../services/workflowService';
import { fetchProjectItems, fetchSessions } from '../services/workflowService';
import type { WorkflowSession } from '../services/workflowService';

interface Props {
  project: InspectionAIProject;
  summary: ProjectSummary | null;
  onAddInspection: () => void;
  onViewReport: (items: WorkflowItem[]) => void;
  onOpenDrawings: () => void;
  onBack: () => void;
}

function ProgressRing({ pct, size = 48, color = '#10b981' }: { pct: number; size?: number; color?: string }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

function StatTile({ label, value, icon: Icon, color = 'text-white', bg = 'bg-slate-800' }: {
  label: string; value: number; icon: any; color?: string; bg?: string;
}) {
  return (
    <div className={`rounded-2xl p-3.5 text-center border border-slate-700/50 ${bg}`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

export function ProjectWorkflowDashboard({ project, summary, onAddInspection, onViewReport, onOpenDrawings, onBack }: Props) {
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [sessions, setSessions] = useState<WorkflowSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [itemsData, sessionsData] = await Promise.all([
          fetchProjectItems(project.id),
          fetchSessions(project.id),
        ]);
        setItems(itemsData);
        setSessions(sessionsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [project.id]);

  const high = items.filter(i => (i.severity_override ?? i.severity) === 'High').length;
  const defects = items.filter(i => i.status === 'defect' || i.status === 'fail').length;
  const passes = items.filter(i => i.status === 'pass').length;
  const openItems = items.filter(i => i.status !== 'pass').length;
  const progressPct = items.length > 0 ? Math.round((passes / items.length) * 100) : 0;

  const recentItems = items.slice(-5).reverse();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-3">
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          All Projects
        </button>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-blue-900/40 rounded-2xl flex items-center justify-center flex-shrink-0 border border-blue-800/50">
            <Building2 className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-tight truncate">{project.project_name}</h1>
            {project.client_name && <p className="text-sm text-slate-400 mt-0.5 truncate">{project.client_name}</p>}
            {project.site_location && (
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3 h-3 text-slate-600 flex-shrink-0" />
                <p className="text-xs text-slate-500 truncate">{project.site_location}</p>
              </div>
            )}
          </div>
          <div className="relative flex-shrink-0">
            <ProgressRing pct={progressPct} size={48} color={progressPct >= 80 ? '#10b981' : progressPct >= 40 ? '#f59e0b' : '#3b82f6'} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{progressPct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        <div className="grid grid-cols-4 gap-2">
          <StatTile label="Items" value={items.length} icon={Layers} />
          <StatTile label="High" value={high} icon={AlertTriangle} color="text-red-400" bg="bg-red-900/20" />
          <StatTile label="Defects" value={defects} icon={XCircle} color="text-orange-400" bg="bg-orange-900/20" />
          <StatTile label="Passes" value={passes} icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-900/20" />
        </div>

        {items.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Severity Breakdown</p>
              <p className="text-xs text-slate-600">{openItems} open item{openItems !== 1 ? 's' : ''}</p>
            </div>
            {[
              { label: 'High', value: high, total: items.length, color: 'bg-red-500' },
              { label: 'Medium', value: items.filter(i => (i.severity_override ?? i.severity) === 'Medium').length, total: items.length, color: 'bg-amber-500' },
              { label: 'Low', value: items.filter(i => (i.severity_override ?? i.severity) === 'Low').length, total: items.length, color: 'bg-emerald-500' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-slate-500 w-14 flex-shrink-0">{s.label}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color}`}
                    style={{ width: s.total > 0 ? `${(s.value / s.total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{s.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onAddInspection}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-600 hover:bg-blue-500 transition-colors text-white"
          >
            <Plus className="w-6 h-6" />
            <p className="text-sm font-bold">New Inspection</p>
            <p className="text-[10px] text-blue-200">Add findings</p>
          </button>
          <button
            onClick={onOpenDrawings}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-colors text-white border border-slate-700"
          >
            <MapPin className="w-6 h-6 text-slate-400" />
            <p className="text-sm font-bold">Drawings</p>
            <p className="text-[10px] text-slate-500">
              {summary?.drawing_count ?? 0} uploaded
            </p>
          </button>
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onViewReport(items)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              <FileText className="w-5 h-5 text-slate-400" />
              <p className="text-[10px] font-bold text-white">Full Report</p>
            </button>
            <button
              onClick={() => onViewReport(items.filter(i => i.status === 'defect' || i.status === 'fail' || i.severity === 'High'))}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-[10px] font-bold text-white">Preliminary</p>
            </button>
            <button
              onClick={() => onViewReport(items.filter(i => i.status === 'defect' || i.status === 'fail'))}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              <XCircle className="w-5 h-5 text-orange-400" />
              <p className="text-[10px] font-bold text-white">Defects Only</p>
            </button>
          </div>
        )}

        {sessions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Inspection Sessions ({sessions.length})
            </p>
            <div className="space-y-2">
              {sessions.slice(0, 5).map(s => (
                <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-slate-600 flex-shrink-0" />
                      <p className="text-xs font-semibold text-slate-300 truncate">{s.inspector_name || 'Unknown inspector'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-600 flex-shrink-0" />
                      <p className="text-xs text-slate-500">
                        {new Date(s.started_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${
                    s.status === 'completed'
                      ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800'
                      : 'bg-amber-900/30 text-amber-400 border-amber-800'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Recent Findings</p>
            <div className="space-y-2">
              {recentItems.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {String(item.item_number).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-300 truncate">{(item.defect_type_override ?? item.defect_type) || 'Finding'}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 truncate">{item.system_type} · {item.location_level || 'No location'}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold flex-shrink-0 ${
                    (item.severity_override ?? item.severity) === 'High'
                      ? 'bg-red-900/30 text-red-400 border-red-800'
                      : (item.severity_override ?? item.severity) === 'Medium'
                        ? 'bg-amber-900/30 text-amber-400 border-amber-800'
                        : 'bg-emerald-900/30 text-emerald-400 border-emerald-800'
                  }`}>
                    {item.severity_override ?? item.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && sessions.length === 0 && (
          <div className="py-8 text-center">
            <BarChart2 className="w-12 h-12 text-slate-800 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No inspections yet</p>
            <p className="text-xs text-slate-600 mt-1">Start a new inspection to capture findings</p>
          </div>
        )}
      </div>
    </div>
  );
}
