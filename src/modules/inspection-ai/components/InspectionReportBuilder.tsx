import { useState } from 'react';
import {
  FileText, Filter, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, XCircle, Building2,
  MapPin, Calendar, Printer, X, Eye
} from 'lucide-react';
import type { WorkflowItem } from '../services/workflowService';
import type { InspectionAIProject } from '../types';

type ReportMode = 'full' | 'preliminary' | 'defects' | 'passed' | 'custom';

interface FilterOptions {
  severities: string[];
  statuses: string[];
  systemTypes: string[];
  searchText: string;
}

interface Props {
  project: InspectionAIProject;
  items: WorkflowItem[];
  onClose: () => void;
}

const SEVERITY_STYLES: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const STATUS_STYLES: Record<string, string> = {
  defect: 'bg-red-50 text-red-700 border-red-200',
  fail: 'bg-orange-50 text-orange-700 border-orange-200',
  pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  saved: 'bg-blue-50 text-blue-700 border-blue-200',
  reviewed: 'bg-slate-50 text-slate-700 border-slate-200',
  draft: 'bg-slate-50 text-slate-400 border-slate-200',
};

const STATUS_LABELS: Record<string, string> = {
  defect: 'Defect',
  fail: 'Fail',
  pass: 'Pass',
  saved: 'Saved',
  reviewed: 'Reviewed',
  draft: 'Draft',
};

function applyFilters(items: WorkflowItem[], mode: ReportMode, custom: FilterOptions): WorkflowItem[] {
  let filtered = items;
  if (mode === 'defects') filtered = items.filter(i => i.status === 'defect' || i.status === 'fail');
  if (mode === 'passed') filtered = items.filter(i => i.status === 'pass');
  if (mode === 'preliminary') filtered = items.filter(i => i.severity === 'High' || i.status === 'defect');
  if (mode === 'custom') {
    if (custom.severities.length > 0) filtered = filtered.filter(i => custom.severities.includes(i.severity));
    if (custom.statuses.length > 0) filtered = filtered.filter(i => custom.statuses.includes(i.status));
    if (custom.systemTypes.length > 0) filtered = filtered.filter(i => custom.systemTypes.includes(i.system_type));
    if (custom.searchText.trim()) {
      const q = custom.searchText.toLowerCase();
      filtered = filtered.filter(i =>
        `${i.defect_type} ${i.observation} ${i.location_level} ${i.location_description}`.toLowerCase().includes(q)
      );
    }
  }
  return filtered;
}

