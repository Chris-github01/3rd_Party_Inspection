import { useEffect, useState } from 'react';
import { Navigation, Star, Building2, ChevronDown, Zap, AlertCircle } from 'lucide-react';
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

interface OfficeScore {
  office: Office;
  distanceKm: number | null;
  workloadPct: number;
  score: number;
  recommendation: 'best' | 'good' | 'ok' | 'busy';
  reason: string;
}

interface WorkloadRow {
  office_id: string;
  booked_jobs: number;
  max_jobs_per_week: number;
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

export default function RecommendedOfficeEngine({ siteAddress, selectedOfficeId, onSelectOffice }: Props) {
  const [scores, setScores] = useState<OfficeScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
      const [officeRes, workloadRes] = await Promise.all([
        supabase.from('offices').select('*').eq('active', true).order('is_default', { ascending: false }),
        supabase.from('office_workload')
          .select('office_id, booked_jobs, max_jobs_per_week')
          .gte('week_start', new Date().toISOString().split('T')[0])
          .order('week_start', { ascending: true })
          .limit(50),
      ]);

      const offices: Office[] = officeRes.data ?? [];
      const workloadRows: WorkloadRow[] = workloadRes.data ?? [];

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

      const scored: OfficeScore[] = offices.map(office => {
        let distanceKm: number | null = null;
        if (geo && office.lat && office.lng) {
          distanceKm = Math.round(haversineKm(office.lat, office.lng, geo.lat, geo.lng) * 1.25 * 10) / 10;
        }

        const wl = workloadMap[office.id];
        const workloadPct = wl ? Math.round((wl.booked_jobs / Math.max(wl.max_jobs_per_week, 1)) * 100) : 0;

        let score = 100;
        if (distanceKm !== null) {
          if (distanceKm < 25) score += 30;
          else if (distanceKm < 60) score += 10;
          else if (distanceKm < 150) score -= 10;
          else score -= 25;
        }
        if (office.is_default) score += 5;
        score -= workloadPct * 0.4;

        let recommendation: OfficeScore['recommendation'] = 'ok';
        if (score >= 120) recommendation = 'best';
        else if (score >= 100) recommendation = 'good';
        else if (workloadPct >= 90) recommendation = 'busy';

        const reasons: string[] = [];
        if (distanceKm !== null) reasons.push(`${distanceKm} km away`);
        if (workloadPct > 0) reasons.push(`${workloadPct}% capacity`);
        else reasons.push('capacity unknown');
        if (office.is_default) reasons.push('default');

        return {
          office,
          distanceKm,
          workloadPct,
          score,
          recommendation,
          reason: reasons.join(' · '),
        };
      });

      scored.sort((a, b) => b.score - a.score);
      setScores(scored);

      if (scored.length > 0 && !selectedOfficeId) {
        onSelectOffice(scored[0].office.id, scored[0].office.name);
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
        onClick={() => setExpanded(v => !v)}
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
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {selected && !expanded && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white font-medium">{selected.office.name}</span>
            <span className="text-xs text-slate-500 ml-2">{selected.reason}</span>
          </div>
          {selected.office.is_default && (
            <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          )}
        </div>
      )}

      {expanded && (
        <div className="border-t border-slate-700 divide-y divide-slate-800">
          {scores.map((s, i) => {
            const isSelected = s.office.id === selectedOfficeId;
            const isBest = i === 0;
            return (
              <button
                key={s.office.id}
                onClick={() => { onSelectOffice(s.office.id, s.office.name); setExpanded(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/60 ${
                  isSelected ? 'bg-slate-700/40' : ''
                }`}
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
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {s.distanceKm !== null && (
                      <span>{s.distanceKm} km</span>
                    )}
                    {s.workloadPct > 0 && (
                      <span className={s.workloadPct >= 90 ? 'text-red-400' : s.workloadPct >= 70 ? 'text-amber-400' : 'text-slate-500'}>
                        {s.workloadPct}% capacity
                      </span>
                    )}
                    {s.office.address && (
                      <span className="truncate">{s.office.address}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${SCORE_COLORS[s.recommendation]}`}>
                    {SCORE_LABELS[s.recommendation]}
                  </span>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                  )}
                </div>
              </button>
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
