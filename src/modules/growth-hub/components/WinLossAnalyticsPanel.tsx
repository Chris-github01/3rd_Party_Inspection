import { useEffect, useState } from 'react';
import { Target, TrendingUp, TrendingDown, Clock, DollarSign, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Quote } from '../types';

interface WinLossStats {
  totalQuotes: number;
  sent: number;
  accepted: number;
  declined: number;
  expired: number;
  winRate: number;
  avgAcceptedValue: number;
  avgDeclinedValue: number;
  avgTimeToAcceptDays: number | null;
  avgMarginAccepted: number | null;
  avgMarginDeclined: number | null;
  byTemplate: Array<{ type: string; sent: number; won: number; winRate: number; avgValue: number }>;
  byRegion: Array<{ region: string; sent: number; won: number; winRate: number }>;
  lostReasons: Array<{ reason: string; count: number }>;
  monthlyTrend: Array<{ month: string; sent: number; won: number; winRate: number }>;
}

function StatTile({ label, value, sub, color = 'text-white', icon: Icon }: {
  label: string; value: string; sub?: string; color?: string; icon?: any;
}) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
      {Icon && <Icon className="w-4 h-4 text-slate-500 mx-auto mb-1" />}
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniBar({ label, value, max, color = 'bg-blue-500' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400 truncate" style={{ minWidth: 80, maxWidth: 140 }}>{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-300 font-semibold w-10 text-right">{value}</span>
    </div>
  );
}

