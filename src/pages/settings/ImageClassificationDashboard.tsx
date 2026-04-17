import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  Brain,
  Pencil,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Download,
  RefreshCw,
  Sparkles,
  Target,
  Activity,
  ChevronDown,
} from 'lucide-react';
import {
  fetchClassificationStats,
  fetchRecentDisagreements,
  exportMonthlyCorrections,
  convertToCSV,
} from '../../modules/inspection-ai/services/classificationAnalyticsService';
import type {
  ClassificationStats,
  DisagreementRow,
} from '../../modules/inspection-ai/services/classificationAnalyticsService';
import type { ImageCategory } from '../../modules/inspection-ai/types';

// ─── Category metadata ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<ImageCategory, string> = {
  drawing:        '#0ea5e9',
  site_photo:     '#10b981',
  defect_closeup: '#ef4444',
  document_scan:  '#3b82f6',
  screenshot:     '#6b7280',
  mixed_content:  '#f59e0b',
  unknown:        '#94a3b8',
};

const CATEGORY_LABELS: Record<ImageCategory, string> = {
  drawing:        'Drawing',
  site_photo:     'Site Photo',
  defect_closeup: 'Defect Close-up',
  document_scan:  'Document Scan',
  screenshot:     'Screenshot',
  mixed_content:  'Mixed Content',
  unknown:        'Unknown',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function confidenceColor(c: number): string {
  if (c >= 0.85) return 'text-emerald-400';
  if (c >= 0.65) return 'text-amber-400';
  return 'text-red-400';
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}22` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function CategoryBar({
  category,
  count,
  total,
  avgConfidence,
  overrideCount,
}: {
  category: ImageCategory;
  count: number;
  total: number;
  avgConfidence: number | null;
  overrideCount: number;
}) {
  const fraction = total > 0 ? count / total : 0;
  const color = CATEGORY_COLORS[category] ?? '#94a3b8';

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-28 flex-shrink-0">
        <p className="text-xs font-semibold text-slate-300 truncate">{CATEGORY_LABELS[category] ?? category}</p>
      </div>
      <div className="flex-1 relative h-5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${fraction * 100}%`, backgroundColor: color }}
        />
        <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white mix-blend-plus-lighter">
          {count.toLocaleString()}
        </span>
      </div>
      <div className="w-16 text-right flex-shrink-0">
        {avgConfidence != null ? (
          <span className={`text-xs font-bold ${confidenceColor(avgConfidence)}`}>
            {pct(avgConfidence)}
          </span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </div>
      <div className="w-16 text-right flex-shrink-0">
        {overrideCount > 0 ? (
          <span className="text-xs font-semibold text-amber-400">{overrideCount} fix{overrideCount !== 1 ? 'es' : ''}</span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </div>
    </div>
  );
}

function DisagreementTable({ rows }: { rows: DisagreementRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left py-2 px-3 text-slate-500 font-semibold uppercase tracking-wider">Heuristic</th>
            <th className="text-left py-2 px-3 text-slate-500 font-semibold uppercase tracking-wider">AI Result</th>
            <th className="text-left py-2 px-3 text-slate-500 font-semibold uppercase tracking-wider">Confidence</th>
            <th className="text-left py-2 px-3 text-slate-500 font-semibold uppercase tracking-wider">Source</th>
            <th className="text-left py-2 px-3 text-slate-500 font-semibold uppercase tracking-wider">Agreed</th>
            <th className="text-left py-2 px-3 text-slate-500 font-semibold uppercase tracking-wider">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
              <td className="py-2 px-3">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  {r.heuristic_category ?? '—'}
                </span>
              </td>
              <td className="py-2 px-3">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[r.ai_category as ImageCategory] ?? '#94a3b8'}22`,
                    color: CATEGORY_COLORS[r.ai_category as ImageCategory] ?? '#94a3b8',
                  }}
                >
                  {r.ai_category}
                </span>
              </td>
              <td className="py-2 px-3">
                {r.ai_confidence != null ? (
                  <span className={`font-bold ${confidenceColor(r.ai_confidence)}`}>
                    {pct(r.ai_confidence)}
                  </span>
                ) : '—'}
              </td>
              <td className="py-2 px-3">
                <span className="flex items-center gap-1 text-slate-400">
                  {r.ai_source === 'gemini' ? <Sparkles className="w-3 h-3 text-sky-400" /> : <Brain className="w-3 h-3 text-emerald-400" />}
                  {r.ai_source}
                </span>
              </td>
              <td className="py-2 px-3">
                {r.agreed ? (
                  <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" />Yes</span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" />No</span>
                )}
              </td>
              <td className="py-2 px-3 text-slate-500">
                {new Date(r.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="py-10 text-center text-slate-600 text-sm">No disagreement data yet</div>
      )}
    </div>
  );
}

// ─── Export controls ───────────────────────────────────────────────────────

function ExportPanel() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [exporting, setExporting] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = await exportMonthlyCorrections(year, month);
      setCount(rows.length);
      if (rows.length === 0) return;
      const csv = convertToCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `classification_corrections_${year}_${String(month).padStart(2, '0')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <Download className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-bold text-white">Monthly Corrections Export</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Download the labeled corrections dataset for a given month. Use for model fine-tuning or audit.
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="appearance-none bg-slate-800 text-white text-sm rounded-xl px-3 py-2 pr-8 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="appearance-none bg-slate-800 text-white text-sm rounded-xl px-3 py-2 pr-8 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
        {count !== null && (
          <span className="text-xs text-slate-400">
            {count === 0 ? 'No corrections this month' : `${count} rows exported`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────

export default function ImageClassificationDashboard() {
  const [stats, setStats] = useState<ClassificationStats | null>(null);
  const [disagreements, setDisagreements] = useState<DisagreementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, d] = await Promise.all([
        fetchClassificationStats(),
        fetchRecentDisagreements(40),
      ]);
      setStats(s);
      setDisagreements(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Loading classification analytics…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-semibold">{error}</p>
          <button onClick={() => setRefreshKey(k => k + 1)} className="mt-3 px-4 py-2 bg-slate-800 text-white text-sm rounded-xl hover:bg-slate-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const s = stats!;
  const totalImages = s.total_images ?? 0;
  const agreementRate = disagreements.length > 0
    ? disagreements.filter(d => d.agreed).length / disagreements.length
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Image Classification Analytics</h1>
              <p className="text-xs text-slate-500">Hybrid heuristic + AI vision pipeline</p>
            </div>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Images"
            value={totalImages.toLocaleString()}
            sub={`${s.pending} pending`}
            icon={Activity}
            color="#0ea5e9"
          />
          <StatCard
            label="AI Classified"
            value={s.ai_classified.toLocaleString()}
            sub={totalImages > 0 ? `${pct(s.ai_classified / totalImages)} of total` : undefined}
            icon={Sparkles}
            color="#10b981"
          />
          <StatCard
            label="AI Correction Rate"
            value={pct(s.ai_correction_rate)}
            sub="heuristic vs AI disagreement"
            icon={TrendingUp}
            color="#f59e0b"
          />
          <StatCard
            label="Manual Override Rate"
            value={pct(s.manual_override_rate)}
            sub={`${s.manually_overridden} overrides`}
            icon={Pencil}
            color="#a855f7"
          />
        </div>

        {/* Confidence + agreement row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Avg AI Confidence"
            value={s.avg_confidence != null ? pct(s.avg_confidence) : '—'}
            sub="across AI-classified images"
            icon={Target}
            color="#0ea5e9"
          />
          {agreementRate != null && (
            <StatCard
              label="Heuristic Agreement"
              value={pct(agreementRate)}
              sub={`from last ${disagreements.length} AI runs`}
              icon={CheckCircle}
              color="#10b981"
            />
          )}
          <StatCard
            label="Worst Category Overrides"
            value={s.worst_categories[0]
              ? `${CATEGORY_LABELS[s.worst_categories[0].category as ImageCategory] ?? s.worst_categories[0].category}`
              : '—'}
            sub={s.worst_categories[0] ? `${s.worst_categories[0].override_count} corrections` : 'No overrides yet'}
            icon={AlertTriangle}
            color="#ef4444"
          />
        </div>

        {/* Category breakdown */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-sky-400" />
              Category Distribution
            </h2>
            <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              <span className="w-16 text-right">Avg Conf</span>
              <span className="w-16 text-right">Overrides</span>
            </div>
          </div>
          {s.by_category.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-6">No classification data yet</p>
          ) : (
            <div className="space-y-1">
              {s.by_category.map((cat) => (
                <CategoryBar
                  key={cat.category}
                  category={cat.category as ImageCategory}
                  count={cat.count}
                  total={totalImages}
                  avgConfidence={cat.avg_confidence}
                  overrideCount={cat.override_count}
                />
              ))}
            </div>
          )}
        </div>

        {/* Worst-performing categories */}
        {s.worst_categories.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Worst-Performing Categories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {s.worst_categories.map((cat, i) => {
                const color = CATEGORY_COLORS[cat.category as ImageCategory] ?? '#94a3b8';
                return (
                  <div key={cat.category} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-black text-slate-600">#{i + 1}</span>
                      <span className="text-xs font-bold" style={{ color }}>
                        {CATEGORY_LABELS[cat.category as ImageCategory] ?? cat.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{cat.count} images</span>
                      <span className="font-bold text-amber-400">{cat.override_count} corrections</span>
                    </div>
                    {cat.avg_confidence != null && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Avg confidence</span>
                          <span className={confidenceColor(cat.avg_confidence)}>{pct(cat.avg_confidence)}</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${cat.avg_confidence * 100}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Disagreement log */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-sky-400" />
            Recent Heuristic vs AI Disagreements
            <span className="ml-auto text-[10px] font-normal text-slate-500">Last 40 events</span>
          </h2>
          <DisagreementTable rows={disagreements} />
        </div>

        {/* Monthly export */}
        <ExportPanel />

      </div>
    </div>
  );
}
