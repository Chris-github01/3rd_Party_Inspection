import { useState, useEffect } from 'react';
import { CalendarDays, Users, Briefcase, Save, Plus, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Office {
  id: string;
  name: string;
  is_default: boolean;
}

interface WorkloadRow {
  id: string;
  office_id: string;
  week_start: string;
  inspector_count: number;
  available_days: number;
  max_jobs_per_week: number;
  booked_jobs: number;
  notes: string;
}

function isoMonday(offset = 0): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function formatWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CapacityBar({ booked, max }: { booked: number; max: number }) {
  const pct = max > 0 ? Math.min((booked / max) * 100, 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium w-8 text-right ${pct >= 90 ? 'text-red-400' : pct >= 70 ? 'text-amber-400' : 'text-slate-400'}`}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

interface OfficeWorkloadCardProps {
  office: Office;
  orgId: string;
}

function OfficeWorkloadCard({ office, orgId }: OfficeWorkloadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<WorkloadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<WorkloadRow> & { week_start: string }>({
    week_start: isoMonday(),
    inspector_count: 1,
    available_days: 5,
    max_jobs_per_week: 10,
    booked_jobs: 0,
    notes: '',
  });

  useEffect(() => {
    if (expanded) load();
  }, [expanded]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('office_workload')
      .select('*')
      .eq('office_id', office.id)
      .order('week_start', { ascending: false })
      .limit(8);
    setRows(data ?? []);
    setLoading(false);
  }

  async function saveRow(row: Partial<WorkloadRow> & { week_start: string }) {
    setSaving(row.id ?? 'new');
    try {
      if (row.id) {
        await supabase.from('office_workload').update({
          inspector_count: row.inspector_count,
          available_days: row.available_days,
          max_jobs_per_week: row.max_jobs_per_week,
          booked_jobs: row.booked_jobs,
          notes: row.notes,
          updated_at: new Date().toISOString(),
        }).eq('id', row.id);
      } else {
        await supabase.from('office_workload').upsert({
          organization_id: orgId,
          office_id: office.id,
          week_start: row.week_start,
          inspector_count: row.inspector_count ?? 1,
          available_days: row.available_days ?? 5,
          max_jobs_per_week: row.max_jobs_per_week ?? 10,
          booked_jobs: row.booked_jobs ?? 0,
          notes: row.notes ?? '',
        }, { onConflict: 'office_id,week_start' });
        setDraft({ week_start: isoMonday(), inspector_count: 1, available_days: 5, max_jobs_per_week: 10, booked_jobs: 0, notes: '' });
      }
      await load();
    } finally {
      setSaving(null);
    }
  }

  const thisWeek = isoMonday();
  const currentRow = rows.find(r => r.week_start === thisWeek);
  const currentCapacity = currentRow
    ? Math.round((currentRow.booked_jobs / Math.max(currentRow.max_jobs_per_week, 1)) * 100)
    : null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-white">{office.name}</p>
            {currentRow ? (
              <p className="text-xs text-slate-500">
                This week: {currentRow.booked_jobs}/{currentRow.max_jobs_per_week} jobs
              </p>
            ) : (
              <p className="text-xs text-slate-600">No workload set for this week</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentCapacity !== null && (
            <div className="w-24">
              <CapacityBar booked={currentRow!.booked_jobs} max={currentRow!.max_jobs_per_week} />
            </div>
          )}
          {currentCapacity !== null && currentCapacity >= 90 && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add / Update Weekly Capacity</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Week Starting (Monday)</label>
              <input
                type="date"
                value={draft.week_start}
                onChange={e => setDraft(d => ({ ...d, week_start: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Inspectors Available</label>
              <input
                type="number" min={1} max={20}
                value={draft.inspector_count}
                onChange={e => setDraft(d => ({ ...d, inspector_count: parseInt(e.target.value) || 1 }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Max Jobs / Week</label>
              <input
                type="number" min={1} max={100}
                value={draft.max_jobs_per_week}
                onChange={e => setDraft(d => ({ ...d, max_jobs_per_week: parseInt(e.target.value) || 10 }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Booked Jobs</label>
              <input
                type="number" min={0}
                value={draft.booked_jobs}
                onChange={e => setDraft(d => ({ ...d, booked_jobs: parseInt(e.target.value) || 0 }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Notes (optional)</label>
              <input
                value={draft.notes ?? ''}
                onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                placeholder="e.g. 1 inspector on leave"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <button
            onClick={() => saveRow(draft)}
            disabled={saving === 'new'}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            <Save className="w-3 h-3" />
            {saving === 'new' ? 'Saving…' : 'Save Week'}
          </button>

          {loading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-10 bg-slate-800 rounded-lg animate-pulse" />)}</div>
          ) : rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Recent Weeks</p>
              {rows.map(row => {
                const pct = row.max_jobs_per_week > 0
                  ? Math.round((row.booked_jobs / row.max_jobs_per_week) * 100)
                  : 0;
                return (
                  <div key={row.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2.5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 font-medium">{formatWeek(row.week_start)}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3" />{row.inspector_count} insp.
                        </span>
                        <span className="text-xs text-slate-500">{row.booked_jobs}/{row.max_jobs_per_week} jobs</span>
                        {row.notes && <span className="text-xs text-slate-600 truncate">{row.notes}</span>}
                      </div>
                    </div>
                    <div className="w-20">
                      <CapacityBar booked={row.booked_jobs} max={row.max_jobs_per_week} />
                    </div>
                    <button
                      onClick={() => saveRow({ ...row, booked_jobs: (row.booked_jobs ?? 0) + 1 })}
                      disabled={saving === row.id}
                      className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition-colors"
                      title="Add 1 booked job"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  orgId: string;
}

export default function OfficeWorkloadPanel({ orgId }: Props) {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('offices')
      .select('id, name, is_default')
      .eq('active', true)
      .order('is_default', { ascending: false })
      .order('name')
      .then(({ data }) => {
        setOffices(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-xs text-slate-500 py-4">Loading workload data…</div>;

  if (offices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
        <Briefcase className="w-6 h-6 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No offices configured yet.</p>
        <p className="text-xs text-slate-600 mt-1">Add offices above to track workload.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {offices.map(office => (
        <OfficeWorkloadCard key={office.id} office={office} orgId={orgId} />
      ))}
      <p className="text-xs text-slate-600">
        Workload data feeds the Recommended Office engine in Quote Builder — high-capacity offices are deprioritised.
      </p>
    </div>
  );
}
