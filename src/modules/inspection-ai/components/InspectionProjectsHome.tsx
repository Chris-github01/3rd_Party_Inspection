import { useState, useEffect } from 'react';
import {
  Plus, Building2, MapPin, AlertTriangle, CheckCircle,
  Loader2, Search, ChevronRight, BarChart2, Clock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { InspectionAIProject } from '../types';
import type { ProjectSummary } from '../services/workflowService';
import { fetchProjectSummaries } from '../services/workflowService';

interface Props {
  onSelectProject: (project: InspectionAIProject, summary: ProjectSummary) => void;
  onNewInspection: () => void;
}

export function InspectionProjectsHome({ onSelectProject, onNewInspection }: Props) {
  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: ou } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (ou?.organization_id) {
        try {
          const s = await fetchProjectSummaries(ou.organization_id);
          setSummaries(s);
        } catch { /* ignore */ }
      }
      setLoading(false);
    }
    init();
  }, []);

  const filtered = summaries.filter(s =>
    `${s.project_name} ${s.client_name} ${s.site_location}`.toLowerCase().includes(query.toLowerCase())
  );

  const totalHigh = summaries.reduce((a, s) => a + (s.high_count ?? 0), 0);
  const totalDefects = summaries.reduce((a, s) => a + (s.defect_count ?? 0), 0);
  const totalItems = summaries.reduce((a, s) => a + (s.item_count ?? 0), 0);

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Inspection AI</h1>
            <p className="text-xs text-slate-500 mt-0.5">{summaries.length} project{summaries.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onNewInspection}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Inspection
          </button>
        </div>

        {summaries.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-slate-800/60 rounded-xl p-2.5 text-center border border-slate-700/50">
              <p className="text-lg font-bold text-white">{totalItems}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Findings</p>
            </div>
            <div className="bg-red-900/20 rounded-xl p-2.5 text-center border border-red-900/40">
              <p className="text-lg font-bold text-red-400">{totalHigh}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">High Severity</p>
            </div>
            <div className="bg-orange-900/20 rounded-xl p-2.5 text-center border border-orange-900/40">
              <p className="text-lg font-bold text-orange-400">{totalDefects}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Open Defects</p>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search projects…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <BarChart2 className="w-12 h-12 text-slate-800 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No projects yet</p>
            <p className="text-xs text-slate-600 mt-1 mb-4">Start by creating a new inspection project</p>
            <button
              onClick={onNewInspection}
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Inspection
            </button>
          </div>
        )}

        {filtered.map(s => {
          const progress = s.item_count > 0 ? Math.round((s.pass_count / s.item_count) * 100) : 0;
          const project: InspectionAIProject = {
            id: s.id,
            user_id: '',
            project_name: s.project_name,
            client_name: s.client_name,
            site_location: s.site_location,
            created_at: s.created_at,
          };
          return (
            <button
              key={s.id}
              onClick={() => onSelectProject(project, s)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left hover:border-slate-600 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-900/50 group-hover:bg-blue-900/50 transition-colors">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{s.project_name}</p>
                  {s.client_name && <p className="text-xs text-slate-400 mt-0.5 truncate">{s.client_name}</p>}
                  {s.site_location && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3 h-3 text-slate-600 flex-shrink-0" />
                      <p className="text-xs text-slate-600 truncate">{s.site_location}</p>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-1" />
              </div>

              {s.item_count > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progress >= 80 ? 'bg-emerald-500' : progress >= 40 ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">{progress}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                    <span>{s.item_count} items</span>
                    {s.high_count > 0 && (
                      <span className="flex items-center gap-0.5 text-red-400">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {s.high_count} high
                      </span>
                    )}
                    {s.defect_count > 0 && (
                      <span className="text-orange-400">{s.defect_count} defect{s.defect_count !== 1 ? 's' : ''}</span>
                    )}
                    {s.pass_count > 0 && (
                      <span className="flex items-center gap-0.5 text-emerald-400">
                        <CheckCircle className="w-2.5 h-2.5" />
                        {s.pass_count} passed
                      </span>
                    )}
                    {s.drawing_count > 0 && (
                      <span className="text-slate-600">{s.drawing_count} drawing{s.drawing_count !== 1 ? 's' : ''}</span>
                    )}
                    {s.last_inspection_at && (
                      <span className="flex items-center gap-0.5 text-slate-600 ml-auto">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(s.last_inspection_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
