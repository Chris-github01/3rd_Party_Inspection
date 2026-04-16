import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Camera,
  CheckCircle,
  ChevronRight,
  FileText,
  Flame,
  Loader2,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  WifiOff,
  Zap,
} from 'lucide-react';
import type { TelemetryData } from '../../modules/inspection-ai/services/telemetryService';
import { fetchTelemetry } from '../../modules/inspection-ai/services/telemetryService';

const SEVERITY_COLOUR: Record<string, string> = {
  High: '#dc2626',
  Medium: '#d97706',
  Low: '#16a34a',
};

const DEFECT_COLOURS = [
  '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#9333ea', '#0284c7', '#16a34a',
];

function StatCard({
  icon,
  label,
  value,
  sub,
  colour = 'text-slate-900',
  bg = 'bg-white',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  colour?: string;
  bg?: string;
}) {
  return (
    <div className={`${bg} border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm`}>
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
      <span className="w-40 text-xs font-medium text-slate-600 truncate flex-shrink-0">{label}</span>
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
            <div className="w-full rounded-t-sm" style={{ height: `${heightPct}%`, minHeight: d.findings > 0 ? 3 : 0, backgroundColor: overridePct > 30 ? '#d97706' : '#2563eb' }} />
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
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Not enough data yet</p>;
  }
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
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

export default function InspectionAITelemetry() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchTelemetry();
      setData(d);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
        <button onClick={load} className="text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, severityBreakdown, defectDistribution, overridePatterns, confidenceBuckets, dailyActivity, mostOverriddenTypes } = data;

  const totalDef = defectDistribution.reduce((s, d) => s + d.count, 0);

  return (
    <div className="p-6 max-w-5xl">
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inspection AI Telemetry</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Internal admin — last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 border border-slate-200 bg-white px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

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
          icon={<Camera className="w-5 h-5 text-slate-600" />}
          label="Evidence Photos"
          value={summary.totalEvidencePhotos}
          sub="total uploaded"
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-slate-600" />}
          label="Override Events"
          value={summary.totalOverrides}
          sub="learning records captured"
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-red-500" />}
          label="High Severity"
          value={severityBreakdown.High}
          sub={`of ${summary.totalFindings} total findings`}
          colour={severityBreakdown.High > 0 ? 'text-red-700' : 'text-slate-900'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            Confidence Distribution
          </h3>
          <ConfidenceBar buckets={confidenceBuckets} />
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              {confidenceBuckets[0]?.count ?? 0} findings had AI failures (confidence 0).{' '}
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
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-slate-500" />
            Most Overridden Classifications
          </h3>
          <p className="text-xs text-slate-400 mb-3">High override rate = AI needs improvement for that defect type</p>
          <OverrideRateTable items={mostOverriddenTypes} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-500" />
          Daily Activity — Last 30 Days
        </h3>
        <p className="text-xs text-slate-400 mb-4">Blue = normal activity · Amber = high override rate day</p>
        <ActivityChart days={dailyActivity} />
        <div className="mt-3 flex items-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-600" />Findings</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" />High override day (&gt;30%)</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-slate-500" />
          Inspector Override Patterns
        </h3>
        <p className="text-xs text-slate-400 mb-4">AI classification → what inspector changed it to. Frequent patterns indicate AI blind spots.</p>
        <OverrideTable patterns={overridePatterns} />
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Reading this data</p>
        <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside">
          <li>AI success rate below 70% = check OpenAI key quota or image quality issues</li>
          <li>Override rate above 30% = prompt needs tuning for those defect types</li>
          <li>Consistent AI→Inspector correction pairs = add those patterns to the system prompt</li>
          <li>Confidence mostly in 0–49% = images too blurry or context fields not filled in</li>
          <li>Evidence photos per finding below 1 = inspectors not uploading supporting photos</li>
        </ul>
      </div>
    </div>
    </div>
  );
}
