import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  AlertTriangle,
  BarChart2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react';
import type { InspectionAIItem } from '../types';
import { generateCommercialSummary } from '../utils/summaryEngine';
import { estimateCost, estimateTotalCost, COST_DISCLAIMER } from '../utils/costEstimator';
import { calculateTrends } from '../utils/trendEngine';
import { forecastRisk, getForecastColour } from '../utils/forecastEngine';
import { loadHistory, compareInspections } from '../utils/historyEngine';
import type { InspectionSnapshot } from '../utils/historyEngine';
import { getRiskTailwindClass } from '../utils/riskEngine';

interface Props {
  items: InspectionAIItem[];
  reportId: string;
  projectName: string;
  previousSnapshot?: InspectionSnapshot;
}

function KPICard({
  label,
  value,
  sub,
  colour,
  icon,
  delta,
}: {
  label: string;
  value: string;
  sub?: string;
  colour: 'red' | 'amber' | 'blue' | 'slate' | 'emerald';
  icon: React.ReactNode;
  delta?: { value: number; label: string };
}) {
  const bg: Record<string, string> = {
    red: 'bg-red-50 border-red-100',
    amber: 'bg-amber-50 border-amber-100',
    blue: 'bg-blue-50 border-blue-100',
    slate: 'bg-slate-50 border-slate-100',
    emerald: 'bg-emerald-50 border-emerald-100',
  };
  const text: Record<string, string> = {
    red: 'text-red-700',
    amber: 'text-amber-700',
    blue: 'text-blue-800',
    slate: 'text-slate-800',
    emerald: 'text-emerald-700',
  };
  const iconBg: Record<string, string> = {
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    slate: 'bg-slate-200 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-600',
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${bg[colour]}`}>
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg[colour]}`}>
          {icon}
        </div>
        {delta && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${delta.value > 0 ? 'text-red-600' : delta.value < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
            {delta.value > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : delta.value < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <Minus className="w-3 h-3" />}
            {Math.abs(delta.value)} {delta.label}
          </div>
        )}
      </div>
      <div>
        <p className={`text-xl font-bold leading-tight ${text[colour]}`}>{value}</p>
        {sub && <p className={`text-xs mt-0.5 ${text[colour]} opacity-70`}>{sub}</p>}
        <p className="text-xs text-slate-500 mt-1 font-semibold">{label}</p>
      </div>
    </div>
  );
}

function MiniBar({ label, count, max, colour }: { label: string; count: number; max: number; colour: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-600 font-medium truncate max-w-[150px]">{label}</span>
        <span className="text-xs font-bold text-slate-700 ml-2 flex-shrink-0">{count}</span>
      </div>
      <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function InspectionDashboard({ items, reportId, projectName, previousSnapshot }: Props) {
  const summary = useMemo(() => generateCommercialSummary(items), [items]);
  const trends = useMemo(() => calculateTrends(items), [items]);
  const totalCost = useMemo(() => estimateTotalCost(summary.groups), [summary.groups]);

  const comparison = useMemo(() => {
    if (previousSnapshot) return compareInspections(summary, previousSnapshot);
    const history = loadHistory();
    const prev = history.find((s) => s.project_name === projectName && s.report_id !== reportId);
    return prev ? compareInspections(summary, prev) : null;
  }, [summary, previousSnapshot, projectName, reportId]);

  const groupsWithCostAndForecast = useMemo(
    () =>
      summary.groups.map((group) => ({
        group,
        cost: estimateCost(group),
        forecast: forecastRisk(group),
      })),
    [summary.groups]
  );

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <BarChart2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No findings yet</p>
        <p className="text-xs text-slate-400 mt-1">Save findings to see intelligence dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center">
            <BarChart2 className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="font-bold text-slate-900 text-sm">Intelligence Dashboard</h2>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
          Internal only
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KPICard
          label="Total Findings"
          value={String(summary.total_findings)}
          colour="slate"
          icon={<Layers className="w-4 h-4" />}
          delta={comparison ? { value: comparison.change_in_findings, label: 'vs prev' } : undefined}
        />
        <KPICard
          label="High-Risk Groups"
          value={String(summary.high_risk_count)}
          colour={summary.high_risk_count > 0 ? 'red' : 'emerald'}
          icon={<AlertTriangle className="w-4 h-4" />}
          delta={comparison ? { value: comparison.change_in_high_risk, label: 'vs prev' } : undefined}
        />
        <KPICard
          label="Est. Cost Exposure"
          value={totalCost.formatted}
          sub="Indicative only"
          colour="blue"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KPICard
          label="Est. Affected Area"
          value={summary.total_scope_range}
          colour="amber"
          icon={<BarChart2 className="w-4 h-4" />}
        />
      </div>

      {comparison && (
        <div className={`rounded-2xl border p-3.5 flex items-center gap-3 ${
          comparison.trend === 'improving' ? 'bg-emerald-50 border-emerald-200' :
          comparison.trend === 'worsening' ? 'bg-red-50 border-red-200' :
          'bg-slate-50 border-slate-200'
        }`}>
          {comparison.trend === 'improving' ? (
            <TrendingDown className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : comparison.trend === 'worsening' ? (
            <TrendingUp className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : (
            <Minus className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <p className={`text-xs font-semibold ${
            comparison.trend === 'improving' ? 'text-emerald-800' :
            comparison.trend === 'worsening' ? 'text-red-800' :
            'text-slate-600'
          }`}>
            {comparison.summary}
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-300" />
          <h3 className="text-white font-bold text-sm">Commercial Impact by Group</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {groupsWithCostAndForecast.map(({ group, cost, forecast }, i) => (
            <div key={i} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{group.defect_type}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getRiskTailwindClass(group.risk_level)}`}>
                      {group.risk_level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{group.system_type} · {group.count} occurrence{group.count !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-blue-800">{cost.formatted}</p>
                  <p className="text-xs text-slate-400">est. cost range</p>
                </div>
              </div>

              <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${getForecastColour(forecast.urgency)}`}>
                <span className="font-bold">{forecast.label}: </span>
                {forecast.description}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Area: <strong className="text-slate-700">{group.estimated_area}</strong></span>
                <span>Scope: <strong className="text-slate-700">{group.estimated_area_m2} m²</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">Defect Frequency</h3>
          </div>
          {trends.defect_trends.length > 0 ? (
            <div className="space-y-2.5">
              {trends.defect_trends.map((t) => (
                <MiniBar
                  key={t.defect_type}
                  label={`${t.defect_type} (${t.percentage}%)`}
                  count={t.count}
                  max={trends.defect_trends[0].count}
                  colour="bg-slate-700"
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No data</p>
          )}
          {trends.concentration_warning && trends.dominant_defect && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>{trends.dominant_defect}</strong> accounts for {trends.defect_trends[0]?.percentage}% of all findings — possible systemic cause.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">System Distribution</h3>
          </div>
          {trends.system_trends.length > 0 ? (
            <div className="space-y-2.5">
              {trends.system_trends.map((t) => {
                const colours: Record<string, string> = {
                  'Intumescent': 'bg-red-500',
                  'Cementitious': 'bg-amber-500',
                  'Protective Coating': 'bg-blue-500',
                  'Firestopping': 'bg-slate-600',
                };
                return (
                  <MiniBar
                    key={t.system_type}
                    label={`${t.system_type} (${t.percentage}%)`}
                    count={t.count}
                    max={trends.system_trends[0].count}
                    colour={colours[t.system_type] ?? 'bg-slate-500'}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No data</p>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Cost Disclaimer:</strong> {COST_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
