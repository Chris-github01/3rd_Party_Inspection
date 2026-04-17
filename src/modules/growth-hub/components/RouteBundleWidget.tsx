import { useState, useEffect } from 'react';
import { Route, MapPin, Clock, DollarSign, Package, ChevronRight, Plus, X, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { TRAVEL_ZONES, CALLOUT_MINIMUMS, KM_RATE_DEFAULT } from '../utils/costingEngine';

interface Lead {
  id: string;
  company_name: string;
  site_address: string | null;
  estimated_value: number;
  stage: string;
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
  stops: RouteStop[];
  totalKm: number;
  totalTravelMins: number;
  estimatedTravelCost: number;
  savingVsSeparate: number;
}

const ZONE_LABELS: Record<string, string> = {
  local: 'Zone A',
  extended: 'Zone B',
  regional: 'Zone C',
  national: 'Zone D',
};

function StopItem({ stop, index, onRemove }: {
  stop: RouteStop;
  index: number;
  onRemove: () => void;
}) {
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
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded"
          >
            <X className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BundleSummary({ bundle }: { bundle: RouteBundle }) {
  const zone = bundle.totalKm < 25 ? 'local'
    : bundle.totalKm < 60 ? 'extended'
    : bundle.totalKm < 150 ? 'regional'
    : 'national';

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">{bundle.label}</span>
          <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
            {bundle.stops.length} stops
          </span>
        </div>
        <span className="text-xs text-slate-500">{ZONE_LABELS[zone]}</span>
      </div>

      <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
        {bundle.stops.map((stop, i) => (
          <StopItem key={stop.leadId} stop={stop} index={i} onRemove={() => {}} />
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
  );
}

export default function RouteBundleWidget() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [bundles, setBundles] = useState<RouteBundle[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [bundleName, setBundleName] = useState('');
  const [kmRate, setKmRate] = useState(KM_RATE_DEFAULT);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('travel_km_rate')
          .limit(1)
          .maybeSingle();
        if (orgData?.travel_km_rate) setKmRate(orgData.travel_km_rate);

        const { data } = await supabase
          .from('leads')
          .select('id, company_name, site_address, estimated_value, stage')
          .in('stage', ['new', 'contacted', 'qualified', 'quote_sent'])
          .order('company_name');
        setLeads(data ?? []);
      } catch (err) {
        console.error('RouteBundleWidget load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleLead(id: string) {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function estimateBundle(): RouteBundle | null {
    const selected = leads.filter(l => selectedLeads.has(l.id));
    if (selected.length < 2) return null;

    const totalKm = selected.length * 15;
    const stops: RouteStop[] = selected.map((l, i) => ({
      leadId: l.id,
      companyName: l.company_name,
      address: l.site_address ?? '',
      estimatedKmFromPrev: i === 0 ? 0 : 15,
      travelMinutes: i === 0 ? 0 : 20,
    }));

    const estimatedTravelCost = totalKm * kmRate + CALLOUT_MINIMUMS.local;
    const separateCost = selected.length * (CALLOUT_MINIMUMS.local + 10 * kmRate);
    const savingVsSeparate = Math.max(0, separateCost - estimatedTravelCost);

    return {
      id: Date.now().toString(),
      label: bundleName || `Bundle ${bundles.length + 1}`,
      stops,
      totalKm,
      totalTravelMins: totalKm * 1.5,
      estimatedTravelCost,
      savingVsSeparate,
    };
  }

  function addBundle() {
    const bundle = estimateBundle();
    if (!bundle) return;
    setBundles(prev => [bundle, ...prev]);
    setSelectedLeads(new Set());
    setBundleName('');
    setCreating(false);
  }

  const preview = selectedLeads.size >= 2 ? estimateBundle() : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Route Bundling</h2>
        </div>
        <button
          onClick={() => setCreating(v => !v)}
          className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" />
          New Bundle
        </button>
      </div>

      {creating && (
        <div className="mb-5 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-3 font-medium">
            Select leads to bundle into one site visit route
          </p>

          <input
            type="text"
            value={bundleName}
            onChange={e => setBundleName(e.target.value)}
            placeholder="Bundle name (e.g. North Shore Run)"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 mb-3 focus:outline-none focus:border-slate-500"
          />

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-700 rounded animate-pulse" />)}
            </div>
          ) : leads.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-4">No active leads available</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
              {leads.map(lead => {
                const selected = selectedLeads.has(lead.id);
                return (
                  <button
                    key={lead.id}
                    onClick={() => toggleLead(lead.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                      selected
                        ? 'bg-blue-900/30 border border-blue-800'
                        : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                      selected ? 'bg-blue-600 border-blue-500' : 'border-slate-600'
                    }`}>
                      {selected && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{lead.company_name}</p>
                      {lead.site_address && (
                        <p className="text-xs text-slate-500 truncate">{lead.site_address}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      ${(lead.estimated_value / 1000).toFixed(0)}k
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {preview && (
            <div className="mb-3 bg-emerald-900/20 border border-emerald-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Bundle preview</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-bold text-white">{selectedLeads.size}</p>
                  <p className="text-[10px] text-slate-500">Stops</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-400">${preview.estimatedTravelCost.toFixed(0)}</p>
                  <p className="text-[10px] text-slate-500">Est. travel</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-400">
                    {preview.savingVsSeparate > 0 ? `$${preview.savingVsSeparate.toFixed(0)}` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-500">Saving</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={addBundle}
              disabled={selectedLeads.size < 2}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm py-2 rounded-lg transition-colors font-medium"
            >
              Create Bundle
            </button>
            <button
              onClick={() => { setCreating(false); setSelectedLeads(new Set()); }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {bundles.length === 0 && !creating ? (
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
        <div className="space-y-4">
          {bundles.map(bundle => (
            <BundleSummary key={bundle.id} bundle={bundle} />
          ))}
        </div>
      )}

      {bundles.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>{bundles.length} active bundle{bundles.length !== 1 ? 's' : ''}</span>
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
