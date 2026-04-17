import { useEffect, useState } from 'react';
import { BarChart2, Building2, TrendingUp, TrendingDown, DollarSign, Award, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { marginColor, getTargetMargin } from '../utils/costingEngine';

interface OfficeMetrics {
  officeId: string;
  officeName: string;
  isDefault: boolean;
  quoteCount: number;
  totalRevenue: number;
  totalInternalCost: number;
  avgMarginPct: number;
  targetMarginPct: number;
  marginGap: number;
  winCount: number;
  winRate: number;
  topServiceType: string | null;
  revenueShare: number;
}

interface RankBadgeProps {
  rank: number;
}

function RankBadge({ rank }: RankBadgeProps) {
  const colors = [
    'bg-amber-500 text-amber-950',
    'bg-slate-400 text-slate-950',
    'bg-amber-700 text-amber-100',
  ];
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colors[rank - 1] ?? 'bg-slate-700 text-slate-400'}`}>
      {rank}
    </div>
  );
}

function MarginBar({ pct, target }: { pct: number; target: number }) {
  const barPct = Math.min((pct / (target * 1.5)) * 100, 100);
  const targetLinePct = (target / (target * 1.5)) * 100;
  const barColor = pct >= target ? 'bg-emerald-500' : pct >= target * 0.7 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="relative h-2 bg-slate-700 rounded-full overflow-visible">
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${barColor} transition-all duration-500`}
        style={{ width: `${barPct}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-slate-400 opacity-60"
        style={{ left: `${targetLinePct}%` }}
        title={`Target: ${target}%`}
      />
    </div>
  );
}

function OfficeRow({
  metrics,
  rank,
  totalRevenue,
}: {
  metrics: OfficeMetrics;
  rank: number;
  totalRevenue: number;
}) {
  const revShare = totalRevenue > 0 ? (metrics.totalRevenue / totalRevenue) * 100 : 0;
  const atTarget = metrics.avgMarginPct >= metrics.targetMarginPct;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <RankBadge rank={rank} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white truncate">{metrics.officeName}</h3>
            {metrics.isDefault && (
              <span className="text-[10px] bg-blue-900/40 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded">
                Default
              </span>
            )}
            {!atTarget && (
              <span className="text-[10px] bg-red-900/40 text-red-400 border border-red-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                Below target
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {metrics.quoteCount} quote{metrics.quoteCount !== 1 ? 's' : ''} · {revShare.toFixed(0)}% revenue share
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-base font-bold ${marginColor(metrics.avgMarginPct, metrics.targetMarginPct)}`}>
            {metrics.avgMarginPct > 0 ? `${metrics.avgMarginPct.toFixed(1)}%` : '—'}
          </p>
          <p className="text-[10px] text-slate-500">avg margin</p>
        </div>
      </div>

      <MarginBar pct={metrics.avgMarginPct} target={metrics.targetMarginPct} />

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div>
          <p className="text-xs font-semibold text-white">
            ${metrics.totalRevenue > 0 ? (metrics.totalRevenue / 1000).toFixed(1) + 'k' : '—'}
          </p>
          <p className="text-[10px] text-slate-500">Revenue</p>
        </div>
        <div>
          <p className={`text-xs font-semibold ${metrics.winRate >= 60 ? 'text-emerald-400' : metrics.winRate >= 40 ? 'text-amber-400' : 'text-slate-400'}`}>
            {metrics.winCount > 0 ? `${metrics.winRate.toFixed(0)}%` : '—'}
          </p>
          <p className="text-[10px] text-slate-500">Win rate</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-300 truncate">
            {metrics.topServiceType
              ? metrics.topServiceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              : '—'}
          </p>
          <p className="text-[10px] text-slate-500">Top service</p>
        </div>
      </div>
    </div>
  );
}

