import { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  BarChart2,
  Target,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { fetchOverrideAnalytics } from '../utils/overrideLearning';
import type { OverrideAnalytics } from '../utils/overrideLearning';
import { format } from 'date-fns';

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5 mb-4">
      <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-white [&_svg]:w-3.5 [&_svg]:h-3.5">{icon}</span>
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ label: _label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full bg-slate-800 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function OverrideAnalyticsPanel() {
  const [analytics, setAnalytics] = useState<OverrideAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchOverrideAnalytics();
      setAnalytics(data);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!analytics || analytics.totalOverrides === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
        <Brain className="w-10 h-10 mx-auto text-slate-300 mb-3" />
        <p className="font-semibold text-slate-600 text-sm">No override data yet</p>
        <p className="text-xs text-slate-400 mt-1">
          Every time a senior inspector corrects an AI classification, a learning signal is captured here.
        </p>
      </div>
    );
  }

  const maxFrom = analytics.topCorrectedFrom[0]?.count ?? 1;
  const maxTo = analytics.topCorrectedTo[0]?.count ?? 1;
  const maxSystem = analytics.overrideRateBySystem[0]?.count ?? 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Brain v4 — Learning Intelligence</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {analytics.totalOverrides} senior correction{analytics.totalOverrides !== 1 ? 's' : ''} captured · Updated {format(lastRefreshed, 'h:mm a')}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <Brain className="w-4 h-4 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-slate-900 leading-none">{analytics.totalOverrides}</p>
          <p className="text-xs font-semibold text-slate-600 mt-1">Total Corrections</p>
          <p className="text-[10px] text-slate-400 mt-0.5">labelled training signals</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <Target className="w-4 h-4 text-blue-600 mb-2" />
          <p className="text-2xl font-bold text-slate-900 leading-none">{analytics.topCorrectedFrom.length}</p>
          <p className="text-xs font-semibold text-slate-600 mt-1">AI Patterns Found</p>
          <p className="text-[10px] text-slate-400 mt-0.5">recurring mistake types</p>
        </div>
      </div>

      {analytics.topCorrectedFrom.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <SectionHeader
            icon={<AlertTriangle />}
            title="Most Corrected AI Classifications"
            sub="Where AI most often gets it wrong — ranked by frequency"
          />
          <div className="space-y-4">
            {analytics.topCorrectedFrom.map((row) => (
              <div key={row.aiType}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex-shrink-0">
                      AI: {row.aiType}
                    </span>
                    {row.topCorrection && (
                      <>
                        <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full truncate">
                          {row.topCorrection}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-600 flex-shrink-0 ml-2">{row.count}x</span>
                </div>
                <MiniBar label={row.aiType} count={row.count} max={maxFrom} />
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.topCorrectedTo.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <SectionHeader
            icon={<TrendingUp />}
            title="Most Common Corrections"
            sub="What senior inspectors actually classified — learning targets"
          />
          <div className="space-y-3">
            {analytics.topCorrectedTo.map((row) => (
              <div key={row.finalType}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">{row.finalType}</span>
                  <span className="text-xs font-bold text-slate-600 flex-shrink-0 ml-2">{row.count}</span>
                </div>
                <MiniBar label={row.finalType} count={row.count} max={maxTo} />
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.overrideRateBySystem.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <SectionHeader
            icon={<Layers />}
            title="Corrections by System Type"
            sub="Which systems generate the most inspector corrections"
          />
          <div className="space-y-3">
            {analytics.overrideRateBySystem.map((row) => (
              <div key={row.system}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700">{row.system}</span>
                  <span className="text-xs font-bold text-slate-600">{row.count}</span>
                </div>
                <MiniBar label={row.system} count={row.count} max={maxSystem} />
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.recentOverrides.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <SectionHeader
            icon={<BarChart2 />}
            title="Recent Corrections"
            sub="Latest senior inspector overrides captured"
          />
          <div className="divide-y divide-slate-100">
            {analytics.recentOverrides.slice(0, 5).map((r) => (
              <div key={r.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
                      {r.ai_defect_type}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                      {r.final_defect_type}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {r.system_type} · {r.element_type} · {r.environment}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                  {format(new Date(r.created_at), 'd MMM')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">How v4 Learning Works</p>
        </div>
        <div className="space-y-2.5">
          {[
            'Every inspector correction is captured as a labelled signal',
            'Similar future cases are matched by system + element + concern',
            'Confidence scores are boosted when patterns align with prior corrections',
            'Coaching prompts appear when 2+ similar overrides exist',
            'Human authority is never replaced — only guided',
          ].map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