function ItemCard({ item }: { item: WorkflowItem }) {
  const [expanded, setExpanded] = useState(false);
  const effectiveSeverity = item.severity_override ?? item.severity;
  const effectiveDefect = item.defect_type_override ?? item.defect_type;
  const effectiveObs = item.observation_override ?? item.observation;

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          {String(item.item_number).padStart(2, '0')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${SEVERITY_STYLES[effectiveSeverity] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {effectiveSeverity}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${STATUS_STYLES[item.status] ?? ''}`}>
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
            {item.inspector_override && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Inspector override</span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-900 truncate">{effectiveDefect || 'Finding'}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{item.system_type} · {item.element_type} · {item.location_level || 'No location'}</p>
        </div>
        <div className="flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
          {item.image_url && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <img src={item.image_url} alt="Primary" className="w-full max-h-56 object-cover" />
            </div>
          )}

          {item.location_description && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">{item.location_description}</p>
            </div>
          )}

          {effectiveObs && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Observation</p>
              <p className="text-xs text-slate-700 leading-relaxed">{effectiveObs}</p>
            </div>
          )}

          {item.non_conformance && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Non-conformance</p>
              <p className="text-xs text-slate-700 leading-relaxed">{item.non_conformance}</p>
            </div>
          )}

          {item.recommendation && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Recommendation</p>
              <p className="text-xs text-slate-700 leading-relaxed">{item.recommendation}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Extent</p>
              <p className="text-xs font-semibold text-slate-700">{item.extent}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Confidence</p>
              <p className="text-xs font-semibold text-slate-700">{Math.round(item.confidence * 100)}%</p>
            </div>
            {item.location_grid && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Grid Ref</p>
                <p className="text-xs font-semibold text-slate-700">{item.location_grid}</p>
              </div>
            )}
            {item.inspector_name && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Inspector</p>
                <p className="text-xs font-semibold text-slate-700">{item.inspector_name}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStats({ items }: { items: WorkflowItem[] }) {
  const high = items.filter(i => (i.severity_override ?? i.severity) === 'High').length;
  const medium = items.filter(i => (i.severity_override ?? i.severity) === 'Medium').length;
  const defects = items.filter(i => i.status === 'defect' || i.status === 'fail').length;
  const passes = items.filter(i => i.status === 'pass').length;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
      {[
        { label: 'Total', value: items.length, color: 'text-slate-900' },
        { label: 'High', value: high, color: 'text-red-600' },
        { label: 'Medium', value: medium, color: 'text-amber-600' },
        { label: 'Defects', value: defects, color: 'text-orange-600' },
        { label: 'Pass', value: passes, color: 'text-emerald-600' },
      ].map(s => (
        <div key={s.label} className="text-center bg-white border border-slate-200 rounded-xl py-2.5">
          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

export function InspectionReportBuilder({ project, items, onClose }: Props) {
  const [mode, setMode] = useState<ReportMode>('full');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    severities: [],
    statuses: [],
    systemTypes: [],
    searchText: '',
  });

  const filtered = applyFilters(items, mode, filters);
  const allSystemTypes = Array.from(new Set(items.map(i => i.system_type).filter(Boolean)));

  function toggleFilter<K extends keyof FilterOptions>(key: K, value: string) {
    setFilters(prev => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  }

  const MODE_OPTIONS: { value: ReportMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'full', label: 'Full Report', icon: <FileText className="w-3.5 h-3.5" />, desc: 'All items' },
    { value: 'preliminary', label: 'Preliminary', icon: <AlertTriangle className="w-3.5 h-3.5" />, desc: 'High severity & defects' },
    { value: 'defects', label: 'Defects Only', icon: <XCircle className="w-3.5 h-3.5" />, desc: 'Failed items' },
    { value: 'passed', label: 'Passed Only', icon: <CheckCircle className="w-3.5 h-3.5" />, desc: 'Passed items' },
    { value: 'custom', label: 'Custom Filter', icon: <Filter className="w-3.5 h-3.5" />, desc: 'Choose criteria' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{project.project_name}</h2>
            <p className="text-[10px] text-slate-400">Inspection Report</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">{project.project_name}</h1>
                {project.client_name && (
                  <p className="text-sm text-slate-500 mt-0.5">{project.client_name}</p>
                )}
                {project.site_location && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <p className="text-xs text-slate-500">{project.site_location}</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <p className="text-xs text-slate-500">Report generated: {new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Report Type</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {MODE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setMode(opt.value); if (opt.value === 'custom') setShowFilters(true); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-xs font-semibold transition-all ${
                    mode === opt.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {mode === 'custom' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <button
                onClick={() => setShowFilters(v => !v)}
                className="flex items-center gap-2 text-xs font-bold text-slate-700"
              >
                <Filter className="w-3.5 h-3.5" />
                Filter Options
                {showFilters ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
              </button>

              {showFilters && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Severity</p>
                    <div className="flex gap-2 flex-wrap">
                      {['High', 'Medium', 'Low'].map(s => (
                        <button
                          key={s}
                          onClick={() => toggleFilter('severities', s)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                            filters.severities.includes(s) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Status</p>
                    <div className="flex gap-2 flex-wrap">
                      {['defect', 'fail', 'pass', 'saved', 'reviewed'].map(s => (
                        <button
                          key={s}
                          onClick={() => toggleFilter('statuses', s)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                            filters.statuses.includes(s) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {allSystemTypes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">System Type</p>
                      <div className="flex gap-2 flex-wrap">
                        {allSystemTypes.map(s => (
                          <button
                            key={s}
                            onClick={() => toggleFilter('systemTypes', s)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                              filters.systemTypes.includes(s) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Search</p>
                    <input
                      type="text"
                      value={filters.searchText}
                      onChange={e => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                      placeholder="Search defect type, observation, location…"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {filtered.length} item{filtered.length !== 1 ? 's' : ''} in report
              </p>
              {filtered.length !== items.length && (
                <p className="text-[10px] text-slate-400">{items.length - filtered.length} filtered out</p>
              )}
            </div>
            <SummaryStats items={filtered} />
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl py-10 text-center">
              <Eye className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-400">No items match the current filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-slate-400">
              This report was generated by BurnRate Pro Inspection AI.
              All findings should be reviewed by a qualified passive fire protection inspector.
              This report does not constitute a certificate of compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
