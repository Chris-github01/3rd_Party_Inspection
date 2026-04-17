import { useEffect, useState } from 'react';
import { Building2, MapPin, TrendingUp, DollarSign, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { CALLOUT_MINIMUMS, TRAVEL_ZONES } from '../utils/costingEngine';

interface Office {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  travel_km_rate: number | null;
  is_cbd: boolean;
  cbd_parking_surcharge: number;
  active: boolean;
}

interface OfficeStats {
  office: Office;
  totalQuotes: number;
  totalRevenue: number;
  avgMargin: number;
  avgTravelSurcharge: number;
  zoneBreakdown: Record<string, number>;
}

function ZoneBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400 w-20 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-500 w-6 text-right">{count}</span>
    </div>
  );
}

function OfficeCard({ stats, defaultKmRate }: { stats: OfficeStats; defaultKmRate: number }) {
  const [expanded, setExpanded] = useState(false);
  const { office } = stats;
  const kmRate = office.travel_km_rate ?? defaultKmRate;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Building2 className="w-4 h-4 text-slate-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">{office.name}</h3>
                {office.is_default && (
                  <span className="text-[10px] bg-blue-900/40 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded">
                    Default
                  </span>
                )}
                {office.is_cbd && (
                  <span className="text-[10px] bg-amber-900/40 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded">
                    CBD
                  </span>
                )}
              </div>
              {office.address && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {office.address}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-white">{stats.totalQuotes}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Quotes</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-emerald-400">
              {stats.avgMargin > 0 ? `${stats.avgMargin.toFixed(0)}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Avg Margin</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-blue-400">
              ${kmRate.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">$/km</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="flex items-center gap-2 text-slate-400">
            <DollarSign className="w-3 h-3 text-slate-600" />
            <span>Callout min: <span className="text-white">${CALLOUT_MINIMUMS.local}</span></span>
          </div>
          {office.is_cbd && (
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-3 h-3 text-slate-600" />
              <span>CBD parking: <span className="text-amber-400">${office.cbd_parking_surcharge}</span></span>
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Travel zone breakdown
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-700 px-4 py-3 space-y-2 bg-slate-900/30">
          {TRAVEL_ZONES.map(zone => (
            <ZoneBar
              key={zone.id}
              label={zone.label.split('—')[0].trim()}
              count={stats.zoneBreakdown[zone.id] ?? 0}
              total={stats.totalQuotes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OfficeComparisonPanel() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeStats, setOfficeStats] = useState<OfficeStats[]>([]);
  const [defaultKmRate, setDefaultKmRate] = useState(1.20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('travel_km_rate')
          .limit(1)
          .maybeSingle();
        if (orgData?.travel_km_rate) setDefaultKmRate(orgData.travel_km_rate);

        const { data: officeData } = await supabase
          .from('offices')
          .select('*')
          .eq('active', true)
          .order('is_default', { ascending: false });

        const loadedOffices: Office[] = officeData ?? [];
        setOffices(loadedOffices);

        const { data: quoteData } = await supabase
          .from('quotes')
          .select('gross_margin_pct, cost_inputs, total')
          .not('organization_id', 'is', null);

        const quotes = quoteData ?? [];

        const stats: OfficeStats[] = loadedOffices.map(office => {
          const relevantQuotes = quotes.filter(q => {
            const ci = q.cost_inputs as Record<string, unknown> | null;
            return ci?.office_id === office.id;
          });

          const totalRevenue = relevantQuotes.reduce((s, q) => s + (q.total ?? 0), 0);
          const margins = relevantQuotes
            .map(q => q.gross_margin_pct)
            .filter((m): m is number => m != null);
          const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

          const zoneBreakdown: Record<string, number> = {};
          relevantQuotes.forEach(q => {
            const ci = q.cost_inputs as Record<string, unknown> | null;
            const zone = (ci?.travelZone as string) ?? 'local';
            zoneBreakdown[zone] = (zoneBreakdown[zone] ?? 0) + 1;
          });

          return {
            office,
            totalQuotes: relevantQuotes.length,
            totalRevenue,
            avgMargin,
            avgTravelSurcharge: 0,
            zoneBreakdown,
          };
        });

        setOfficeStats(stats);
      } catch (err) {
        console.error('OfficeComparisonPanel load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Office Comparison</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-44 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (offices.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Office Comparison</h2>
        </div>
        <div className="text-center py-8">
          <Building2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No offices configured</p>
          <p className="text-slate-600 text-xs mt-1">Add offices in Organisation Settings to enable comparison</p>
        </div>
      </div>
    );
  }

  const totalRevenue = officeStats.reduce((s, os) => s + os.totalRevenue, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Office Comparison</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{offices.length} office{offices.length !== 1 ? 's' : ''}</span>
          {totalRevenue > 0 && (
            <span className="text-slate-600">·</span>
          )}
          {totalRevenue > 0 && (
            <span className="text-slate-400">${(totalRevenue / 1000).toFixed(0)}k total revenue</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {officeStats.map(stats => (
          <OfficeCard
            key={stats.office.id}
            stats={stats}
            defaultKmRate={defaultKmRate}
          />
        ))}
      </div>
    </div>
  );
}
