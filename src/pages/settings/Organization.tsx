import { useState, useEffect } from 'react';
import { Building2, Save, AlertCircle, ExternalLink, Navigation, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageUpload } from '../../components/ImageUpload';
import { useNavigate } from 'react-router-dom';

interface CompanySettings {
  id: string;
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  base_address: string | null;
  base_lat: number | null;
  base_lng: number | null;
  travel_km_rate: number | null;
  travel_parking_note: string | null;
}

export function Organization() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [message, setMessage] = useState('');

  const [baseAddress, setBaseAddress] = useState('');
  const [baseLat, setBaseLat] = useState('');
  const [baseLng, setBaseLng] = useState('');
  const [travelKmRate, setTravelKmRate] = useState('1.20');
  const [travelParkingNote, setTravelParkingNote] = useState('Parking charged at cost');
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setCompanyName(data.company_name || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setWebsite(data.website || '');
        setLogoUrl(data.logo_url || '');
        setBaseAddress(data.base_address || '');
        setBaseLat(data.base_lat != null ? String(data.base_lat) : '');
        setBaseLng(data.base_lng != null ? String(data.base_lng) : '');
        setTravelKmRate(data.travel_km_rate != null ? String(data.travel_km_rate) : '1.20');
        setTravelParkingNote(data.travel_parking_note || 'Parking charged at cost');
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeocode = async () => {
    if (!baseAddress.trim()) return;
    setGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(baseAddress)}&format=json&limit=1&countrycodes=nz`;
      const res = await fetch(url, { headers: { 'User-Agent': 'BurnRatePro/1.0' } });
      const data = await res.json();
      if (data?.[0]) {
        setBaseLat(parseFloat(data[0].lat).toFixed(6));
        setBaseLng(parseFloat(data[0].lon).toFixed(6));
      } else {
        alert('Address not found. Please check and try again, or enter coordinates manually.');
      }
    } catch {
      alert('Geocoding failed. Please enter coordinates manually.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          company_name: companyName,
          address: address || null,
          phone: phone || null,
          email: email || null,
          website: website || null,
          logo_url: logoUrl || null,
          base_address: baseAddress || null,
          base_lat: baseLat ? parseFloat(baseLat) : null,
          base_lng: baseLng ? parseFloat(baseLng) : null,
          travel_km_rate: travelKmRate ? parseFloat(travelKmRate) : 1.20,
          travel_parking_note: travelParkingNote || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      setMessage('Settings saved successfully');
      await loadSettings();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-4xl space-y-6">

        <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-white">Organization Settings</h1>
            </div>
            <p className="text-blue-100">Manage your organization details and branding</p>
          </div>

          {/* Multi-Organization Notice */}
          <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-white font-medium mb-1">Multi-Organization Support Now Available</h3>
                <p className="text-blue-200 text-sm mb-3">
                  You can now manage multiple organizations and assign projects to specific organizations.
                  Each project will use its assigned organization's branding in reports.
                </p>
                <button
                  onClick={() => navigate('/settings/organizations')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Building2 className="w-4 h-4" />
                  Manage Organizations
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., P&R Consulting Limited"
              />
              <p className="mt-1 text-xs text-blue-200">This name will appear on reports and documents</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., 123 Main Street, City, Country"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., +64 21 123 4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., info@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., https://www.company.com"
              />
            </div>

            <div className="border-t border-white/10 pt-6">
              <ImageUpload
                currentImagePath={logoUrl}
                onImageUploaded={(path) => setLogoUrl(path)}
                label="Company Logo"
                maxSizeMB={5}
              />
              <p className="mt-2 text-xs text-blue-200">
                Upload your company logo. This will appear on all generated reports.
                Recommended size: 300x100 pixels (PNG or JPG)
              </p>
            </div>

            {message && (
              <div
                className={`px-4 py-3 rounded-lg ${
                  message.includes('success')
                    ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}
              >
                {message}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !companyName.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Travel Pricing Configuration */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Navigation className="w-6 h-6 text-sky-400" />
              <h2 className="text-xl font-bold text-white">Travel Pricing Configuration</h2>
            </div>
            <p className="text-blue-200 text-sm">
              Set your office base location so the Growth Hub can automatically calculate travel zones and costs when building quotes.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 p-6 space-y-6">

            {/* Base address */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                <MapPin className="w-4 h-4 inline mr-1 text-sky-400" />
                Office / Base Address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={baseAddress}
                  onChange={(e) => setBaseAddress(e.target.value)}
                  className="flex-1 px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="e.g., 1 Queen Street, Auckland CBD, Auckland 1010"
                />
                <button
                  onClick={handleGeocode}
                  disabled={geocoding || !baseAddress.trim()}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
                >
                  {geocoding ? 'Finding…' : 'Pin Location'}
                </button>
              </div>
              <p className="mt-1 text-xs text-blue-300">
                Click "Pin Location" to automatically geocode to lat/lng via OpenStreetMap.
              </p>
            </div>

            {/* Lat / Lng */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Latitude (optional)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={baseLat}
                  onChange={(e) => setBaseLat(e.target.value)}
                  className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="-36.8485"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Longitude (optional)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={baseLng}
                  onChange={(e) => setBaseLng(e.target.value)}
                  className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="174.7633"
                />
              </div>
            </div>

            {/* Zone reference */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Zone Reference</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-slate-300">Zone A (0–25 km) — Included / local callout</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-slate-300">Zone B (25–60 km) — $95–$180 surcharge</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-400 flex-shrink-0" />
                  <span className="text-slate-300">Zone C (60–150 km) — km charge + travel time</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
                  <span className="text-slate-300">Zone D (150 km+) — Regional / overnight review</span>
                </div>
              </div>
            </div>

            {/* Pricing defaults */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Km Rate ($/km)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 text-sm">$</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={travelKmRate}
                    onChange={(e) => setTravelKmRate(e.target.value)}
                    className="w-full pl-7 pr-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="1.20"
                  />
                </div>
                <p className="mt-1 text-xs text-blue-300">IRD standard is $1.04/km — charge at or above cost</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Default Parking Note</label>
                <input
                  type="text"
                  value={travelParkingNote}
                  onChange={(e) => setTravelParkingNote(e.target.value)}
                  className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Parking charged at cost"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Travel Settings'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
