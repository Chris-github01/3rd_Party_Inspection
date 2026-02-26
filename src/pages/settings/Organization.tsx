import { useState, useEffect } from 'react';
import { Building2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageUpload } from '../../components/ImageUpload';

interface CompanySettings {
  id: string;
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
}

export function Organization() {
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

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setCompanyName(data.company_name || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setWebsite(data.website || '');
        setLogoUrl(data.logo_url || '');
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      setMessage('Settings saved successfully');
      await loadSettings(); // Reload to confirm save
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
      <div className="p-8 max-w-4xl">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-8 h-8 text-primary-600" />
              <h1 className="text-3xl font-bold text-white">Organization Settings</h1>
            </div>
            <p className="text-blue-100">
              Manage your organization details and branding
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., P&R Consulting Limited"
            />
            <p className="mt-1 text-xs text-blue-200">
              This name will appear on reports and documents
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Address
            </label>
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
              <label className="block text-sm font-medium text-white mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., +64 21 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email
              </label>
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
            <label className="block text-sm font-medium text-white mb-2">
              Website
            </label>
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
      </div>
    </div>
  );
}
