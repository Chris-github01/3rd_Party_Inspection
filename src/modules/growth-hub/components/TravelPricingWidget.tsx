import { useState, useCallback, useEffect } from 'react';
import {
  MapPin, Navigation, Clock, Car, AlertTriangle,
  CheckCircle, RefreshCw, ToggleLeft, ToggleRight, Info,
  Moon, Building2, ChevronDown,
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
  travelLabourHours: number;
  parkingNote: string;
  isCbd: boolean;
  cbdParkingSurcharge: number;
  cbdCongestionNote: string;
  suggestOvernight: boolean;
  overnightNote: string;
  officeUsed: { id: string; name: string } | null;
  allOffices: Array<{ id: string; name: string; distanceKm: number; address: string | null }>;
  source: 'google' | 'osm' | 'haversine_estimate';
  notes: string[];
}

export interface TravelApplyPayload {
  travelZone: string;
  travelKm: number;
  travelSurcharge: number;
  suggestedTravelCost: number;
  parkingNote: string;
  travelLabourHours: number;
  travelLabourBillPct: number;
  cbdParking: number;
  overnightMode: boolean;
}

interface Props {
  siteAddress: string;
  onApply: (opts: TravelApplyPayload) => void;
  defaultOfficeId?: string;
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

const BILL_PCT_OPTIONS = [
  { value: 0,   label: '0% — not billed' },
  { value: 50,  label: '50% — half rate' },
  { value: 100, label: '100% — full rate' },
];

export default function TravelPricingWidget({ siteAddress, onApply, defaultOfficeId }: Props) {
  const [result, setResult] = useState<TravelPricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [overrideMode, setOverrideMode] = useState(false);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(defaultOfficeId ?? '');

  // Travel labour billing
  const [billPct, setBillPct] = useState<0 | 50 | 100>(0);

  // Overnight toggle
  const [overnightMode, setOvernightMode] = useState(false);

  // CBD parking toggle
  const [cbdParkingEnabled, setCbdParkingEnabled] = useState(false);

  // Override values
  const [overrideKm, setOverrideKm] = useState(0);
  const [overrideSurcharge, setOverrideSurcharge] = useState(0);
  const [overrideCost, setOverrideCost] = useState(0);

  // Pre-load known offices for the selector (shown before any calculation)
  const [knownOffices, setKnownOffices] = useState<Array<{ id: string; name: string; address: string | null }>>([]);
  useEffect(() => {
    supabase
      .from('offices')
      .select('id, name, address')
      .eq('active', true)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setKnownOffices(data);
          if (!selectedOfficeId) {
            const def = data.find((o: any) => o.id === defaultOfficeId) ?? data[0];
            setSelectedOfficeId(def.id);
          }
        }
      });
  }, []);

  // Reset applied when address changes
  useEffect(() => { setApplied(false); }, [siteAddress]);

  // Sync default office id when it arrives (loaded async in parent)
  useEffect(() => {
    if (defaultOfficeId && !selectedOfficeId) {
      setSelectedOfficeId(defaultOfficeId);
    }
  }, [defaultOfficeId]);

  const calculate = useCallback(async (addr: string, officeId?: string) => {
    if (!addr?.trim() || addr.trim().length < 5) return;
    setLoading(true);
    setError(null);
    setApplied(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/travel-pricing-calc`;
      const body: Record<string, unknown> = { siteAddress: addr };
      if (officeId) body.officeId = officeId;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: TravelPricingResult = await res.json();
      if ((data as any).error) throw new Error((data as any).error);
      setResult(data);
      setOverrideKm(data.distanceKmReturn);
      setOverrideSurcharge(data.travelSurcharge);
      setOverrideCost(data.suggestedTravelCost);
      setCbdParkingEnabled(data.isCbd);
      if (data.suggestOvernight) setOvernightMode(true);
      if (data.officeUsed?.id) setSelectedOfficeId(data.officeUsed.id);
    } catch (e: any) {
      setError(e.message ?? 'Failed to calculate travel pricing');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCalculate = () => calculate(siteAddress, selectedOfficeId || undefined);

  const handleOfficeChange = (officeId: string) => {
    setSelectedOfficeId(officeId);
    if (siteAddress?.trim().length >= 5) calculate(siteAddress, officeId || undefined);
  };

  const effectiveKm       = overrideMode ? overrideKm       : (result?.distanceKmReturn ?? 0);
  const effectiveSurcharge = overrideMode ? overrideSurcharge : (result?.travelSurcharge ?? 0);
  const effectiveCost      = overrideMode ? overrideCost      : (result?.suggestedTravelCost ?? 0);
  const cbdParking         = cbdParkingEnabled ? (result?.cbdParkingSurcharge ?? 0) : 0;
  const travelLabourHours  = result?.travelLabourHours ?? 0;

  const billedLabourHours = Math.round(travelLabourHours * (billPct / 100) * 4) / 4;

  const totalTravelCost = effectiveCost + effectiveSurcharge + cbdParking;

  const handleApply = () => {
    if (!result) return;
    onApply({
      travelZone: result.zone,
      travelKm: effectiveKm,
      travelSurcharge: effectiveSurcharge,
      suggestedTravelCost: effectiveCost,
      parkingNote: result.parkingNote,
      travelLabourHours: billedLabourHours,
      travelLabourBillPct: billPct,
      cbdParking,
      overnightMode,
    });
    setApplied(true);
  };

  const zoneColor = result ? (ZONE_COLORS[result.zone] ?? ZONE_COLORS.local) : '';
  const zoneDot   = result ? (ZONE_DOT[result.zone]   ?? ZONE_DOT.local)     : '';
  const canCalculate = siteAddress?.trim().length >= 5;

  const fmtTime = (mins: number) =>
    mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

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

        {/* Office selector — always shown when offices are available */}
        {(knownOffices.length > 0 || (result && result.allOffices.length > 0)) && (
          <div>
            <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Departing from office
            </label>
            <div className="relative">
              <select
                value={selectedOfficeId}
                onChange={e => handleOfficeChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs appearance-none focus:outline-none focus:border-sky-600 pr-7"
              >
                {(result && result.allOffices.length > 0 ? result.allOffices : knownOffices).map(o => (
                  <option key={o.id} value={o.id}>
                    {o.name}{'distanceKm' in o && (o as any).distanceKm < 9000 ? ` — ${(o as any).distanceKm} km away` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
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
              {result.officeUsed && (
                <span className="text-xs opacity-50 shrink-0">from {result.officeUsed.name}</span>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                <Car className="w-3.5 h-3.5 text-slate-500 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{result.distanceKm} km</p>
                <p className="text-xs text-slate-500">one way</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                <Clock className="w-3.5 h-3.5 text-slate-500 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{fmtTime(result.travelTimeMinutes)}</p>
                <p className="text-xs text-slate-500">drive time</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                <Clock className="w-3.5 h-3.5 text-slate-500 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{result.travelLabourHours}h</p>
                <p className="text-xs text-slate-500">travel hrs</p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 text-center">
                <MapPin className="w-3.5 h-3.5 text-slate-500 mx-auto mb-1" />
                <p className="text-sm font-bold text-emerald-400">
                  {totalTravelCost === 0 ? 'Incl.' : `$${totalTravelCost.toLocaleString()}`}
                </p>
                <p className="text-xs text-slate-500">travel cost</p>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="bg-slate-900/40 rounded-lg px-3 py-2 text-xs space-y-1">
              {effectiveSurcharge > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Zone surcharge</span>
                  <span className="text-slate-300">${effectiveSurcharge.toLocaleString()}</span>
                </div>
              )}
              {effectiveCost > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Km charge ({effectiveKm} km return)</span>
                  <span className="text-slate-300">${effectiveCost.toLocaleString()}</span>
                </div>
              )}
              {cbdParkingEnabled && cbdParking > 0 && (
                <div className="flex justify-between text-amber-400/80">
                  <span>CBD parking surcharge</span>
                  <span>${cbdParking.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-800">
                <span>Parking note</span>
                <span className="text-right max-w-[60%]">{result.parkingNote}</span>
              </div>
            </div>

            {/* Travel labour billing */}
            {travelLabourHours > 0 && (
              <div className="bg-slate-900/40 rounded-lg px-3 py-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Billable travel time</span>
                  <span className="text-xs text-slate-500">{travelLabourHours}h round trip</span>
                </div>
                <div className="flex gap-1.5">
                  {BILL_PCT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setBillPct(opt.value as 0 | 50 | 100)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        billPct === opt.value
                          ? 'bg-sky-800/60 border-sky-600 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {opt.value}%
                    </button>
                  ))}
                </div>
                {billPct > 0 && (
                  <p className="text-xs text-slate-500">
                    {billedLabourHours}h will be added to costing as billable travel labour
                  </p>
                )}
              </div>
            )}

            {/* CBD mode */}
            {result.isCbd && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-800 bg-amber-900/20 px-3 py-2.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-amber-400">CBD Mode Active</span>
                    <button
                      onClick={() => setCbdParkingEnabled(v => !v)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                    >
                      {cbdParkingEnabled
                        ? <ToggleRight className="w-4 h-4 text-amber-400" />
                        : <ToggleLeft  className="w-4 h-4" />}
                      Parking surcharge
                    </button>
                  </div>
                  <p className="text-xs text-amber-300/70">{result.cbdCongestionNote}</p>
                </div>
              </div>
            )}

            {/* Overnight suggestion */}
            {result.suggestOvernight && (
              <div className="flex items-start gap-2 rounded-lg border border-sky-800 bg-sky-900/20 px-3 py-2.5">
                <Moon className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-sky-400">Overnight Job Suggested</span>
                    <button
                      onClick={() => setOvernightMode(v => !v)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                    >
                      {overnightMode
                        ? <ToggleRight className="w-4 h-4 text-sky-400" />
                        : <ToggleLeft  className="w-4 h-4" />}
                      Overnight mode
                    </button>
                  </div>
                  <p className="text-xs text-sky-300/70">{result.overnightNote}</p>
                  {overnightMode && (
                    <p className="text-xs text-sky-400 mt-1 font-medium">Add accommodation costs in the Costing Engine tab.</p>
                  )}
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

            {/* Info notes */}
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
                ? <span className="flex items-center justify-center gap-1.5"><CheckCircle className="w-4 h-4" />Applied — margin updated</span>
                : 'Apply to Costing Engine'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
