import { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Flame,
  BarChart2,
  Layers,
  RefreshCw,
  Building2,
  ChevronRight,
  Activity,
  Target,
  DollarSign,
  Repeat2,
  ShieldAlert,
  CheckCircle,
  Info,
} from 'lucide-react';
import { fetchPortfolioStats } from '../services/storageService';
import type { PortfolioProjectStat } from '../services/storageService';
import {
  computePortfolioKPIs,
  computeDefectTrends,
  computeSystemBreakdown,
  computeProjectRiskProfiles,
  detectRepeatFailures,
  computeMarginOpportunity,
} from '../utils/executiveDashboardEngine';
import type {
  PortfolioKPIs,
  DefectTrend,
  SystemBreakdown,
  ProjectRiskProfile,
  RepeatFailurePattern,
} from '../utils/executiveDashboardEngine';
import { format } from 'date-fns';

const SYSTEM_COLOURS: Record<string, string> = {
  Intumescent:          'bg-red-500',
  Cementitious:         'bg-amber-500',
  'Protective Coating': 'bg-blue-500',
  Firestopping:         'bg-emerald-500',
};

function KPICard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'red' | 'amber' | 'green' | 'blue' | 'default';
  icon: React.ReactNode;
}) {
  const accentClasses: Record<string, string> = {
    red:     'bg-red-50 border-red-200',
    amber:   'bg-amber-50 border-amber-200',
    green:   'bg-emerald-50 border-emerald-200',
    blue:    'bg-blue-50 border-blue-200',
    default: 'bg-white border-slate-200',
  };
  const iconClasses: Record<string, string> = {
    red:     'text-red-600',
    amber:   'text-amber-600',
    green:   'text-emerald-600',
    blue:    'text-blue-600',
    default: 'text-slate-600',
  };
  const a = accent ?? 'default';

  return (
    <div className={`rounded-2xl border p-4 ${accentClasses[a]}`}>
      <div className={`mb-2 ${iconClasses[a]}`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      <p className="text-xs font-semibold text-slate-600 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function RiskBar({ value, max, colour }: { value: number; max: number; colour: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

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

function ProjectRiskCard({
  profile,
  onSelect,
}: {
  profile: ProjectRiskProfile;
  onSelect: (p: PortfolioProjectStat) => void;
}) {
  const p = profile.project;
  return (
    <button
      onClick={() => onSelect(p)}
      className="w-full bg-white rounded-xl border border-slate-200 hover:border-slate-400 transition-all p-4 text-left flex items-center gap-3 active:scale-99"
    >
      <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Building2 className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-bold text-slate-900 truncate">{p.project.project_name}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${profile.riskColour}`}>
            {profile.riskLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {p.highCount > 0 && <span className="text-red-500 font-semibold">{p.highCount} High</span>}
          {p.mediumCount > 0 && <span className="text-amber-500 font-semibold">{p.mediumCount} Med</span>}
          {p.lowCount > 0 && <span className="text-slate-400">{p.lowCount} Low</span>}
          {p.project.client_name && <span className="truncate">{p.project.client_name}</span>}
        </div>
        <RiskBar value={profile.riskScore} max={60} colour={
          profile.riskLabel === 'Critical' ? 'bg-red-500' :
          profile.riskLabel === 'High'     ? 'bg-amber-500' :
          profile.riskLabel === 'Moderate' ? 'bg-yellow-400' :
          'bg-emerald-400'
        } />
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
    </button>
  );
}

function DefectTrendRow({ trend, max }: { trend: DefectTrend; max: number }) {
  const pct = max > 0 ? Math.round((trend.riskScore / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-700 truncate max-w-[160px]">{trend.defect}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {trend.highCount > 0 && (
            <span className="text-[10px] font-bold text-red-600">{trend.highCount}H</span>
          )}
          <span className="text-[10px] text-slate-400">{trend.projects} proj</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-slate-800" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RepeatFailureCard({ pattern }: { pattern: RepeatFailurePattern }) {
  return (
    <div className={`rounded-xl border p-3.5 ${pattern.isSystemic ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {pattern.isSystemic
            ? <ShieldAlert className="w-4 h-4 text-red-600" />
            : <Repeat2 className="w-4 h-4 text-amber-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900">{pattern.defect}</span>
            {pattern.isSystemic && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full">
                Systemic
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{pattern.system}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-semibold">
            <span className="text-slate-600">{pattern.projectCount} projects affected</span>
            <span className="text-red-600">{pattern.highSeverityRate}% high severity</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  onSelectProject: (stat: PortfolioProjectStat) => void;
}

export function ExecutiveDashboard({ onSelectProject }: Props) {
  const [stats, setStats] = useState<PortfolioProjectStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetchPortfolioStats();
      setStats(data);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading portfolio…</p>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <BarChart2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
        <p className="font-semibold text-slate-600 text-sm">No portfolio data yet</p>
        <p className="text-xs text-slate-400 mt-1">
          Create projects and run inspections to see portfolio intelligence
        </p>
      </div>
    );
  }

  const kpis = computePortfolioKPIs(stats);
  const trends = computeDefectTrends(stats);
  const systems = computeSystemBreakdown(stats);
  const riskProfiles = computeProjectRiskProfiles(stats);
  const repeats = detectRepeatFailures(stats);
  const margin = computeMarginOpportunity(stats);
  const maxTrendScore = trends[0]?.riskScore ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Portfolio Intelligence</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Across {kpis.totalProjects} project{kpis.totalProjects !== 1 ? 's' : ''} · Updated {format(lastRefreshed, 'h:mm a')}
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

      {kpis.criticalFindings > 0 && (
        <div className="bg-red-600 rounded-2xl p-4 text-white flex items-start gap-3">
          <Flame className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">
              {kpis.criticalFindings} critical finding{kpis.criticalFindings !== 1 ? 's' : ''} across {kpis.highRiskProjects} project{kpis.highRiskProjects !== 1 ? 's' : ''}
            </p>
            <p className="text-red-200 text-xs mt-0.5">
              Immediate review and remediation action required.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <KPICard
          label="Total Findings"
          value={kpis.totalFindings}
          sub={`avg ${kpis.avgFindingsPerProject} per project`}
          icon={<Activity className="w-4 h-4" />}
        />
        <KPICard
          label="Critical Findings"
          value={kpis.criticalFindings}
          sub={`${kpis.highRiskProjects} projects affected`}
          accent={kpis.criticalFindings > 0 ? 'red' : 'default'}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <KPICard
          label="Margin Opportunity"
          value={margin.label}
          sub="indicative, unverified"
          accent="blue"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KPICard
          label="AI Override Rate"
          value={`${kpis.overrideRate}%`}
          sub="inspector corrections"
          accent={kpis.overrideRate > 40 ? 'amber' : 'default'}
          icon={<Target className="w-4 h-4" />}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <SectionHeader icon={<AlertTriangle />} title="Project Risk Matrix" sub="Ranked by combined severity score" />
        <div className="space-y-2">
          {riskProfiles.slice(0, 5).map((profile) => (
            <ProjectRiskCard
              key={profile.project.project.id}
              profile={profile}
              onSelect={onSelectProject}
            />
          ))}
        </div>
        {riskProfiles.length > 5 && (
          <p className="text-center text-xs text-slate-400 mt-3">
            +{riskProfiles.length - 5} more project{riskProfiles.length - 5 !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {repeats.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <SectionHeader
            icon={<Repeat2 />}
            title="Repeat Failure Patterns"
            sub="Defects recurring across multiple projects"
          />
          <div className="space-y-2.5">
            {repeats.map((r, i) => (
              <RepeatFailureCard key={i} pattern={r} />
            ))}
          </div>
          <div className="flex items-start gap-1.5 mt-3 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
            <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500">Systemic patterns suggest common contractor or material failures requiring portfolio-level intervention.</p>
          </div>
        </div>
      )}

      {trends.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <SectionHeader icon={<TrendingUp />} title="Defect Trend Analysis" sub="Ranked by risk score (frequency × severity × spread)" />
          <div className="space-y-4">
            {trends.map((t) => (
              <DefectTrendRow key={t.defect} trend={t} max={maxTrendScore} />
            ))}
          </div>
          {kpis.mostCommonDefect && (
            <div className="mt-4 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
              <p className="text-[11px] font-semibold text-slate-600">
                Most prevalent: <span className="text-slate-900">{kpis.mostCommonDefect}</span>
                {kpis.mostAffectedSystem && (
                  <> in <span className="text-slate-900">{kpis.mostAffectedSystem}</span></>
                )} systems
              </p>
            </div>
          )}
        </div>
      )}

      {systems.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <SectionHeader icon={<Layers />} title="System Coverage Breakdown" sub="Distribution of findings by system type" />
          <div className="space-y-3">
            {systems.map((s) => (
              <div key={s.system}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${SYSTEM_COLOURS[s.system] ?? 'bg-slate-400'}`} />
                    <span className="text-xs font-semibold text-slate-700">{s.system}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    {s.high > 0 && <span className="text-red-500">{s.high}H</span>}
                    {s.medium > 0 && <span className="text-amber-500">{s.medium}M</span>}
                    {s.low > 0 && <span className="text-slate-400">{s.low}L</span>}
                    <span className="text-slate-400">{s.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${SYSTEM_COLOURS[s.system] ?? 'bg-slate-400'}`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Margin Opportunity Summary</p>
        </div>
        <p className="text-3xl font-bold leading-none">{margin.label}</p>
        <p className="text-slate-400 text-xs mt-2">
          Estimated variation opportunity from {kpis.criticalFindings + Math.round(kpis.totalFindings * 0.4)} high/medium severity findings.
          Based on indicative remediation rates by system type.
        </p>
        <div className="flex items-start gap-1.5 mt-3 bg-slate-800 rounded-xl px-3 py-2 border border-slate-700">
          <CheckCircle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500">
            Indicative estimate only. Actual variation value depends on verified area measurements, contractor rates, and scope confirmation on site.
          </p>
        </div>
      </div>
    </div>
  );
}