function computeStats(quotes: Quote[]): WinLossStats {
  const sent = quotes.filter(q => ['sent', 'accepted', 'declined', 'expired', 'invoiced'].includes(q.status));
  const accepted = quotes.filter(q => q.status === 'accepted' || q.status === 'invoiced');
  const declined = quotes.filter(q => q.status === 'declined');
  const expired = quotes.filter(q => q.status === 'expired');

  const winRate = sent.length > 0 ? Math.round((accepted.length / sent.length) * 100) : 0;

  const avgAcceptedValue = accepted.length > 0
    ? accepted.reduce((s, q) => s + (q.total ?? 0), 0) / accepted.length : 0;
  const avgDeclinedValue = declined.length > 0
    ? declined.reduce((s, q) => s + (q.total ?? 0), 0) / declined.length : 0;

  const timesToAccept = accepted
    .filter(q => q.sent_at && q.accepted_at)
    .map(q => (new Date(q.accepted_at!).getTime() - new Date(q.sent_at!).getTime()) / (1000 * 60 * 60 * 24));
  const avgTimeToAcceptDays = timesToAccept.length > 0
    ? Math.round(timesToAccept.reduce((a, b) => a + b, 0) / timesToAccept.length * 10) / 10
    : null;

  const acceptedMargins = accepted.map(q => q.gross_margin_pct).filter((m): m is number => m != null);
  const avgMarginAccepted = acceptedMargins.length > 0
    ? Math.round(acceptedMargins.reduce((a, b) => a + b, 0) / acceptedMargins.length * 10) / 10 : null;

  const declinedMargins = declined.map(q => q.gross_margin_pct).filter((m): m is number => m != null);
  const avgMarginDeclined = declinedMargins.length > 0
    ? Math.round(declinedMargins.reduce((a, b) => a + b, 0) / declinedMargins.length * 10) / 10 : null;

  const templateMap: Record<string, { sent: number; won: number; totalValue: number }> = {};
  sent.forEach(q => {
    const t = q.template_type ?? 'unclassified';
    if (!templateMap[t]) templateMap[t] = { sent: 0, won: 0, totalValue: 0 };
    templateMap[t].sent++;
    templateMap[t].totalValue += q.total ?? 0;
    if (q.status === 'accepted' || q.status === 'invoiced') templateMap[t].won++;
  });
  const byTemplate = Object.entries(templateMap)
    .map(([type, v]) => ({
      type: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      sent: v.sent, won: v.won,
      winRate: v.sent > 0 ? Math.round((v.won / v.sent) * 100) : 0,
      avgValue: v.sent > 0 ? Math.round(v.totalValue / v.sent) : 0,
    }))
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 6);

  const regionMap: Record<string, { sent: number; won: number }> = {};
  sent.forEach(q => {
    const r = (q as any).region ?? 'Unknown';
    if (!regionMap[r]) regionMap[r] = { sent: 0, won: 0 };
    regionMap[r].sent++;
    if (q.status === 'accepted' || q.status === 'invoiced') regionMap[r].won++;
  });
  const byRegion = Object.entries(regionMap)
    .map(([region, v]) => ({ region, sent: v.sent, won: v.won, winRate: v.sent > 0 ? Math.round((v.won / v.sent) * 100) : 0 }))
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 6);

  const LOST_REASON_LABELS: Record<string, string> = {
    price_too_high: 'Price too high',
    competitor_chosen: 'Competitor chosen',
    project_cancelled: 'Project cancelled',
    no_response: 'No response',
    scope_mismatch: 'Scope mismatch',
    timeline_mismatch: 'Timeline mismatch',
    budget_cut: 'Budget cut',
    went_inhouse: 'Went in-house',
    other: 'Other',
  };

  const reasonMap: Record<string, number> = {};
  declined.forEach(q => {
    const code = (q as any).lost_reason_code;
    const freeText = (q as any).lost_reason?.trim();
    const r = code ? (LOST_REASON_LABELS[code] ?? code) : freeText || 'Not specified';
    reasonMap[r] = (reasonMap[r] ?? 0) + 1;
  });
  const lostReasons = Object.entries(reasonMap)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const monthMap: Record<string, { sent: number; won: number }> = {};
  sent.forEach(q => {
    const d = new Date(q.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = { sent: 0, won: 0 };
    monthMap[key].sent++;
    if (q.status === 'accepted' || q.status === 'invoiced') monthMap[key].won++;
  });
  const monthlyTrend = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' }),
      sent: v.sent, won: v.won,
      winRate: v.sent > 0 ? Math.round((v.won / v.sent) * 100) : 0,
    }));

  return {
    totalQuotes: quotes.length,
    sent: sent.length, accepted: accepted.length,
    declined: declined.length, expired: expired.length,
    winRate, avgAcceptedValue, avgDeclinedValue,
    avgTimeToAcceptDays, avgMarginAccepted, avgMarginDeclined,
    byTemplate, byRegion, lostReasons, monthlyTrend,
  };
}

