import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Camera,
  CheckCircle,
  ChevronRight,
  DollarSign,
  FileText,
  Filter,
  Flame,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Timer,
  TrendingUp,
  WifiOff,
  Zap,
} from 'lucide-react';
import type {
  TelemetryData,
  TelemetryFilters,
  TierDailyPoint,
  OverrideTrendPoint,
} from '../../modules/inspection-ai/services/telemetryService';
import { fetchTelemetry } from '../../modules/inspection-ai/services/telemetryService';

const SEVERITY_COLOUR: Record<string, string> = {
  High: '#dc2626',
  Medium: '#d97706',
  Low: '#16a34a',
};

const DEFECT_COLOURS = [
  '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626',
  '#0284c7', '#db2777', '#16a34a', '#f97316', '#64748b',
];

function StatCard({
  icon,
  label,
  value,
  sub,
  colour = 'text-slate-900',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  colour?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold ${colour} leading-tight mt-0.5`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BarRow({
  label,
  count,
  total,
  colour,
  right,
}: {
  label: string;
  count: number;
  total: number;
  colour: string;
  right?: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 text-xs font-medium text-slate-600 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: colour }}
        />
      </div>
      <span className="w-8 text-right text-xs font-bold text-slate-700">{count}</span>
      {right && <span className="text-xs text-slate-400 w-14 text-right">{right}</span>}
    </div>
  );
}

function SeverityDonut({ breakdown }: { breakdown: { High: number; Medium: number; Low: number } }) {
  const total = breakdown.High + breakdown.Medium + breakdown.Low;
  if (total === 0) return <p className="text-sm text-slate-400 text-center py-4">No data yet</p>;
  const pctH = Math.round((breakdown.High / total) * 100);
  const pctM = Math.round((breakdown.Medium / total) * 100);
  const pctL = 100 - pctH - pctM;
  const segments = [
    { label: 'High', value: breakdown.High, pct: pctH, colour: '#dc2626' },
    { label: 'Medium', value: breakdown.Medium, pct: pctM, colour: '#d97706' },
    { label: 'Low', value: breakdown.Low, pct: pctL, colour: '#16a34a' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex gap-1 h-4 rounded-full overflow-hidden">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${s.pct}%`, backgroundColor: s.colour }} className="transition-all duration-700" />
        ))}
      </div>
      <div className="flex items-center gap-4">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.colour }} />
            <span className="text-xs text-slate-600 font-medium">{s.label}</span>
            <span className="text-xs font-bold text-slate-900">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfidenceBar({ buckets }: { buckets: { label: string; count: number }[] }) {
  const total = buckets.reduce((s, b) => s + b.count, 0);
  const colours = ['#dc2626', '#f97316', '#d97706', '#16a34a', '#059669'];
  return (
    <div className="space-y-2.5">
      {buckets.map((b, i) => (
        <BarRow
          key={b.label}
          label={b.label}
          count={b.count}
          total={total}
          colour={colours[i] ?? '#64748b'}
          right={total ? `${Math.round((b.count / total) * 100)}%` : '—'}
        />
      ))}
    </div>
  );
}

