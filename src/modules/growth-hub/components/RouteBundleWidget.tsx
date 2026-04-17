import { useState, useEffect } from 'react';
import { Route, MapPin, Clock, DollarSign, Package, ChevronRight, Plus, X, Zap, Trash2, Building2, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CALLOUT_MINIMUMS, KM_RATE_DEFAULT } from '../utils/costingEngine';

interface Lead {
  id: string;
  company_name: string;
  site_address: string | null;
  estimated_value: number;
  stage: string;
}

interface Office {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  travel_km_rate: number;
  is_default: boolean;
}

interface RouteStop {
  leadId: string;
  companyName: string;
  address: string;
  estimatedKmFromPrev: number;
  travelMinutes: number;
}

interface RouteBundle {
  id: string;
  label: string;
  office_id: string | null;
  officeName?: string;
  stops: RouteStop[];
  totalKm: number;
  totalTravelMins: number;
  estimatedTravelCost: number;
  savingVsSeparate: number;
  zone: string;
  kmRate: number;
  created_at?: string;
}

const ZONE_LABELS: Record<string, string> = {
  local: 'Zone A — Local',
  extended: 'Zone B — Extended',
  regional: 'Zone C — Regional',
  national: 'Zone D — National',
};

function zoneFromKm(km: number): string {
  if (km < 25) return 'local';
  if (km < 60) return 'extended';
  if (km < 150) return 'regional';
  return 'national';
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(addr: string): Promise<{ lat: number; lng: number } | null> {
  if (!addr?.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1&countrycodes=nz`;
    const res = await fetch(url, { headers: { 'User-Agent': 'BurnRatePro/1.0' } });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

function StopItem({ stop, index, onRemove }: { stop: RouteStop; index: number; onRemove?: () => void }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-300">
          {index + 1}
        </div>
        {index < 99 && <div className="w-px flex-1 bg-slate-700 my-1 min-h-[12px]" />}
      </div>
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{stop.companyName}</p>
            {stop.address && (
              <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {stop.address}
              </p>
            )}
            {stop.estimatedKmFromPrev > 0 && (
              <p className="text-xs text-slate-600 mt-1">
                ~{stop.estimatedKmFromPrev} km · {stop.travelMinutes} min from prev
              </p>
            )}
          </div>
          {onRemove && (
            <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded">
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BundleCard({ bundle, onDelete }: { bundle: RouteBundle; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const zoneLabel = ZONE_LABELS[bundle.zone] ?? bundle.zone;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/80 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{bundle.label}</span>
            <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded flex-shrink-0">
              {bundle.stops.length} stops
            </span>
          </div>
          {bundle.officeName && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" />{bundle.officeName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500">{zoneLabel}</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-slate-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700 px-4 py-3">
          <div className="space-y-0 mb-3 max-h-40 overflow-y-auto">
            {bundle.stops.map((stop, i) => (
              <StopItem key={stop.leadId} stop={stop} index={i} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-slate-700 pt-3">
            <div className="text-center">
              <p className="text-sm font-bold text-white">{bundle.totalKm} km</p>
              <p className="text-[10px] text-slate-500">Total distance</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-blue-400">${bundle.estimatedTravelCost.toFixed(0)}</p>
              <p className="text-[10px] text-slate-500">Travel cost</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-emerald-400">
                {bundle.savingVsSeparate > 0 ? `$${bundle.savingVsSeparate.toFixed(0)}` : '—'}
              </p>
              <p className="text-[10px] text-slate-500">Saving vs separate</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RouteBundleWidget() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [bundles, setBundles] = useState<RouteBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [bundlesLoading, setBundlesLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [bundleName, setBundleName] = useState('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [kmRate, setKmRate] = useState(KM_RATE_DEFAULT);
  const [creating, setCreating] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [orgId, setOrgId] = useState<string>('');
  const [preview, setPreview] = useState<Omit<RouteBundle, 'id'> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        let resolvedOrgId = '';
        if (userData.user) {
          const { data: ou } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', userData.user.id)
            .limit(1)
            .maybeSingle();
          if (ou?.organization_id) {
            resolvedOrgId = ou.organization_id;
            setOrgId(resolvedOrgId);
          }
        }

        const [orgRes, leadsRes, officesRes] = await Promise.all([
          supabase.from('organizations').select('travel_km_rate').limit(1).maybeSingle(),
          supabase.from('leads')
            .select('id, company_name, site_address, estimated_value, stage')
            .in('stage', ['new', 'contacted', 'qualified', 'quote_sent'])
            .order('company_name'),
          supabase.from('offices')
            .select('id, name, lat, lng, travel_km_rate, is_default')
            .eq('active', true)
            .order('is_default', { ascending: false }),
        ]);

        if (orgRes.data?.travel_km_rate) setKmRate(orgRes.data.travel_km_rate);
        setLeads(leadsRes.data ?? []);
        const officeList: Office[] = officesRes.data ?? [];
        setOffices(officeList);
        const def = officeList.find(o => o.is_default) ?? officeList[0];
        if (def) {
          setSelectedOfficeId(def.id);
          setKmRate(def.travel_km_rate ?? KM_RATE_DEFAULT);
        }
      } catch (err) {
        console.error('RouteBundleWidget load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    loadBundles();
  }, []);

  async function loadBundles() {
    setBundlesLoading(true);
    try {
      const { data } = await supabase
        .from('route_bundles')
        .select('*, stops:route_bundle_stops(*), office:offices(name)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        setBundles(data.map((b: any) => ({
          id: b.id,
          label: b.label,
          office_id: b.office_id,
          officeName: b.office?.name,
          stops: (b.stops ?? []).sort((a: any, z: any) => a.sort_order - z.sort_order).map((s: any) => ({
            leadId: s.lead_id ?? s.id,
            companyName: s.company_name,
            address: s.site_address ?? '',
            estimatedKmFromPrev: s.estimated_km_from_prev ?? 0,
            travelMinutes: s.travel_minutes ?? 0,
          })),
          totalKm: b.total_km,
          totalTravelMins: b.total_travel_mins,
          estimatedTravelCost: b.estimated_travel_cost,
          savingVsSeparate: b.saving_vs_separate,
          zone: b.zone,
          kmRate: b.km_rate,
          created_at: b.created_at,
        })));
      }
    } catch (err) {
      console.error('Bundle load error:', err);
    } finally {
      setBundlesLoading(false);
    }
  }

  function toggleLead(id: string) {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPreview(null);
  }

  async function estimateBundle(): Promise<Omit<RouteBundle, 'id'> | null> {
    const selected = leads.filter(l => selectedLeads.has(l.id));
    if (selected.length < 2) return null;

    const office = offices.find(o => o.id === selectedOfficeId) ?? offices[0];
    const rate = office?.travel_km_rate ?? kmRate;

    setEstimating(true);
    try {
      let geoPoints: Array<{ lat: number; lng: number } | null> = [];
      if (office?.lat && office?.lng) {
        geoPoints = await Promise.all(selected.map(l => l.site_address ? geocodeAddress(l.site_address) : Promise.resolve(null)));
      }

      const stops: RouteStop[] = selected.map((l, i) => {
        let kmFromPrev = 15;
        let mins = 20;
        if (office?.lat && office?.lng && geoPoints[i]) {
          const prevGeo = i === 0
            ? { lat: office.lat, lng: office.lng }
            : geoPoints[i - 1] ?? { lat: office.lat, lng: office.lng };
          const rawKm = haversineKm(prevGeo.lat, prevGeo.lng, geoPoints[i]!.lat, geoPoints[i]!.lng) * 1.25;
          kmFromPrev = Math.round(rawKm * 10) / 10;
          mins = Math.round((rawKm / 70) * 60);
        }
        return {
          leadId: l.id,
          companyName: l.company_name,
          address: l.site_address ?? '',
          estimatedKmFromPrev: i === 0 ? 0 : kmFromPrev,
          travelMinutes: i === 0 ? 0 : mins,
        };
      });

      let totalKm = 0;
      if (office?.lat && office?.lng && geoPoints.some(g => g !== null)) {
        totalKm = stops.reduce((s, stop) => s + stop.estimatedKmFromPrev, 0);
        if (geoPoints[geoPoints.length - 1]) {
          const returnKm = haversineKm(
            geoPoints[geoPoints.length - 1]!.lat, geoPoints[geoPoints.length - 1]!.lng,
            office.lat!, office.lng!
          ) * 1.25;
          totalKm += returnKm;
        }
        totalKm = Math.round(totalKm * 10) / 10;
      } else {
        totalKm = selected.length * 15;
      }

      const zone = zoneFromKm(totalKm / (selected.length || 1));
      const estimatedTravelCost = zone === 'local' ? 0
        : zone === 'extended' ? 120
        : totalKm * rate;
      const separateCost = selected.length * (CALLOUT_MINIMUMS.local + 10 * rate);
      const savingVsSeparate = Math.max(0, separateCost - estimatedTravelCost);
      const totalTravelMins = stops.reduce((s, st) => s + st.travelMinutes, 0);

      return {
        label: bundleName || `Bundle ${bundles.length + 1}`,
        office_id: office?.id ?? null,
        officeName: office?.name,
        stops,
        totalKm,
        totalTravelMins,
        estimatedTravelCost: Math.round(estimatedTravelCost),
        savingVsSeparate: Math.round(savingVsSeparate),
        zone,
        kmRate: rate,
      };
    } finally {
      setEstimating(false);
    }
  }

  async function handlePreview() {
    const est = await estimateBundle();
    setPreview(est);
  }

  async function addBundle() {
    const est = preview ?? await estimateBundle();
    if (!est || !orgId) return;

    const { data: bundleRow, error: be } = await supabase.from('route_bundles').insert({
      organization_id: orgId,
      office_id: est.office_id,
      label: est.label,
      total_km: est.totalKm,
      total_travel_mins: est.totalTravelMins,
      estimated_travel_cost: est.estimatedTravelCost,
      saving_vs_separate: est.savingVsSeparate,
      km_rate: est.kmRate,
      zone: est.zone,
    }).select().single();
    if (be || !bundleRow) return;

    if (est.stops.length > 0) {
      await supabase.from('route_bundle_stops').insert(
        est.stops.map((s, i) => ({
          bundle_id: bundleRow.id,
          organization_id: orgId,
          lead_id: s.leadId,
          sort_order: i,
          company_name: s.companyName,
          site_address: s.address,
          estimated_km_from_prev: s.estimatedKmFromPrev,
          travel_minutes: s.travelMinutes,
        }))
      );
    }

    setSelectedLeads(new Set());
    setBundleName('');
    setPreview(null);
    setCreating(false);
    await loadBundles();
  }

  async function deleteBundle(id: string) {
    await supabase.from('route_bundles').delete().eq('id', id);
    setBundles(prev => prev.filter(b => b.id !== id));
  }

  const selectedLeadsList = leads.filter(l => selectedLeads.has(l.id));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Route Bundling</h2>
          {!bundlesLoading && bundles.length > 0 && (
            <span className="text-xs text-slate-500">({bundles.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadBundles}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setCreating(v => !v); setPreview(null); }}
            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Bundle
          </button>
        </div>
      </div>

      {creating && (
        <div className="mb-5 bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium">
            Select leads to bundle into one site visit route
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Bundle Name</label>
              <input
                type="text"
                value={bundleName}
                onChange={e => setBundleName(e.target.value)}
                placeholder="e.g. North Shore Run"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
              />
            </div>
            {offices.length > 1 && (
              <div>
                <label className="block text-xs text-slate-500 mb-1">Depart From</label>
                <select
                  value={selectedOfficeId}
                  onChange={e => {
                    setSelectedOfficeId(e.target.value);
                    const off = offices.find(o => o.id === e.target.value);
                    if (off) setKmRate(off.travel_km_rate ?? KM_RATE_DEFAULT);
                    setPreview(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-slate-500"
                >
                  {offices.map(o => (
                    <option key={o.id} value={o.id}>{o.name}{o.is_default ? ' (default)' : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-700 rounded animate-pulse" />)}</div>
          ) : leads.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-4">No active leads available</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {leads.map(lead => {
                const selected = selectedLeads.has(lead.id);
                return (
                  <button
                    key={lead.id}
                    onClick={() => toggleLead(lead.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                      selected ? 'bg-blue-900/30 border border-blue-800' : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      selected ? 'bg-blue-600 border-blue-500' : 'border-slate-600'
                    }`}>
                      {selected && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{lead.company_name}</p>
                      {lead.site_address && <p className="text-xs text-slate-500 truncate">{lead.site_address}</p>}
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      ${(lead.estimated_value / 1000).toFixed(0)}k
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedLeads.size >= 2 && !preview && (
            <button
              onClick={handlePreview}
              disabled={estimating}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border border-blue-700 text-blue-300 hover:bg-blue-900/30 transition-colors disabled:opacity-40"
            >
              {estimating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Calculating distances…
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Preview Route
                </>
              )}
            </button>
          )}

          {preview && (
            <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Route preview</span>
                <span className="text-xs text-slate-500">{ZONE_LABELS[preview.zone] ?? preview.zone}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div>
                  <p className="text-sm font-bold text-white">{selectedLeads.size}</p>
                  <p className="text-[10px] text-slate-500">Stops</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-400">${preview.estimatedTravelCost}</p>
                  <p className="text-[10px] text-slate-500">Est. travel</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-400">
                    {preview.savingVsSeparate > 0 ? `$${preview.savingVsSeparate}` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-500">Saving</p>
                </div>
              </div>
              <div className="space-y-0 max-h-36 overflow-y-auto">
                {preview.stops.map((stop, i) => (
                  <StopItem key={stop.leadId} stop={stop} index={i} />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={addBundle}
              disabled={selectedLeads.size < 2 || estimating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm py-2 rounded-lg transition-colors font-medium"
            >
              {estimating ? 'Calculating…' : 'Save Bundle'}
            </button>
            <button
              onClick={() => { setCreating(false); setSelectedLeads(new Set()); setPreview(null); }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {bundlesLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      ) : bundles.length === 0 && !creating ? (
        <div className="text-center py-10">
          <Route className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No route bundles yet</p>
          <p className="text-slate-600 text-xs mt-1">
            Group nearby leads into a single site run to reduce travel costs
          </p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mx-auto"
          >
            <Plus className="w-3 h-3" />
            Create first bundle
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bundles.map(bundle => (
            <BundleCard key={bundle.id} bundle={bundle} onDelete={() => deleteBundle(bundle.id)} />
          ))}
        </div>
      )}

      {bundles.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{bundles.length} bundle{bundles.length !== 1 ? 's' : ''} saved</span>
          <span>
            Total saving: <span className="text-emerald-400 font-medium">
              ${bundles.reduce((s, b) => s + b.savingVsSeparate, 0).toFixed(0)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
