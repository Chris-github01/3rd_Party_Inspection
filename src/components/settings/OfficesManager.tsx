import { useState, useEffect } from 'react';
import {
  Building2, Plus, Trash2, Save, MapPin, ToggleLeft, ToggleRight,
  Star, Navigation,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Office {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  travel_km_rate: number;
  travel_parking_note: string;
  is_cbd: boolean;
  cbd_parking_surcharge: number;
  active: boolean;
}

function emptyOffice(): Omit<Office, 'id' | 'active'> {
  return {
    name: '',
    address: '',
    lat: null,
    lng: null,
    is_default: false,
    travel_km_rate: 1.20,
    travel_parking_note: 'Parking charged at cost',
    is_cbd: false,
    cbd_parking_surcharge: 40,
  };
}

interface OfficeRowProps {
  office: Office;
  onSave: (office: Office) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  geocoding: string | null;
  onGeocode: (id: string, address: string) => Promise<void>;
}

function OfficeRow({ office, onSave, onDelete, onSetDefault, geocoding, onGeocode }: OfficeRowProps) {
  const [draft, setDraft] = useState<Office>({ ...office });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(!office.id.startsWith('new-'));

  const set = <K extends keyof Office>(k: K, v: Office[K]) => setDraft(d => ({ ...d, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(draft); } finally { setSaving(false); }
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(office);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 overflow-hidden">
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/30"
        onClick={() => setExpanded(e => !e)}
      >
        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{draft.name || 'Unnamed office'}</p>
          {draft.address && <p className="text-xs text-slate-500 truncate">{draft.address}</p>}
        </div>
        <div className="flex items-center gap-2">
          {draft.is_cbd && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 border border-amber-800 text-amber-400">CBD</span>
          )}
          {draft.is_default && (
            <Star className="w-3.5 h-3.5 text-amber-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Office Name *</label>
              <input
                value={draft.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Auckland CBD"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Km Rate ($/km)</label>
              <input
                type="number" step="0.05" min={0}
                value={draft.travel_km_rate}
                onChange={e => set('travel_km_rate', parseFloat(e.target.value) || 1.20)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Office Address</label>
            <div className="flex gap-2">
              <input
                value={draft.address ?? ''}
                onChange={e => set('address', e.target.value)}
                placeholder="1 Queen Street, Auckland CBD"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
              />
              <button
                onClick={() => onGeocode(draft.id, draft.address ?? '')}
                disabled={geocoding === draft.id || !draft.address?.trim()}
                className="px-3 py-1.5 bg-sky-800 hover:bg-sky-700 disabled:opacity-40 text-white text-xs rounded-lg transition-colors whitespace-nowrap"
              >
                {geocoding === draft.id ? 'Finding…' : 'Pin'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Latitude</label>
              <input
                type="number" step="0.000001"
                value={draft.lat ?? ''}
                onChange={e => set('lat', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="-36.848"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Longitude</label>
              <input
                type="number" step="0.000001"
                value={draft.lng ?? ''}
                onChange={e => set('lng', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="174.763"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Parking Note</label>
            <input
              value={draft.travel_parking_note}
              onChange={e => set('travel_parking_note', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-600"
            />
          </div>

          {/* CBD toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => set('is_cbd', !draft.is_cbd)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
            >
              {draft.is_cbd
                ? <ToggleRight className="w-4 h-4 text-amber-400" />
                : <ToggleLeft  className="w-4 h-4" />}
              CBD office (parking surcharge)
            </button>
            {draft.is_cbd && (
              <div className="flex items-center gap-1.5 ml-auto">
                <label className="text-xs text-slate-500">Parking surcharge $</label>
                <input
                  type="number" min={0}
                  value={draft.cbd_parking_surcharge}
                  onChange={e => set('cbd_parking_surcharge', parseFloat(e.target.value) || 0)}
                  className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-sky-600"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSetDefault(draft.id)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  draft.is_default
                    ? 'bg-amber-900/30 border-amber-800 text-amber-400'
                    : 'border-slate-700 text-slate-500 hover:text-white hover:border-slate-600'
                }`}
              >
                <Star className="w-3 h-3" />
                {draft.is_default ? 'Default' : 'Set default'}
              </button>
              <button
                onClick={() => onDelete(draft.id)}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 px-2 py-1 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Remove
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !draft.name.trim() || !isDirty}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              <Save className="w-3 h-3" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OfficesManager() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('offices')
      .select('*')
      .eq('active', true)
      .order('is_default', { ascending: false })
      .order('name');
    setOffices(data ?? []);
    setLoading(false);
  };

  const handleSave = async (office: Office) => {
    const { id, ...rest } = office;
    if (id.startsWith('new-')) {
      await supabase.from('offices').insert({ ...rest, active: true });
    } else {
      await supabase.from('offices').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
    }
    await load();
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('new-')) {
      setOffices(os => os.filter(o => o.id !== id));
      return;
    }
    await supabase.from('offices').update({ active: false }).eq('id', id);
    await load();
  };

  const handleSetDefault = async (id: string) => {
    if (id.startsWith('new-')) return;
    await supabase.from('offices').update({ is_default: false }).eq('active', true);
    await supabase.from('offices').update({ is_default: true }).eq('id', id);
    await load();
  };

  const handleGeocode = async (id: string, address: string) => {
    if (!address.trim()) return;
    setGeocoding(id);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=nz`;
      const res = await fetch(url, { headers: { 'User-Agent': 'BurnRatePro/1.0' } });
      const data = await res.json();
      if (data?.[0]) {
        setOffices(os => os.map(o => o.id === id
          ? { ...o, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
          : o
        ));
      }
    } finally {
      setGeocoding(null);
    }
  };

  const addNew = () => {
    const newId = `new-${Date.now()}`;
    setOffices(os => [...os, { id: newId, active: true, ...emptyOffice() }]);
  };

  if (loading) return <div className="text-xs text-slate-500 py-4">Loading offices…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold text-white">Office Locations</span>
          <span className="text-xs text-slate-500">({offices.length} active)</span>
        </div>
        <button
          onClick={addNew}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Office
        </button>
      </div>

      {offices.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center">
          <MapPin className="w-6 h-6 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No offices added yet.</p>
          <p className="text-xs text-slate-600 mt-1">Add your office locations so Travel Pricing can auto-select the nearest one.</p>
          <button
            onClick={addNew}
            className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-sky-800/40 border border-sky-800 text-sky-300 rounded-lg mx-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Office
          </button>
        </div>
      )}

      <div className="space-y-2">
        {offices.map(office => (
          <OfficeRow
            key={office.id}
            office={office}
            onSave={handleSave}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
            geocoding={geocoding}
            onGeocode={handleGeocode}
          />
        ))}
      </div>

      <p className="text-xs text-slate-600">
        The nearest office to each project site is automatically selected when calculating travel pricing. Mark one office as default to use it as the fallback.
      </p>
    </div>
  );
}
