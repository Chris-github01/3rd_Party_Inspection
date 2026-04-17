import { useEffect, useState } from 'react';
import { Navigation, Star, Building2, ChevronDown, Zap, AlertCircle, TrendingUp, Users, MapPin, Info } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Office {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  travel_km_rate: number;
  is_cbd: boolean;
  active: boolean;
}

interface WorkloadRow {
  office_id: string;
  booked_jobs: number;
  max_jobs_per_week: number;
}

interface AutoWorkloadRow {
  office_id: string;
  auto_booked_jobs: number;
  auto_quote_value: number;
  pending_quotes: number;
}

interface ScoreBreakdown {
  distanceScore: number;
  capacityScore: number;
  marginScore: number;
  defaultBonus: number;
  total: number;
  distancePct: number;
  capacityPct: number;
  marginPct: number;
}

interface ExplainReason {
  icon: 'distance' | 'capacity' | 'margin' | 'default';
  label: string;
  positive: boolean;
}

interface OfficeScore {
  office: Office;
  distanceKm: number | null;
  workloadPct: number;
  autoBookedJobs: number;
  pendingQuotes: number;
  autoQuoteValue: number;
  score: ScoreBreakdown;
  confidence: 'high' | 'medium' | 'low';
  recommendation: 'best' | 'good' | 'ok' | 'busy';
  reasons: ExplainReason[];
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=nz`;
    const res = await fetch(url, { headers: { 'User-Agent': 'BurnRatePro/1.0' } });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

function computeScore(
  office: Office,
  distanceKm: number | null,
  workloadPct: number,
  bestOfficeValue: number,
  ownValue: number,
): ScoreBreakdown {
  let distanceScore = 0;
  if (distanceKm !== null) {
    if (distanceKm < 25) distanceScore = 40;
    else if (distanceKm < 60) distanceScore = 20;
    else if (distanceKm < 150) distanceScore = 5;
    else distanceScore = -15;
  }

  const capacityScore = Math.max(-20, 30 - workloadPct * 0.5);

  const marginScore = bestOfficeValue > 0
    ? Math.round(((ownValue - bestOfficeValue) / bestOfficeValue) * 20)
    : 0;

  const defaultBonus = office.is_default ? 5 : 0;

  const total = 100 + distanceScore + capacityScore + marginScore + defaultBonus;

  const rawSum = Math.abs(distanceScore) + Math.abs(capacityScore) + Math.abs(marginScore) + 0.01;
  return {
    distanceScore,
    capacityScore,
    marginScore,
    defaultBonus,
    total,
    distancePct: Math.round((Math.abs(distanceScore) / rawSum) * 100),
    capacityPct: Math.round((Math.abs(capacityScore) / rawSum) * 100),
    marginPct: Math.round((Math.abs(marginScore) / rawSum) * 100),
  };
}

function buildReasons(
  s: OfficeScore,
  allScores: OfficeScore[],
): ExplainReason[] {
  const reasons: ExplainReason[] = [];

  if (s.distanceKm !== null) {
    const others = allScores.filter(o => o.office.id !== s.office.id && o.distanceKm !== null);
    const avgOtherDist = others.length
      ? others.reduce((a, o) => a + (o.distanceKm ?? 0), 0) / others.length
      : null;

    if (avgOtherDist !== null && s.distanceKm < avgOtherDist) {
      const diff = Math.round(avgOtherDist - s.distanceKm);
      reasons.push({ icon: 'distance', label: `${diff} km closer than alternatives`, positive: true });
    } else if (s.distanceKm < 25) {
      reasons.push({ icon: 'distance', label: `${s.distanceKm} km — local zone`, positive: true });
    } else if (s.distanceKm >= 150) {
      reasons.push({ icon: 'distance', label: `${s.distanceKm} km — national zone`, positive: false });
    } else {
      reasons.push({ icon: 'distance', label: `${s.distanceKm} km from site`, positive: s.distanceKm < 60 });
    }
  }

  const availPct = 100 - s.workloadPct;
  if (availPct >= 60) {
    reasons.push({ icon: 'capacity', label: `${availPct}% capacity available`, positive: true });
  } else if (availPct >= 30) {
    reasons.push({ icon: 'capacity', label: `${availPct}% capacity remaining`, positive: true });
  } else if (s.workloadPct >= 90) {
    reasons.push({ icon: 'capacity', label: `Near full capacity (${s.workloadPct}% booked)`, positive: false });
  } else {
    reasons.push({ icon: 'capacity', label: `${s.workloadPct}% booked`, positive: false });
  }

  if (s.autoQuoteValue > 0) {
    const best = allScores.reduce((a, o) => o.autoQuoteValue > a ? o.autoQuoteValue : a, 0);
    const margPct = best > 0 ? Math.round(((s.autoQuoteValue - best) / best) * 100) : 0;
    if (margPct >= 5) {
      reasons.push({ icon: 'margin', label: `Highest projected margin (+${margPct}%)`, positive: true });
    } else if (s.autoQuoteValue > 0) {
      reasons.push({ icon: 'margin', label: `$${Math.round(s.autoQuoteValue / 1000)}k recent quote value`, positive: true });
    }
  }

  if (s.office.is_default) {
    reasons.push({ icon: 'default', label: 'Default departure office', positive: true });
  }

  return reasons.slice(0, 3);
}

function deriveConfidence(
  s: OfficeScore,
  hasGeo: boolean,
  hasWorkload: boolean,
): 'high' | 'medium' | 'low' {
  if (hasGeo && hasWorkload) return 'high';
  if (hasGeo || hasWorkload) return 'medium';
  return 'low';
}

interface Props {
  siteAddress: string;
  selectedOfficeId: string;
  onSelectOffice: (officeId: string, officeName: string) => void;
}

const SCORE_COLORS: Record<string, string> = {
  best: 'text-emerald-400 bg-emerald-900/30 border-emerald-800',
  good: 'text-blue-400 bg-blue-900/30 border-blue-800',
  ok: 'text-amber-400 bg-amber-900/30 border-amber-800',
  busy: 'text-red-400 bg-red-900/30 border-red-800',
};

const SCORE_LABELS: Record<string, string> = {
  best: 'Best match',
  good: 'Good',
  ok: 'Viable',
  busy: 'Near capacity',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-emerald-400',
  medium: 'text-amber-400',
  low: 'text-slate-500',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

function ReasonIcon({ icon }: { icon: ExplainReason['icon'] }) {
  if (icon === 'distance') return <MapPin className="w-3 h-3 flex-shrink-0" />;
  if (icon === 'capacity') return <Users className="w-3 h-3 flex-shrink-0" />;
  if (icon === 'margin') return <TrendingUp className="w-3 h-3 flex-shrink-0" />;
  return <Star className="w-3 h-3 flex-shrink-0" />;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 w-6 text-right flex-shrink-0">{pct}%</span>
    </div>
  );
}

function ExplainPanel({ score }: { score: OfficeScore }) {
  return (
    <div className="mt-2 bg-slate-900/60 rounded-lg p-3 space-y-2 border border-slate-700/50">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Why this office?</p>
      <div className="space-y-1">
        {score.reasons.map((r, i) => (
          <div key={i} className={`flex items-center gap-1.5 text-xs ${r.positive ? 'text-slate-300' : 'text-slate-500'}`}>
            <span className={r.positive ? 'text-emerald-400' : 'text-red-400'}>
              <ReasonIcon icon={r.icon} />
            </span>
            {r.label}
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-slate-700/50 space-y-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Score breakdown</p>
        <ScoreBar label="Distance" value={score.score.distancePct} color="bg-blue-500" />
        <ScoreBar label="Capacity" value={score.score.capacityPct} color="bg-emerald-500" />
        <ScoreBar label="Margin" value={score.score.marginPct} color="bg-amber-500" />
      </div>
      <div className="flex items-center gap-1 pt-1">
        <Info className="w-3 h-3 flex-shrink-0 text-slate-500" />
        <span className={`text-[10px] ${CONFIDENCE_COLORS[score.confidence]}`}>
          {CONFIDENCE_LABELS[score.confidence]}
        </span>
      </div>
    </div>
  );
}

export default function RecommendedOfficeEngine({ siteAddress, selectedOfficeId, onSelectOffice }: Props) {
  const [scores, setScores] = useState<OfficeScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [siteGeo, setSiteGeo] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (siteAddress?.trim().length >= 5) {
      const timer = setTimeout(() => loadScores(siteAddress), 800);
      return () => clearTimeout(timer);
    } else {
      loadScores(null);
    }
  }, [siteAddress]);

  async function loadScores(address: string | null) {
    setLoading(true);
    try {
      const [officeRes, workloadRes, autoWorkloadRes] = await Promise.all([
        supabase.from('offices').select('*').eq('active', true).order('is_default', { ascending: false }),
        supabase.from('office_workload')
          .select('office_id, booked_jobs, max_jobs_per_week')
          .gte('week_start', new Date().toISOString().split('T')[0])
          .order('week_start', { ascending: true })
          .limit(50),
        supabase.from('office_workload_auto').select('office_id, auto_booked_jobs, auto_quote_value, pending_quotes'),
      ]);

      const offices: Office[] = officeRes.data ?? [];
      const workloadRows: WorkloadRow[] = workloadRes.data ?? [];
      const autoWorkload: AutoWorkloadRow[] = autoWorkloadRes.data ?? [];

      let geo: { lat: number; lng: number } | null = null;
      if (address) {
        geo = await geocodeAddress(address);
        setSiteGeo(geo);
      }

      const workloadMap: Record<string, WorkloadRow> = {};
      workloadRows.forEach(w => {
        if (!workloadMap[w.office_id] || w.booked_jobs > workloadMap[w.office_id].booked_jobs) {
          workloadMap[w.office_id] = w;
        }
      });

      const autoMap: Record<string, AutoWorkloadRow> = {};
      autoWorkload.forEach(a => { autoMap[a.office_id] = a; });

      const bestValue = autoWorkload.reduce((best, a) => a.auto_quote_value > best ? a.auto_quote_value : best, 0);

      const scored: OfficeScore[] = offices.map(office => {
        let distanceKm: number | null = null;
        if (geo && office.lat && office.lng) {
          distanceKm = Math.round(haversineKm(office.lat, office.lng, geo.lat, geo.lng) * 1.25 * 10) / 10;
        }

        const wl = workloadMap[office.id];
        const auto = autoMap[office.id];

        const manualWorkloadPct = wl ? Math.round((wl.booked_jobs / Math.max(wl.max_jobs_per_week, 1)) * 100) : 0;
        const autoBookedJobs = auto?.auto_booked_jobs ?? 0;
        const autoQuoteValue = auto?.auto_quote_value ?? 0;
        const pendingQuotes = auto?.pending_quotes ?? 0;

        const effectiveWorkloadPct = wl
          ? manualWorkloadPct
          : autoBookedJobs > 0
            ? Math.min(100, autoBookedJobs * 10)
            : 0;

        const scoreBreakdown = computeScore(office, distanceKm, effectiveWorkloadPct, bestValue, autoQuoteValue);

        let recommendation: OfficeScore['recommendation'] = 'ok';
        if (scoreBreakdown.total >= 120) recommendation = 'best';
        else if (scoreBreakdown.total >= 100) recommendation = 'good';
        else if (effectiveWorkloadPct >= 90) recommendation = 'busy';

        const hasGeo = geo !== null && office.lat !== null;
        const hasWorkload = wl !== null || autoBookedJobs > 0;
        const confidence = deriveConfidence({ office, distanceKm, workloadPct: effectiveWorkloadPct, autoBookedJobs, pendingQuotes, autoQuoteValue, score: scoreBreakdown, confidence: 'high', recommendation, reasons: [] }, hasGeo, hasWorkload);

        return {
          office,
          distanceKm,
          workloadPct: effectiveWorkloadPct,
          autoBookedJobs,
          pendingQuotes,
          autoQuoteValue,
          score: scoreBreakdown,
          confidence,
          recommendation,
          reasons: [],
        };
      });

      scored.sort((a, b) => b.score.total - a.score.total);

      const withReasons = scored.map(s => ({
        ...s,
        reasons: buildReasons(s, scored),
      }));

      setScores(withReasons);

      if (withReasons.length > 0 && !selectedOfficeId) {
        onSelectOffice(withReasons[0].office.id, withReasons[0].office.name);
      }
    } catch (err) {
      console.error('RecommendedOfficeEngine error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (scores.length === 0 && !loading) return null;

  const best = scores[0];
  const selected = scores.find(s => s.office.id === selectedOfficeId) ?? best;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/60 transition-colors"
        onClick={() => { setExpanded(v => !v); setShowExplain(false); }}
      >
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Recommended Office</span>
          {loading && (
            <div className="w-3.5 h-3.5 border border-slate-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected && (
            <span className={`text-[10px] px-2 py-0.5 rounded border ${SCORE_COLORS[selected.recommendation]}`}>
              {SCORE_LABELS[selected.recommendation]}
            </span>
          )}
          {selected && (
            <span className={`text-[10px] ${CONFIDENCE_COLORS[selected.confidence]}`}>
              {selected.confidence === 'high' ? 'High' : selected.confidence === 'medium' ? 'Med' : 'Low'} conf.
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {selected && !expanded && (
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-white font-medium">{selected.office.name}</span>
            </div>
            {selected.office.is_default && (
              <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            )}
            <button
              onClick={e => { e.stopPropagation(); setShowExplain(v => !v); }}
              className={`p-1 rounded transition-colors ${showExplain ? 'text-blue-400 bg-blue-900/30' : 'text-slate-500 hover:text-slate-300'}`}
              title="Why this office?"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          {showExplain && selected && (
            <ExplainPanel score={selected} />
          )}
        </div>
      )}

      {expanded && (
        <div className="border-t border-slate-700 divide-y divide-slate-800">
          {scores.map((s, i) => {
            const isSelected = s.office.id === selectedOfficeId;
            const isBest = i === 0;
            return (
              <div key={s.office.id} className={`${isSelected ? 'bg-slate-700/40' : ''}`}>
                <button
                  onClick={() => { onSelectOffice(s.office.id, s.office.name); setExpanded(false); setShowExplain(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/60"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm text-white font-medium truncate">{s.office.name}</span>
                      {isBest && (
                        <span className="text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />
                          Recommended
                        </span>
                      )}
                      {s.office.is_default && (
                        <span className="text-[10px] bg-blue-900/40 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {s.distanceKm !== null && <span>{s.distanceKm} km</span>}
                      <span className={s.workloadPct >= 90 ? 'text-red-400' : s.workloadPct >= 70 ? 'text-amber-400' : 'text-slate-500'}>
                        {100 - s.workloadPct}% capacity
                      </span>
                      {s.autoBookedJobs > 0 && (
                        <span className="text-slate-600">{s.autoBookedJobs} active jobs</span>
                      )}
                      {s.pendingQuotes > 0 && (
                        <span className="text-slate-600">{s.pendingQuotes} pending</span>
                      )}
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      <ScoreBar label="Distance" value={s.score.distancePct} color="bg-blue-500/70" />
                      <ScoreBar label="Capacity" value={s.score.capacityPct} color="bg-emerald-500/70" />
                      {s.score.marginPct > 0 && (
                        <ScoreBar label="Margin" value={s.score.marginPct} color="bg-amber-500/70" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${SCORE_COLORS[s.recommendation]}`}>
                      {SCORE_LABELS[s.recommendation]}
                    </span>
                    <span className={`text-[10px] ${CONFIDENCE_COLORS[s.confidence]}`}>
                      {CONFIDENCE_LABELS[s.confidence]}
                    </span>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                  </div>
                </button>

                {isSelected && (
                  <div className="px-4 pb-3">
                    <ExplainPanel score={s} />
                  </div>
                )}
              </div>
            );
          })}
          {!siteGeo && siteAddress?.trim().length >= 5 && (
            <div className="px-4 py-2 flex items-center gap-1.5 text-xs text-amber-400/80">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Could not geocode site address — distances estimated
            </div>
          )}
        </div>
      )}
    </div>
  );
}
