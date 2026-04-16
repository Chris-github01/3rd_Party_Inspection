import { useEffect, useState } from 'react';
import { X, BarChart3, TrendingUp, MapPin, Users, RefreshCw, PlusCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface OutcomeRow {
  client_name: string;
  service_type: string | null;
  region: string | null;
  gross_margin_pct: number | null;
  total: number | null;
  pricing_tier: string | null;
  outcome: string;
}

interface ClientStat {
  client: string;
  won: number;
  lost: number;
  total: number;
  winRate: number;
  avgMargin: number;
}

interface ServiceStat {
  serviceType: string;
  won: number;
  lost: number;
  total: number;
  winRate: number;
  avgMargin: number;
  avgTotal: number;
}

interface RegionStat {
  region: string;
  won: number;
  total: number;
  winRate: number;
  avgMargin: number;
}

interface Props {
  onClose: () => void;
}

const SERVICE_LABELS: Record<string, string> = {
  inspection: 'Fire Protection Inspection',
  reinspection: 'Reinspection',
  intumescent_audit: 'Intumescent Audit',
  fire_stopping_survey: 'Fire Stopping Survey',
  witness_inspection: 'Witness Inspection',
};

function fmt(v: number) {
  return v.toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function WinRateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${rate >= 60 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${rate >= 60 ? 'text-emerald-400' : rate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
        {rate.toFixed(0)}%
      </span>
    </div>
  );
}

export default function PricingAnalyticsModal({ onClose }: Props) {
  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'service' | 'client' | 'region'>('service');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    client_name: '', service_type: 'inspection', region: 'Auckland', pricing_tier: 'balanced',
    gross_margin_pct: '', total: '', outcome: 'won', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('quote_outcomes')
      .select('client_name, service_type, region, gross_margin_pct, total, pricing_tier, outcome')
      .order('outcome_recorded_at', { ascending: false });
    setOutcomes((data ?? []) as OutcomeRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const closedOutcomes = outcomes.filter(o => o.outcome === 'won' || o.outcome === 'lost');

  const clientStats: ClientStat[] = (() => {
    const map: Record<string, { won: number; lost: number; margins: number[] }> = {};
    closedOutcomes.forEach(o => {
      const k = o.client_name || 'Unknown';
      if (!map[k]) map[k] = { won: 0, lost: 0, margins: [] };
      if (o.outcome === 'won') map[k].won++;
      else map[k].lost++;
      if (o.gross_margin_pct != null) map[k].margins.push(o.gross_margin_pct);
    });
    return Object.entries(map).map(([client, d]) => ({
      client,
      won: d.won, lost: d.lost, total: d.won + d.lost,
      winRate: d.won + d.lost > 0 ? (d.won / (d.won + d.lost)) * 100 : 0,
      avgMargin: d.margins.length > 0 ? d.margins.reduce((a, b) => a + b, 0) / d.margins.length : 0,
    })).sort((a, b) => b.total - a.total).slice(0, 10);
  })();

  const serviceStats: ServiceStat[] = (() => {
    const map: Record<string, { won: number; lost: number; margins: number[]; totals: number[] }> = {};
    closedOutcomes.forEach(o => {
      const k = o.service_type || 'unspecified';
      if (!map[k]) map[k] = { won: 0, lost: 0, margins: [], totals: [] };
      if (o.outcome === 'won') map[k].won++;
      else map[k].lost++;
      if (o.gross_margin_pct != null) map[k].margins.push(o.gross_margin_pct);
      if (o.total != null) map[k].totals.push(o.total);
    });
    return Object.entries(map).map(([serviceType, d]) => ({
      serviceType,
      won: d.won, lost: d.lost, total: d.won + d.lost,
      winRate: d.won + d.lost > 0 ? (d.won / (d.won + d.lost)) * 100 : 0,
      avgMargin: d.margins.length > 0 ? d.margins.reduce((a, b) => a + b, 0) / d.margins.length : 0,
      avgTotal: d.totals.length > 0 ? d.totals.reduce((a, b) => a + b, 0) / d.totals.length : 0,
    })).sort((a, b) => b.total - a.total);
  })();

  const regionStats: RegionStat[] = (() => {
    const map: Record<string, { won: number; total: number; margins: number[] }> = {};
    closedOutcomes.forEach(o => {
      const k = o.region || 'Unknown';
      if (!map[k]) map[k] = { won: 0, total: 0, margins: [] };
      if (o.outcome === 'won') map[k].won++;
      map[k].total++;
      if (o.gross_margin_pct != null) map[k].margins.push(o.gross_margin_pct);
    });
    return Object.entries(map).map(([region, d]) => ({
      region, won: d.won, total: d.total,
      winRate: d.total > 0 ? (d.won / d.total) * 100 : 0,
      avgMargin: d.margins.length > 0 ? d.margins.reduce((a, b) => a + b, 0) / d.margins.length : 0,
    })).sort((a, b) => b.total - a.total);
  })();

  const handleAddOutcome = async () => {
    setSaving(true);
    try {
      const { data: ou } = await supabase.from('organization_users')
        .select('organization_id').limit(1).maybeSingle();
      if (!ou) return;
      await supabase.from('quote_outcomes').insert({
        organization_id: ou.organization_id,
        client_name: addForm.client_name,
        service_type: addForm.service_type,
        region: addForm.region,
        pricing_tier: addForm.pricing_tier,
        gross_margin_pct: addForm.gross_margin_pct ? parseFloat(addForm.gross_margin_pct) : null,
        total: addForm.total ? parseFloat(addForm.total) : null,
        outcome: addForm.outcome,
        notes: addForm.notes || null,
      });
      setShowAddForm(false);
      setAddForm({ client_name: '', service_type: 'inspection', region: 'Auckland', pricing_tier: 'balanced', gross_margin_pct: '', total: '', outcome: 'won', notes: '' });
      load();
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'service' as const, label: 'By Service', icon: BarChart3 },
    { id: 'client' as const, label: 'By Client', icon: Users },
    { id: 'region' as const, label: 'By Region', icon: MapPin },
  ];

  const nzRegions = ['Auckland', 'Wellington', 'Canterbury', 'Waikato', 'Bay of Plenty', 'Otago', 'Hawke\'s Bay', 'Manawatu-Whanganui', 'Northland', 'Other'];

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-900/40 border border-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Pricing Analytics</h3>
              <p className="text-xs text-slate-500">{closedOutcomes.length} closed quotes tracked</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
              <PlusCircle className="w-3.5 h-3.5" />
              Log Outcome
            </button>
            <button onClick={load} className="text-slate-500 hover:text-white p-1.5 rounded">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary KPIs */}
        {closedOutcomes.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-800 grid grid-cols-4 gap-4">
            {[
              { label: 'Total Closed', value: closedOutcomes.length.toString() },
              { label: 'Won', value: outcomes.filter(o => o.outcome === 'won').length.toString(), color: 'text-emerald-400' },
              { label: 'Overall Win Rate', value: `${closedOutcomes.length > 0 ? ((outcomes.filter(o => o.outcome === 'won').length / closedOutcomes.length) * 100).toFixed(0) : 0}%`, color: 'text-sky-400' },
              {
                label: 'Avg Margin (won)',
                value: (() => {
                  const won = outcomes.filter(o => o.outcome === 'won' && o.gross_margin_pct != null);
                  return won.length > 0
                    ? `${(won.reduce((s, o) => s + (o.gross_margin_pct ?? 0), 0) / won.length).toFixed(1)}%`
                    : '—';
                })(),
                color: 'text-emerald-400',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className={`text-lg font-bold ${color ?? 'text-white'}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-[#C8102E] text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          ) : closedOutcomes.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium mb-1">No outcome data yet</p>
              <p className="text-slate-600 text-xs mb-4">Log quote outcomes to build win rate and margin analytics.</p>
              <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 mx-auto px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600">
                <PlusCircle className="w-4 h-4" />
                Log First Outcome
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'service' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-3 text-xs text-slate-500 px-3 pb-1 font-medium uppercase tracking-wider">
                    <span className="col-span-2">Service Type</span>
                    <span className="text-right">Quotes</span>
                    <span className="text-right">Avg Margin</span>
                    <span>Win Rate</span>
                  </div>
                  {serviceStats.map(s => (
                    <div key={s.serviceType} className="grid grid-cols-5 gap-3 items-center bg-slate-800/40 border border-slate-700/50 rounded-xl px-3 py-3">
                      <div className="col-span-2">
                        <p className="text-sm text-white font-medium">{SERVICE_LABELS[s.serviceType] ?? s.serviceType}</p>
                        <p className="text-xs text-slate-500">{s.won}W / {s.lost}L · avg ${fmt(s.avgTotal)}</p>
                      </div>
                      <p className="text-sm text-slate-300 text-right">{s.total}</p>
                      <p className={`text-sm font-semibold text-right ${s.avgMargin >= 45 ? 'text-emerald-400' : s.avgMargin >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
                        {s.avgMargin.toFixed(1)}%
                      </p>
                      <WinRateBar rate={s.winRate} />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'client' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-3 text-xs text-slate-500 px-3 pb-1 font-medium uppercase tracking-wider">
                    <span className="col-span-2">Client</span>
                    <span className="text-right">Quotes</span>
                    <span className="text-right">Avg Margin</span>
                    <span>Win Rate</span>
                  </div>
                  {clientStats.map(s => (
                    <div key={s.client} className="grid grid-cols-5 gap-3 items-center bg-slate-800/40 border border-slate-700/50 rounded-xl px-3 py-3">
                      <div className="col-span-2">
                        <p className="text-sm text-white font-medium">{s.client}</p>
                        <p className="text-xs text-slate-500">{s.won} won, {s.lost} lost</p>
                      </div>
                      <p className="text-sm text-slate-300 text-right">{s.total}</p>
                      <p className={`text-sm font-semibold text-right ${s.avgMargin >= 45 ? 'text-emerald-400' : s.avgMargin >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
                        {s.avgMargin.toFixed(1)}%
                      </p>
                      <WinRateBar rate={s.winRate} />
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'region' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-3 text-xs text-slate-500 px-3 pb-1 font-medium uppercase tracking-wider">
                    <span className="col-span-2">Region</span>
                    <span className="text-right">Avg Margin</span>
                    <span>Win Rate</span>
                  </div>
                  {regionStats.map(s => (
                    <div key={s.region} className="grid grid-cols-4 gap-3 items-center bg-slate-800/40 border border-slate-700/50 rounded-xl px-3 py-3">
                      <div className="col-span-2">
                        <p className="text-sm text-white font-medium">{s.region}</p>
                        <p className="text-xs text-slate-500">{s.total} quotes</p>
                      </div>
                      <p className={`text-sm font-semibold text-right ${s.avgMargin >= 45 ? 'text-emerald-400' : s.avgMargin >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
                        {s.avgMargin.toFixed(1)}%
                      </p>
                      <WinRateBar rate={s.winRate} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Add outcome form */}
        {showAddForm && (
          <div className="border-t border-slate-800 p-5 bg-slate-950/40">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Log Quote Outcome</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Client Name</label>
                <input value={addForm.client_name} onChange={e => setAddForm(f => ({ ...f, client_name: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C8102E]" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Service Type</label>
                <select value={addForm.service_type} onChange={e => setAddForm(f => ({ ...f, service_type: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C8102E]">
                  {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Region</label>
                <select value={addForm.region} onChange={e => setAddForm(f => ({ ...f, region: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C8102E]">
                  {nzRegions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Outcome</label>
                <select value={addForm.outcome} onChange={e => setAddForm(f => ({ ...f, outcome: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C8102E]">
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="no_response">No Response</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Margin %</label>
                <input type="number" value={addForm.gross_margin_pct} onChange={e => setAddForm(f => ({ ...f, gross_margin_pct: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C8102E]" placeholder="e.g. 48.5" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Quote Total ($)</label>
                <input type="number" value={addForm.total} onChange={e => setAddForm(f => ({ ...f, total: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C8102E]" placeholder="excl. GST" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddForm(false)} className="text-xs text-slate-500 hover:text-white px-3 py-1.5">Cancel</button>
              <button
                onClick={handleAddOutcome}
                disabled={saving || !addForm.client_name.trim()}
                className="px-4 py-1.5 bg-[#C8102E] hover:bg-[#A60E25] disabled:opacity-40 text-white text-xs font-medium rounded-lg"
              >
                {saving ? 'Saving…' : 'Save Outcome'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
