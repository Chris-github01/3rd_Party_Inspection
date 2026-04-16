import type { PortfolioProjectStat } from '../services/storageService';

export interface PortfolioKPIs {
  totalProjects: number;
  activeProjects: number;
  totalFindings: number;
  criticalFindings: number;
  highRiskProjects: number;
  overrideRate: number;
  avgFindingsPerProject: number;
  mostCommonDefect: string | null;
  mostAffectedSystem: string | null;
}

export interface DefectTrend {
  defect: string;
  count: number;
  highCount: number;
  projects: number;
  riskScore: number;
}

export interface SystemBreakdown {
  system: string;
  count: number;
  high: number;
  medium: number;
  low: number;
  percentage: number;
}

export interface ProjectRiskProfile {
  project: PortfolioProjectStat;
  riskScore: number;
  riskLabel: 'Critical' | 'High' | 'Moderate' | 'Low';
  riskColour: string;
  priority: number;
}

export interface RepeatFailurePattern {
  defect: string;
  system: string;
  projectCount: number;
  totalOccurrences: number;
  highSeverityRate: number;
  isSystemic: boolean;
}

export function computePortfolioKPIs(stats: PortfolioProjectStat[]): PortfolioKPIs {
  const totalFindings = stats.reduce((s, p) => s + p.totalFindings, 0);
  const criticalFindings = stats.reduce((s, p) => s + p.highCount, 0);
  const highRiskProjects = stats.filter((p) => p.highCount > 0).length;
  const activeProjects = stats.filter((p) => p.reportCount > 0).length;
  const overrideProjects = stats.filter((p) => p.hasInspectorOverrides).length;
  const overrideRate = stats.length > 0 ? Math.round((overrideProjects / stats.length) * 100) : 0;

  const defectCounts: Record<string, number> = {};
  const systemCounts: Record<string, number> = {};
  for (const p of stats) {
    for (const d of p.defectTypes) defectCounts[d] = (defectCounts[d] ?? 0) + 1;
    for (const s of p.systemTypes) systemCounts[s] = (systemCounts[s] ?? 0) + 1;
  }
  const mostCommonDefect = Object.entries(defectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const mostAffectedSystem = Object.entries(systemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalProjects: stats.length,
    activeProjects,
    totalFindings,
    criticalFindings,
    highRiskProjects,
    overrideRate,
    avgFindingsPerProject: stats.length > 0 ? Math.round(totalFindings / stats.length) : 0,
    mostCommonDefect,
    mostAffectedSystem,
  };
}

export function computeDefectTrends(stats: PortfolioProjectStat[]): DefectTrend[] {
  const defectMap: Record<string, { count: number; highCount: number; projects: Set<string> }> = {};

  for (const p of stats) {
    const defectsSeen = new Set<string>();
    for (const d of p.defectTypes) {
      if (!defectMap[d]) defectMap[d] = { count: 0, highCount: 0, projects: new Set() };
      if (!defectsSeen.has(d)) {
        defectMap[d].projects.add(p.project.id);
        defectsSeen.add(d);
      }
      defectMap[d].count += 1;
    }
    if (p.highCount > 0) {
      for (const d of p.defectTypes) {
        if (defectMap[d]) defectMap[d].highCount += p.highCount;
      }
    }
  }

  return Object.entries(defectMap)
    .map(([defect, data]) => ({
      defect,
      count: data.count,
      highCount: data.highCount,
      projects: data.projects.size,
      riskScore: data.count * 1 + data.highCount * 2 + data.projects.size * 3,
    }))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 8);
}

export function computeSystemBreakdown(stats: PortfolioProjectStat[]): SystemBreakdown[] {
  const map: Record<string, { count: number; high: number; medium: number; low: number }> = {};

  for (const p of stats) {
    for (const s of p.systemTypes) {
      if (!map[s]) map[s] = { count: 0, high: 0, medium: 0, low: 0 };
      map[s].count += p.totalFindings > 0 ? 1 : 0;
      map[s].high += p.highCount;
      map[s].medium += p.mediumCount;
      map[s].low += p.lowCount;
    }
  }

  const totalCount = Object.values(map).reduce((s, v) => s + v.count, 0);

  return Object.entries(map)
    .map(([system, data]) => ({
      system,
      ...data,
      percentage: totalCount > 0 ? Math.round((data.count / totalCount) * 100) : 0,
    }))
    .sort((a, b) => b.high - a.high);
}