export default function OfficeProfitabilityDashboard() {
  const [metrics, setMetrics] = useState<OfficeMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'margin' | 'revenue' | 'winRate'>('margin');

  useEffect(() => {
    async function load() {
      try {
        const { data: officeData } = await supabase
          .from('offices')
          .select('id, name, is_default, active')
          .eq('active', true);

        const offices = officeData ?? [];
        if (offices.length === 0) {
          setMetrics([]);
          setLoading(false);
          return;
        }

        const { data: quoteData } = await supabase
          .from('quotes')
          .select('total, internal_cost, gross_margin_pct, template_type, status, cost_inputs')
          .not('organization_id', 'is', null);

        const quotes = quoteData ?? [];

        const { data: leadData } = await supabase
          .from('leads')
          .select('stage, estimated_value');
        const leads = leadData ?? [];

        const allMetrics: OfficeMetrics[] = offices.map(office => {
          const officeQuotes = quotes.filter(q => {
            const ci = q.cost_inputs as Record<string, unknown> | null;
            return ci?.office_id === office.id;
          });

          const totalRevenue = officeQuotes.reduce((s, q) => s + (q.total ?? 0), 0);
          const totalInternalCost = officeQuotes.reduce((s, q) => s + (q.internal_cost ?? 0), 0);
          const margins = officeQuotes
            .map(q => q.gross_margin_pct)
            .filter((m): m is number => m != null);
          const avgMarginPct = margins.length > 0
            ? margins.reduce((a, b) => a + b, 0) / margins.length
            : 0;

          const wonQuotes = officeQuotes.filter(q => q.status === 'accepted').length;
          const closedQuotes = officeQuotes.filter(q =>
            q.status === 'accepted' || q.status === 'declined'
          ).length;
          const winRate = closedQuotes > 0 ? (wonQuotes / closedQuotes) * 100 : 0;

          const typeCounts: Record<string, number> = {};
          officeQuotes.forEach(q => {
            if (q.template_type) {
              typeCounts[q.template_type] = (typeCounts[q.template_type] ?? 0) + 1;
            }
          });
          const topServiceType = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

          const targetMarginPct = getTargetMargin(topServiceType);
          const marginGap = avgMarginPct - targetMarginPct;

          return {
            officeId: office.id,
            officeName: office.name,
            isDefault: office.is_default,
            quoteCount: officeQuotes.length,
            totalRevenue,
            totalInternalCost,
            avgMarginPct,
            targetMarginPct,
            marginGap,
            winCount: wonQuotes,
            winRate,
            topServiceType,
            revenueShare: 0,
          };
        });

        const grandTotal = allMetrics.reduce((s, m) => s + m.totalRevenue, 0);
        allMetrics.forEach(m => {
          m.revenueShare = grandTotal > 0 ? (m.totalRevenue / grandTotal) * 100 : 0;
        });

        setMetrics(allMetrics);
      } catch (err) {
        console.error('OfficeProfitabilityDashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sorted = [...metrics].sort((a, b) => {
    if (sortBy === 'margin') return b.avgMarginPct - a.avgMarginPct;
    if (sortBy === 'revenue') return b.totalRevenue - a.totalRevenue;
    return b.winRate - a.winRate;
  });

  const totalRevenue = metrics.reduce((s, m) => s + m.totalRevenue, 0);
  const avgMarginAll = metrics.length > 0
    ? metrics.reduce((s, m) => s + m.avgMarginPct, 0) / metrics.length
    : 0;
  const topOffice = sorted[0];

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Office Profitability</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Office Profitability</h2>
        </div>
        <div className="text-center py-8">
          <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No office data available</p>
          <p className="text-slate-600 text-xs mt-1">Configure offices in Organisation Settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Office Profitability</h2>
        </div>
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
          {(['margin', 'revenue', 'winRate'] as const).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
                sortBy === key
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {key === 'margin' ? 'Margin' : key === 'revenue' ? 'Revenue' : 'Win rate'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs text-slate-500">Total Revenue</p>
          </div>
          <p className="text-lg font-bold text-white">
            ${totalRevenue > 0 ? (totalRevenue / 1000).toFixed(0) + 'k' : '0'}
          </p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs text-slate-500">Avg Margin</p>
          </div>
          <p className={`text-lg font-bold ${marginColor(avgMarginAll)}`}>
            {avgMarginAll > 0 ? `${avgMarginAll.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Award className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs text-slate-500">Top Office</p>
          </div>
          <p className="text-sm font-bold text-white truncate">
            {topOffice?.officeName ?? '—'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((m, i) => (
          <OfficeRow
            key={m.officeId}
            metrics={m}
            rank={i + 1}
            totalRevenue={totalRevenue}
          />
        ))}
      </div>

      {sorted.some(m => m.marginGap < 0) && (
        <div className="mt-4 flex items-start gap-2 bg-amber-900/20 border border-amber-800 rounded-lg p-3">
          <TrendingDown className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            {sorted.filter(m => m.marginGap < 0).length} office{sorted.filter(m => m.marginGap < 0).length > 1 ? 's are' : ' is'} below target margin.
            Review travel pricing or service mix for those offices.
          </p>
        </div>
      )}
    </div>
  );
}