function TierUsageChart({ points }: { points: TierDailyPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">No tier data yet — populates once analyses are saved</p>;
  }
  const maxVal = Math.max(...points.map((p) => p.tier1 + p.tier2), 1);
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 h-28">
        {points.map((p) => {
          const total = p.tier1 + p.tier2;
          const t1h = total > 0 ? Math.round((p.tier1 / maxVal) * 100) : 0;
          const t2h = total > 0 ? Math.round((p.tier2 / maxVal) * 100) : 0;
          return (
            <div
              key={p.date}
              className="flex-1 flex flex-col justify-end group relative"
              style={{ height: '100%' }}
              title={`${p.date.slice(5)}: T1=${p.tier1} T2=${p.tier2}`}
            >
              {p.tier2 > 0 && (
                <div
                  className="w-full rounded-t-sm transition-all duration-500"
                  style={{ height: `${t2h}%`, minHeight: 3, backgroundColor: '#475569' }}
                />
              )}
              {p.tier1 > 0 && (
                <div
                  className="w-full transition-all duration-500"
                  style={{ height: `${t1h}%`, minHeight: 3, backgroundColor: '#0ea5e9' }}
                />
              )}
              <div className="absolute bottom-full mb-1 bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity">
                {p.date.slice(5)} T1:{p.tier1} T2:{p.tier2}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-sky-400 inline-block" />
          Tier 1 (fast)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-slate-500 inline-block" />
          Tier 2 (expert)
        </span>
      </div>
    </div>
  );
}

function OverrideTrendChart({ points }: { points: OverrideTrendPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Need 3+ findings/day to plot override rate</p>;
  }
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 h-28 relative">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[100, 50, 0].map((v) => (
            <div key={v} className="flex items-center gap-1">
              <span className="text-[9px] text-slate-300 w-6 text-right flex-shrink-0">{v}%</span>
              <div className="flex-1 border-t border-slate-100" />
            </div>
          ))}
        </div>
        <div className="flex-1 flex items-end gap-1 h-full pl-7">
          {points.map((p) => {
            const h = Math.round((p.overrideRate / 100) * 100);
            const col = p.overrideRate >= 40 ? '#dc2626' : p.overrideRate >= 20 ? '#d97706' : '#16a34a';
            return (
              <div
                key={p.date}
                className="flex-1 group relative flex items-end"
                style={{ height: '100%' }}
                title={`${p.date.slice(5)}: ${p.overrideRate}% override (${p.total} findings)`}
              >
                <div
                  className="w-full rounded-t-sm transition-all duration-500"
                  style={{ height: `${h}%`, minHeight: p.overrideRate > 0 ? 3 : 0, backgroundColor: col }}
                />
                <div className="absolute bottom-full mb-1 bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity">
                  {p.date.slice(5)}: {p.overrideRate}% ({p.total} findings)
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" />&lt;20%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-amber-500 inline-block" />20–40%</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-red-500 inline-block" />&gt;40%</span>
      </div>
    </div>
  );
}

function ActivityChart({ days }: { days: { date: string; findings: number; overrides: number }[] }) {
  if (days.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">No activity in past 30 days</p>;
  }
  const maxFindings = Math.max(...days.map((d) => d.findings), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {days.map((d) => {
        const heightPct = Math.round((d.findings / maxFindings) * 100);
        const overridePct = d.findings > 0 ? Math.round((d.overrides / d.findings) * 100) : 0;
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-0.5 group relative"
            title={`${d.date}: ${d.findings} findings, ${d.overrides} overrides`}
          >
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${heightPct}%`,
                minHeight: d.findings > 0 ? 3 : 0,
                backgroundColor: overridePct > 30 ? '#d97706' : '#2563eb',
              }}
            />
            <div className="absolute bottom-full mb-1 bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 pointer-events-none opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 transition-opacity">
              {d.date.slice(5)}: {d.findings}f {d.overrides}o
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OverrideTable({ patterns }: { patterns: { ai_defect_type: string; final_defect_type: string; count: number; system_type: string }[] }) {
  if (patterns.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">No override patterns yet</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {patterns.map((p, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          <span className="flex-1 text-xs font-medium text-slate-700 truncate">{p.ai_defect_type}</span>
          <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span className="flex-1 text-xs font-semibold text-slate-900 truncate">{p.final_defect_type}</span>
          <span className="text-xs text-slate-400 flex-shrink-0">{p.system_type || '—'}</span>
          <span className="w-7 text-right text-xs font-bold text-slate-600">{p.count}×</span>
        </div>
      ))}
    </div>
  );
}

function OverrideRateTable({ items }: { items: { defect_type: string; override_rate: number; count: number }[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-400 text-center py-4">No data yet</p>;
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <BarRow
          key={item.defect_type}
          label={item.defect_type}
          count={item.override_rate}
          total={100}
          colour={item.override_rate >= 50 ? '#dc2626' : item.override_rate >= 25 ? '#d97706' : '#2563eb'}
          right={`${item.override_rate}%`}
        />
      ))}
    </div>
  );
}

function EscalationTable({ items }: { items: { defect_type: string; escalation_count: number; total_count: number; escalation_rate: number }[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-400 text-center py-4">No escalation data yet</p>;
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <BarRow
          key={item.defect_type}
          label={item.defect_type}
          count={item.escalation_count}
          total={item.total_count}
          colour={item.escalation_rate >= 70 ? '#dc2626' : item.escalation_rate >= 40 ? '#d97706' : '#0891b2'}
          right={`${item.escalation_rate}%`}
        />
      ))}
    </div>
  );
}

function LatencyBar({ tier1Ms, tier2Ms }: { tier1Ms: number; tier2Ms: number }) {
  if (tier1Ms === 0 && tier2Ms === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">No latency data yet</p>;
  }
  const maxMs = Math.max(tier1Ms, tier2Ms, 1);
  const rows = [
    { label: 'Tier 1 avg', ms: tier1Ms, colour: '#0ea5e9' },
    { label: 'Tier 2 avg', ms: tier2Ms, colour: '#475569' },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-slate-600 flex-shrink-0">{r.label}</span>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{ width: `${r.ms > 0 ? Math.round((r.ms / maxMs) * 100) : 0}%`, backgroundColor: r.colour }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 w-16 text-right">
            {r.ms > 0 ? `${(r.ms / 1000).toFixed(1)}s` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function FilterBar({
  filters,
  onChange,
  projects,
  systemTypes,
}: {
  filters: TelemetryFilters;
  onChange: (f: TelemetryFilters) => void;
  projects: { id: string; project_name: string }[];
  systemTypes: string[];
}) {
  const hasFilters = filters.projectId || filters.systemType || filters.dateFrom || filters.dateTo;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-semibold text-slate-700">Filters</span>
        {hasFilters && (
          <button
            onClick={() => onChange({})}
            className="ml-auto text-xs text-blue-600 hover:underline font-medium"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Project</label>
          <select
            value={filters.projectId ?? ''}
            onChange={(e) => onChange({ ...filters, projectId: e.target.value || undefined })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">System Type</label>
          <select
            value={filters.systemType ?? ''}
            onChange={(e) => onChange({ ...filters, systemType: e.target.value || undefined })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">All systems</option>
            {systemTypes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">From</label>
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">To</label>
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>
    </div>
  );
}

export default function InspectionAITelemetry() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filters, setFilters] = useState<TelemetryFilters>({});

  const load = useCallback(async (f: TelemetryFilters) => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchTelemetry(f);
      setData(d);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load({}); }, [load]);

  const handleFiltersChange = (f: TelemetryFilters) => {
    setFilters(f);
    load(f);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-3 text-sm text-slate-500">Loading telemetry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-slate-600">{error}</p>
        <button onClick={() => load(filters)} className="text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const {
    summary,
    severityBreakdown,
    defectDistribution,
    overridePatterns,
    confidenceBuckets,
    dailyActivity,
    mostOverriddenTypes,
    tierDailyBreakdown,
    overrideTrend,
    topAutoEscalatedClasses,
    availableProjects,
    availableSystemTypes,
  } = data;

  const totalDef = defectDistribution.reduce((s, d) => s + d.count, 0);
  const tier1Pct = summary.tier1Count + summary.tier2Count > 0
    ? Math.round((summary.tier1Count / (summary.tier1Count + summary.tier2Count)) * 100)
    : 0;

  return (
    <div className="p-6 max-w-5xl space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inspection AI Telemetry</h2>
          <p className="text-sm text-slate-500 mt-0.5">Last updated {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <button
          onClick={() => load(filters)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 bg-white px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <FilterBar
        filters={filters}
        onChange={handleFiltersChange}
        projects={availableProjects}
        systemTypes={availableSystemTypes}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5 text-blue-600" />}
          label="Reports"
          value={summary.totalReports}
          sub={`${summary.findingsPerReport} findings / report`}
        />
        <StatCard
          icon={<Camera className="w-5 h-5 text-slate-600" />}
          label="Findings"
          value={summary.totalFindings}
          sub={`${summary.evidencePerFinding} photos / finding`}
        />
        <StatCard
          icon={<Brain className="w-5 h-5 text-emerald-600" />}
          label="AI Success"
          value={`${summary.aiSuccessRate}%`}
          sub="findings with AI result"
          colour={summary.aiSuccessRate >= 80 ? 'text-emerald-700' : summary.aiSuccessRate >= 50 ? 'text-amber-700' : 'text-red-700'}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-blue-600" />}
          label="Avg Confidence"
          value={`${summary.avgConfidence}%`}
          sub="across AI-analysed findings"
          colour={summary.avgConfidence >= 70 ? 'text-emerald-700' : summary.avgConfidence >= 50 ? 'text-amber-700' : 'text-red-700'}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
          label="Override Rate"
          value={`${summary.overrideRate}%`}
          sub="inspector corrections"
          colour={summary.overrideRate >= 40 ? 'text-red-700' : summary.overrideRate >= 20 ? 'text-amber-700' : 'text-emerald-700'}
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-sky-500" />}
          label="Tier 1 Handled"
          value={`${tier1Pct}%`}
          sub={`${summary.tier1Count} analyses routed fast`}
          colour="text-sky-700"
        />
        <StatCard
          icon={<Brain className="w-5 h-5 text-slate-500" />}
          label="Escalation Rate"
          value={`${summary.escalationRate}%`}
          sub={`${summary.tier2Count} expert reviews`}
          colour={summary.escalationRate > 60 ? 'text-amber-700' : 'text-slate-900'}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          label="Est. Cost Saved"
          value={`$${summary.estimatedCostSavedUsd.toFixed(2)}`}
          sub="vs. all-Tier-2 routing"
          colour="text-emerald-700"
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-red-500" />}
          label="High Severity"
          value={severityBreakdown.High}
          sub={`of ${summary.totalFindings} total findings`}
          colour={severityBreakdown.High > 0 ? 'text-red-700' : 'text-slate-900'}
        />
        <StatCard
          icon={<Camera className="w-5 h-5 text-slate-400" />}
          label="Evidence Photos"
          value={summary.totalEvidencePhotos}
          sub="total uploaded"
        />
        <StatCard
          icon={<WifiOff className="w-5 h-5 text-slate-400" />}
          label="Override Events"
          value={summary.totalOverrides}
          sub="learning records"
        />
        <StatCard
          icon={<Timer className="w-5 h-5 text-slate-400" />}
          label="Tier 2 Latency"
          value={summary.avgLatencyTier2Ms > 0 ? `${(summary.avgLatencyTier2Ms / 1000).toFixed(1)}s` : '—'}
          sub={summary.avgLatencyTier1Ms > 0 ? `Tier 1: ${(summary.avgLatencyTier1Ms / 1000).toFixed(1)}s` : 'No latency data yet'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-500" />
            Tier Usage — Last 30 Days
          </h3>
          <p className="text-xs text-slate-400 mb-4">Stacked: Tier 1 (sky) + Tier 2 (slate) per day</p>
          <TierUsageChart points={tierDailyBreakdown} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            Override Rate Trend
          </h3>
          <p className="text-xs text-slate-400 mb-4">Daily override rate (days with 3+ findings only)</p>
          <OverrideTrendChart points={overrideTrend} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Timer className="w-4 h-4 text-slate-500" />
            Avg Latency by Tier
          </h3>
          <p className="text-xs text-slate-400 mb-4">Client-measured round-trip time per model tier</p>
          <LatencyBar tier1Ms={summary.avgLatencyTier1Ms} tier2Ms={summary.avgLatencyTier2Ms} />
          {summary.avgLatencyTier1Ms > 0 && summary.avgLatencyTier2Ms > 0 && (
            <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
              Tier 2 is {(summary.avgLatencyTier2Ms / summary.avgLatencyTier1Ms).toFixed(1)}× slower than Tier 1
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Brain className="w-4 h-4 text-slate-500" />
            Top Auto-Escalated Classes
          </h3>
          <p className="text-xs text-slate-400 mb-4">Defect types most frequently routed to Tier 2</p>
          <EscalationTable items={topAutoEscalatedClasses} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            Confidence Distribution
          </h3>
          <ConfidenceBar buckets={confidenceBuckets} />
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {confidenceBuckets[0]?.count ?? 0} findings had AI failures.{' '}
              {confidenceBuckets.slice(3).reduce((s, b) => s + b.count, 0)} findings scored 70%+.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            Severity Breakdown
          </h3>
          <SeverityDonut breakdown={severityBreakdown} />
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
            {(['High', 'Medium', 'Low'] as const).map((s) => {
              const pct = summary.totalFindings ? Math.round((severityBreakdown[s] / summary.totalFindings) * 100) : 0;
              return (
                <div key={s} className="text-center">
                  <p className="text-xl font-bold" style={{ color: SEVERITY_COLOUR[s] }}>{pct}%</p>
                  <p className="text-xs text-slate-400">{s}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            Defect Type Distribution
          </h3>
          <div className="space-y-2.5">
            {defectDistribution.slice(0, 9).map((d, i) => (
              <BarRow
                key={d.defect_type}
                label={d.defect_type}
                count={d.count}
                total={totalDef}
                colour={DEFECT_COLOURS[i % DEFECT_COLOURS.length]}
                right={`${d.avg_confidence}% conf`}
              />
            ))}
          </div>
          {defectDistribution.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No findings yet</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-slate-500" />
            Most Overridden Classes
          </h3>
          <p className="text-xs text-slate-400 mb-3">High rate = AI needs improvement for that defect type</p>
          <OverrideRateTable items={mostOverriddenTypes} />
        </div>

      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          Daily Activity — Last 30 Days
        </h3>
        <p className="text-xs text-slate-400 mb-4">Blue = normal · Amber = high override rate day (&gt;30%)</p>
        <ActivityChart days={dailyActivity} />
        <div className="mt-3 flex items-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-blue-600 inline-block" />Normal</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-amber-500 inline-block" />High override (&gt;30%)</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-slate-500" />
          Inspector Override Patterns
        </h3>
        <p className="text-xs text-slate-400 mb-4">AI classification → inspector correction. Frequent pairs = AI blind spots.</p>
        <OverrideTable patterns={overridePatterns} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4 text-sky-500" />
          Two-Tier Model Routing
        </h3>
        <p className="text-xs text-slate-400 mb-4">How the AI engine decides which model handles each analysis.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-white border border-sky-200 px-2 py-0.5 rounded-full">
              <Zap className="w-3 h-3" />
              Tier 1 — gpt-4o-mini
            </span>
            <p className="text-xs text-sky-800 font-medium">Routine defects on standard systems</p>
            <ul className="text-xs text-sky-700 space-y-1 list-disc list-inside">
              <li>Protective Coatings / Cementitious</li>
              <li>Confidence ≥ 70% retained</li>
              <li>Low or Medium severity</li>
              <li>Known defect class, low override history</li>
            </ul>
            <p className="text-[11px] text-sky-500 mt-1">~60–80% of requests. Faster &amp; cheaper.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-300 px-2 py-0.5 rounded-full">
              <Brain className="w-3 h-3" />
              Tier 2 — gpt-4o
            </span>
            <p className="text-xs text-slate-700 font-medium">Auto-escalated or manually requested</p>
            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
              <li>Intumescent or Firestopping system</li>
              <li>Tier 1 confidence &lt; 70%</li>
              <li>High severity or Unknown defect</li>
              <li>High override-rate defect class (≥40%)</li>
              <li>Inspector taps "Request Expert Review"</li>
            </ul>
            <p className="text-[11px] text-slate-400 mt-1">Full 9-step reasoning. Specialist fire protection prompt.</p>
          </div>
        </div>
        {summary.estimatedCostSavedUsd > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              Estimated{' '}
              <span className="font-semibold text-emerald-700">${summary.estimatedCostSavedUsd.toFixed(2)}</span>{' '}
              saved by routing {summary.tier1Count} analyses through Tier 1 instead of Tier 2.
              Based on OpenAI list pricing (~1k input tokens/analysis).
            </p>
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Reading this data</p>
        <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
          <li>AI success rate below 70% — check OpenAI key quota or image quality</li>
          <li>Override rate above 30% — prompt needs tuning for those defect types</li>
          <li>Override rate declining over time — routing and learning are working</li>
          <li>High escalation rate on a class — consider adding it to specialist bypass rules</li>
          <li>Tier 2 latency above 20s — inspect edge function timeout configuration</li>
          <li>Cost saved growing — Tier 1 routing is effective; keep monitoring quality</li>
        </ul>
      </div>

    </div>
  );
}