export function computeProjectRiskProfiles(stats: PortfolioProjectStat[]): ProjectRiskProfile[] {
  return stats
    .map((p) => {
      const score =
        p.highCount * 10 +
        p.mediumCount * 3 +
        p.lowCount * 1 +
        (p.hasInspectorOverrides ? 5 : 0) +
        (p.reportCount > 2 ? 3 : 0);

      let riskLabel: ProjectRiskProfile['riskLabel'];
      let riskColour: string;
      if (score >= 30 || p.highCount >= 5) {
        riskLabel = 'Critical';
        riskColour = 'text-red-600 bg-red-50 border-red-200';
      } else if (score >= 15 || p.highCount >= 2) {
        riskLabel = 'High';
        riskColour = 'text-amber-700 bg-amber-50 border-amber-200';
      } else if (score >= 5) {
        riskLabel = 'Moderate';
        riskColour = 'text-yellow-700 bg-yellow-50 border-yellow-200';
      } else {
        riskLabel = 'Low';
        riskColour = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      }

      return { project: p, riskScore: score, riskLabel, riskColour, priority: score };
    })
    .sort((a, b) => b.priority - a.priority);
}

export function detectRepeatFailures(stats: PortfolioProjectStat[]): RepeatFailurePattern[] {
  const defectBySystem: Record<string, { projects: Set<string>; occurrences: number; highCount: number }> = {};

  for (const p of stats) {
    for (const d of p.defectTypes) {
      for (const s of p.systemTypes) {
        const key = `${d}::${s}`;
        if (!defectBySystem[key]) defectBySystem[key] = { projects: new Set(), occurrences: 0, highCount: 0 };
        defectBySystem[key].projects.add(p.project.id);
        defectBySystem[key].occurrences += p.totalFindings;
        defectBySystem[key].highCount += p.highCount;
      }
    }
  }

  return Object.entries(defectBySystem)
    .filter(([, v]) => v.projects.size >= 2)
    .map(([key, v]) => {
      const [defect, system] = key.split('::');
      const highSeverityRate = v.occurrences > 0 ? Math.round((v.highCount / v.occurrences) * 100) : 0;
      return {
        defect,
        system,
        projectCount: v.projects.size,
        totalOccurrences: v.occurrences,
        highSeverityRate,
        isSystemic: v.projects.size >= 3 || highSeverityRate >= 40,
      };
    })
    .sort((a, b) => b.projectCount - a.projectCount || b.highSeverityRate - a.highSeverityRate)
    .slice(0, 6);
}

export function computeMarginOpportunity(stats: PortfolioProjectStat[]): {
  lowBound: number;
  highBound: number;
  label: string;
} {
  const RATES: Record<string, [number, number]> = {
    Intumescent:         [80, 140],
    Cementitious:        [60, 110],
    'Protective Coating':[70, 120],
    Firestopping:        [50, 90],
  };
  const DEFAULT_RATE: [number, number] = [65, 110];
  const SQ_M_PER_FINDING = 2.5;

  let low = 0;
  let high = 0;

  for (const p of stats) {
    const rate = p.systemTypes.length > 0
      ? (RATES[p.systemTypes[0]] ?? DEFAULT_RATE)
      : DEFAULT_RATE;
    const area = p.highCount * SQ_M_PER_FINDING * 1.5 + p.mediumCount * SQ_M_PER_FINDING;
    low  += area * rate[0];
    high += area * rate[1];
  }

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `$${Math.round(n / 1_000)}k`
      : `$${Math.round(n)}`;

  return { lowBound: low, highBound: high, label: `${fmt(low)} – ${fmt(high)}` };
}
