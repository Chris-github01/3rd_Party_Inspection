import { useState, useRef, useCallback } from 'react';
import {
  MapPin, Navigation, Clock, Car, AlertTriangle,
  CheckCircle, RefreshCw, ToggleLeft, ToggleRight, Info,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export interface TravelPricingResult {
  distanceKm: number;
  distanceKmReturn: number;
  travelTimeMinutes: number;
  zone: 'local' | 'extended' | 'regional' | 'national';
  zoneLabel: string;
  zoneDescription: string;
  suggestedTravelCost: number;
  travelSurcharge: number;
  parkingNote: string;
  source: 'google' | 'osm' | 'haversine_estimate';
  notes: string[];
}

interface Props {
  siteAddress: string;
  onApply: (opts: {
    travelZone: string;
    travelKm: number;
    travelSurcharge: number;
    suggestedTravelCost: number;
    parkingNote: string;
  }) => void;
}

const ZONE_COLORS: Record<string, string> = {
  local:    'text-emerald-400 bg-emerald-900/30 border-emerald-800',
  extended: 'text-amber-400 bg-amber-900/30 border-amber-800',
  regional: 'text-orange-400 bg-orange-900/30 border-orange-800',
  national: 'text-red-400 bg-red-900/30 border-red-800',
};

const ZONE_DOT: Record<string, string> = {
  local:    'bg-emerald-400',
  extended: 'bg-amber-400',
  regional: 'bg-orange-400',
  national: 'bg-red-400',
};

const SOURCE_LABEL: Record<string, string> = {
  google:             'Google Maps',
  osm:                'OpenStreetMap',
  haversine_estimate: 'Estimated (straight-line)',
};

export default function TravelPricingWidget({ siteAddress, onApply }: Props) {
  const [result, setResult] = useState<TravelPricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [overrideMode, setOverrideMode] = useState(false);

  const [overrideKm, setOverrideKm] = useState(0);
  const [overrideSurcharge, setOverrideSurcharge] = useState(0);
  const [overrideCost, setOverrideCost] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculate = useCallback(async (addr: string) => {
    if (!addr?.trim() || addr.trim().length < 5) return;
    setLoading(true);
    setError(null);
    setApplied(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-pricing-calc`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ siteAddress: addr }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: TravelPricingResult = await res.json();
      if ((data as any).error) throw new Error((data as any).error);
      setResult(data);
      setOverrideKm(data.distanceKmReturn);
      setOverrideSurcharge(data.travelSurcharge);
      setOverrideCost(data.suggestedTravelCost);
    } catch (e: any) {
      setError(e.message ?? 'Failed to calculate travel pricing');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCalculate = () => calculate(siteAddress);

  const handleApply = () => {
    if (!result) return;
    const km = overrideMode ? overrideKm : result.distanceKmReturn;
    const surcharge = overrideMode ? overrideSurcharge : result.travelSurcharge;
    const cost = overrideMode ? overrideCost : result.suggestedTravelCost;
    onApply({
      travelZone: result.zone,
      travelKm: km,
      travelSurcharge: surcharge,
      suggestedTravelCost: cost,
      parkingNote: result.parkingNote,
    });
    setApplied(true);
  };

  const zoneColor = result ? (ZONE_COLORS[result.zone] ?? ZONE_COLORS.local) : '';
  const zoneDot   = result ? (ZONE_DOT[result.zone]   ?? ZONE_DOT.local)     : '';

  const canCalculate = siteAddress?.trim().length >= 5;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold text-white">Auto Travel Pricing</span>
        </div>
        <button
          onClick={handleCalculate}
          disabled={loading || !canCalculate}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-sky-900/40 border border-sky-800 text-sky-300 hover:bg-sky-900/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Calculating…' : result ? 'Recalculate' : 'Calculate'}
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Address hint */}
        {!canCalculate && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            Enter a site address above to enable travel pricing calculation.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Result */}
        {result && !error && (
          <>
            {/* Zone badge */}
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${zoneColor}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${zoneDot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{result.zoneLabel}</p>
                <p className="text-xs opacity-70">{result.zoneDescription}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                <Car className="w-3.5 h-3.5 text-slate-500 mx-auto mb-1" />
                <p className="text-base font-bold text-white">{result.distanceKm} km</p>
                <p className="text-xs text-slate-500">one way</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                <Clock className="w-3.5 h-3.5 text-slate-500 mx-auto mb-1" />
                <p className="text-base font-bold text-white">
                  {result.travelTimeMinutes >= 60
                    ? `${Math.floor(result.travelTimeMinutes / 60)}h ${result.travelTimeMinutes % 60}m`
                    : `${result.travelTimeMinutes}m`}
                </p>
                <p className="text-xs text-slate-500">drive time</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                <MapPin className="w-3.5 h-3.5 text-slate-500 mx-auto mb-1" />
                <p className="text-base font-bold text-emerald-400">
                  {result.suggestedTravelCost === 0 && result.travelSurcharge === 0
                    ? 'Incl.'
                    : `$${(result.suggestedTravelCost + result.travelSurcharge).toLocaleString()}`}
                </p>
                <p className="text-xs text-slate-500">travel cost</p>
              </div>
            </div>

            {/* Cost breakdown */}
            {(result.travelSurcharge > 0 || result.suggestedTravelCost > 0) && (
              <div className="bg-slate-900/40 rounded-lg px-3 py-2 text-xs space-y-1">
                {result.travelSurcharge > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Zone surcharge</span>
                    <span className="text-slate-300">${result.travelSurcharge.toLocaleString()}</span>
                  </div>
                )}
                {result.suggestedTravelCost > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Km charge ({result.distanceKmReturn} km return)</span>
                    <span className="text-slate-300">${result.suggestedTravelCost.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-800">
                  <span>Parking</span>
                  <span>{result.parkingNote}</span>
                </div>
              </div>
            )}

            {/* Override toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setOverrideMode(m => !m)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                {overrideMode
                  ? <ToggleRight className="w-4 h-4 text-sky-400" />
                  : <ToggleLeft  className="w-4 h-4" />}
                Manual override
              </button>
              <span className="text-xs text-slate-600">
                via {SOURCE_LABEL[result.source] ?? result.source}
              </span>
            </div>

            {/* Override inputs */}
            {overrideMode && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Return km</label>
                  <input
                    type="number" min={0}
                    value={overrideKm}
                    onChange={e => setOverrideKm(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Surcharge ($)</label>
                  <input
                    type="number" min={0}
                    value={overrideSurcharge}
                    onChange={e => setOverrideSurcharge(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Km cost ($)</label>
                  <input
                    type="number" min={0}
                    value={overrideCost}
                    onChange={e => setOverrideCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>
            )}

            {/* OSM notes */}
            {result.notes.length > 0 && (
              <div className="space-y-1">
                {result.notes.map((n, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
                    <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {n}
                  </div>
                ))}
              </div>
            )}

            {/* Apply button */}
            <button
              onClick={handleApply}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                applied
                  ? 'bg-emerald-900/40 border border-emerald-800 text-emerald-400 cursor-default'
                  : 'bg-sky-700 hover:bg-sky-600 text-white'
              }`}
            >
              {applied
                ? <span className="flex items-center justify-center gap-1.5"><CheckCircle className="w-4 h-4" />Applied to Costing Engine</span>
                : 'Apply to Costing Engine'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
