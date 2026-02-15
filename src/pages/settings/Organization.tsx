import { useState, useEffect } from 'react';
import { Building2, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageUpload } from '../../components/ImageUpload';

interface OrganizationSettings {
  id: string;
  organization_name: string;
  logo_path: string | null;
}

export function Organization() {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [logoPath, setLogoPath] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setOrganizationName(data.organization_name);
        setLogoPath(data.logo_path || '');
      }
    } catch (error) {
      console.error('Error loading organization settings:', error);
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
        .from('organization_settings')
        .update({
          organization_name: organizationName,
          logo_path: logoPath || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      setMessage('Settings saved successfully');
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
              Organization Name
            </label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., P&R Consulting Limited"
            />
            <p className="mt-1 text-xs text-blue-200">
              This name will appear on reports and documents
            </p>
          </div>

          <div className="border-t border-white/10 pt-6">
            <ImageUpload
              currentImagePath={logoPath}
              onImageUploaded={(path) => setLogoPath(path)}
              label="Organization Logo"
              maxSizeMB={5}
            />
            <p className="mt-2 text-xs text-blue-200">
              Upload your organization logo. This will appear on all generated reports.
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
              disabled={saving || !organizationName.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
