import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';
import { ImageUpload } from './ImageUpload';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateOrganizationModal({ isOpen, onClose, onSuccess }: CreateOrganizationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from('organizations')
        .insert({
          name: formData.name,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
          logo_url: formData.logo_url || null,
          is_active: formData.is_active,
        });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        logo_url: '',
        is_active: true,
      });
    } catch (err: any) {
      console.error('Error creating organization:', err);
      setError(err.message || 'Failed to create organization');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen px-0 sm:px-4 pt-0 sm:pt-4 pb-0 sm:pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-slate-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-slate-800 backdrop-blur-sm rounded-t-2xl sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full max-h-[90vh] overflow-y-auto">
          <div className="bg-slate-800 backdrop-blur-sm px-4 sm:px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-white">Create New Organization</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-500 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-200 text-red-400 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., P&R Consulting Limited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="123 Main Street, City, Country"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+64 21 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="info@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://www.company.com"
                />
              </div>

              <div className="border-t border-slate-700 pt-4">
                <ImageUpload
                  currentImagePath={formData.logo_url}
                  onImageUploaded={(path) => setFormData({ ...formData, logo_url: path })}
                  label="Organization Logo"
                  maxSizeMB={5}
                />
                <p className="mt-2 text-xs text-slate-300">
                  Upload your organization logo. Recommended size: 300x100 pixels (PNG or JPG)
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 bg-slate-700 border-slate-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-white">
                  Active (available for selection in projects)
                </label>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 min-h-[48px] border border-slate-600 rounded-lg text-white hover:bg-slate-700 order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="px-4 py-3 min-h-[48px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 order-1 sm:order-2"
                >
                  {saving ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