export default function WinLossAnalyticsPanel() {
  const [stats, setStats] = useState<WinLossStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('quotes')
          .select('id, status, total, gross_margin_pct, template_type, sent_at, accepted_at, declined_at, created_at, cost_inputs, lost_reason, lost_reason_code')
          .not('organization_id', 'is', null)
          .order('created_at', { ascending: false });
        if (data) setStats(computeStats(data as Quote[]));
      } catch (err) {
        console.error('WinLossAnalyticsPanel error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Win / Loss Analytics</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!stats || stats.sent === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Win / Loss Analytics</h2>
        </div>
        <div className="text-center py-8">
          <BarChart2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No quote data yet</p>
          <p className="text-slate-600 text-xs mt-1">Send quotes and track outcomes to see win/loss analytics</p>
        </div>
      </div>
    );
  }

  const maxTemplateSent = Math.max(...stats.byTemplate.map(t => t.sent), 1);
  const maxRegionSent = Math.max(...stats.byRegion.map(r => r.sent), 1);
  const maxReason = Math.max(...stats.lostReasons.map(r => r.count), 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Win / Loss Analytics</h2>
        </div>
        <button
          onClick={() => setShowDetails(v => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showDetails ? 'Less' : 'Details'}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatTile
          label="Win Rate"
          value={`${stats.winRate}%`}
          sub={`${stats.accepted} accepted`}
          color={stats.winRate >= 60 ? 'text-emerald-400' : stats.winRate >= 40 ? 'text-amber-400' : 'text-red-400'}
          icon={Target}
        />
        <StatTile
          label="Quotes Sent"
          value={String(stats.sent)}
          sub={`${stats.declined} declined`}
          icon={BarChart2}
        />
        <StatTile
          label="Avg Won Value"
          value={stats.avgAcceptedValue > 0 ? `$${Math.round(stats.avgAcceptedValue / 1000)}k` : '—'}
          sub="excl. GST"
          color="text-emerald-400"
          icon={DollarSign}
        />
        <StatTile
          label="Avg Close Time"
          value={stats.avgTimeToAcceptDays != null ? `${stats.avgTimeToAcceptDays}d` : '—'}
          sub="sent → accepted"
          color="text-blue-400"
          icon={Clock}
        />
      </div>

      {/* Margin comparison */}
      {(stats.avgMarginAccepted != null || stats.avgMarginDeclined != null) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-3 text-center">
            <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-emerald-400">
              {stats.avgMarginAccepted != null ? `${stats.avgMarginAccepted}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Avg margin (won)</p>
          </div>
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 text-center">
            <TrendingDown className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-400">
              {stats.avgMarginDeclined != null ? `${stats.avgMarginDeclined}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Avg margin (lost)</p>
          </div>
        </div>
      )}

      {/* Monthly trend */}
      {stats.monthlyTrend.length > 1 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Monthly Trend</p>
          <div className="flex items-end gap-1.5 h-16">
            {stats.monthlyTrend.map(m => {
              const maxSent = Math.max(...stats.monthlyTrend.map(x => x.sent), 1);
              const sentH = Math.max((m.sent / maxSent) * 56, 4);
              const wonH = m.sent > 0 ? Math.max((m.won / m.sent) * sentH, m.won > 0 ? 2 : 0) : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5 relative group">
                  <div className="relative w-full flex flex-col justify-end" style={{ height: 56 }}>
                    <div className="w-full bg-slate-700 rounded-sm" style={{ height: sentH }} />
                    <div className="absolute bottom-0 w-full bg-emerald-500 rounded-sm" style={{ height: wonH }} />
                  </div>
                  <span className="text-[9px] text-slate-600">{m.month}</span>
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-xl">
                    {m.won}/{m.sent} ({m.winRate}%)
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-700 rounded-sm" />Sent</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm" />Won</span>
          </div>
        </div>
      )}

      {showDetails && (
        <div className="space-y-4 border-t border-slate-800 pt-4">
          {/* By service type */}
          {stats.byTemplate.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">By Service Type</p>
              <div className="space-y-2">
                {stats.byTemplate.map(t => (
                  <div key={t.type} className="flex items-center gap-3">
                    <MiniBar label={t.type} value={t.sent} max={maxTemplateSent} color="bg-blue-500" />
                    <span className={`text-xs font-semibold w-10 text-right flex-shrink-0 ${
                      t.winRate >= 60 ? 'text-emerald-400' : t.winRate >= 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>{t.winRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By region */}
          {stats.byRegion.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">By Region</p>
              <div className="space-y-2">
                {stats.byRegion.map(r => (
                  <div key={r.region} className="flex items-center gap-3">
                    <MiniBar label={r.region} value={r.sent} max={maxRegionSent} color="bg-sky-500" />
                    <span className={`text-xs font-semibold w-10 text-right flex-shrink-0 ${
                      r.winRate >= 60 ? 'text-emerald-400' : r.winRate >= 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>{r.winRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lost reasons */}
          {stats.lostReasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Decline Reasons</p>
              <div className="space-y-2">
                {stats.lostReasons.map(r => (
                  <MiniBar key={r.reason} label={r.reason} value={r.count} max={maxReason} color="bg-red-500" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
