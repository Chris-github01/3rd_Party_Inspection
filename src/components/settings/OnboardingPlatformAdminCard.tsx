import { useState, useEffect } from 'react';
import { Shield, Save, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OnboardingPlatformAdminCardProps {
  organization: {
    id: string;
    name: string;
    onboarding_config: any;
  };
  onUpdate: () => void;
}

interface PlatformAdministrator {
  sameAsOwner: boolean;
  fullName: string;
  email: string;
  phone: string;
}

const defaultAdmin: PlatformAdministrator = {
  sameAsOwner: false,
  fullName: '',
  email: '',
  phone: ''
};

export function OnboardingPlatformAdminCard({ organization, onUpdate }: OnboardingPlatformAdminCardProps) {
  const [admin, setAdmin] = useState<PlatformAdministrator>(defaultAdmin);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (organization.onboarding_config?.platformAdministrator) {
      setAdmin({ ...defaultAdmin, ...organization.onboarding_config.platformAdministrator });
    } else {
      setAdmin(defaultAdmin);
    }
  }, [organization]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!admin.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!admin.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    setSaving(true);
    try {
      const updatedConfig = {
        ...organization.onboarding_config,
        platformAdministrator: admin
      };

      const { error } = await supabase
        .from('organizations')
        .update({ onboarding_config: updatedConfig })
        .eq('id', organization.id);

      if (error) throw error;

      showMessage('Platform administrator saved successfully', 'success');
      onUpdate();
    } catch (error) {
      console.error('Error saving platform administrator:', error);
      showMessage('Failed to save platform administrator', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof PlatformAdministrator, value: string | boolean) => {
    setAdmin(prev => ({ ...prev, [field]: value }));
    if (typeof field === 'string' && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleToggleSameAsOwner = (checked: boolean) => {
    setAdmin(prev => ({ ...prev, sameAsOwner: checked }));

    if (checked && organization.onboarding_config?.ownerDetails) {
      const owner = organization.onboarding_config.ownerDetails;
      setAdmin(prev => ({
        ...prev,
        fullName: owner.fullName || '',
        email: owner.email || '',
        phone: owner.phone || ''
      }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-primary-200 p-6">
      <div className="flex items-center mb-4">
        <Shield className="w-5 h-5 text-primary-600 mr-2" />
        <h2 className="text-lg font-semibold text-primary-900">Platform Administrator</h2>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5 mr-2 flex-shrink-0" />
          ) : (
            <X className="w-5 h-5 mr-2 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <p className="text-sm text-primary-600 mb-4">
        This person will be set up as the first workspace administrator.
      </p>

      <div className="space-y-4">
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={admin.sameAsOwner}
              onChange={(e) => handleToggleSameAsOwner(e.target.checked)}
              className="h-4 w-4 text-primary-600 border-primary-300 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-sm font-medium text-primary-900">
              Same as Owner
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-900 mb-1">
            Platform Administrator Full Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={admin.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            disabled={admin.sameAsOwner}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm ${
              errors.fullName ? 'border-red-300' : 'border-primary-300'
            } ${admin.sameAsOwner ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            placeholder="Full name"
          />
          {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              value={admin.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={admin.sameAsOwner}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm ${
                errors.email ? 'border-red-300' : 'border-primary-300'
              } ${admin.sameAsOwner ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="email@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={admin.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              disabled={admin.sameAsOwner}
              className={`w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm ${
                admin.sameAsOwner ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              placeholder="+64 21 123 4567"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-primary-200 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Administrator'}
        </button>
      </div>
    </div>
  );
}
