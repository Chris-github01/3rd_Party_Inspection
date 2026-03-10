import { useState, useEffect } from 'react';
import { UserCheck, Save, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OnboardingAuthorisedRepCardProps {
  organization: {
    id: string;
    name: string;
    onboarding_config: any;
  };
  onUpdate: () => void;
}

interface AuthorisedRepresentative {
  name: string;
  title: string;
  email: string;
  phone: string;
}

const defaultRep: AuthorisedRepresentative = {
  name: '',
  title: '',
  email: '',
  phone: ''
};

export function OnboardingAuthorisedRepCard({ organization, onUpdate }: OnboardingAuthorisedRepCardProps) {
  const [rep, setRep] = useState<AuthorisedRepresentative>(defaultRep);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (organization.onboarding_config?.authorisedRepresentative) {
      setRep({ ...defaultRep, ...organization.onboarding_config.authorisedRepresentative });
    } else {
      setRep(defaultRep);
    }
  }, [organization]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!rep.name.trim()) {
      newErrors.name = 'Representative name is required';
    }
    if (!rep.title.trim()) {
      newErrors.title = 'Position/title is required';
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
        authorisedRepresentative: rep
      };

      const { error } = await supabase
        .from('organizations')
        .update({ onboarding_config: updatedConfig })
        .eq('id', organization.id);

      if (error) throw error;

      showMessage('Authorised representative saved successfully', 'success');
      onUpdate();
    } catch (error) {
      console.error('Error saving authorised representative:', error);
      showMessage('Failed to save authorised representative', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AuthorisedRepresentative, value: string) => {
    setRep(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-primary-200 p-6">
      <div className="flex items-center mb-4">
        <UserCheck className="w-5 h-5 text-primary-600 mr-2" />
        <h2 className="text-lg font-semibold text-primary-900">Authorised Representative</h2>
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
        The person authorised to sign commercial onboarding documents on behalf of the organisation.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary-900 mb-1">
            Authorised Representative Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={rep.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm ${
              errors.name ? 'border-red-300' : 'border-primary-300'
            }`}
            placeholder="Full name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-900 mb-1">
            Position / Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={rep.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm ${
              errors.title ? 'border-red-300' : 'border-primary-300'
            }`}
            placeholder="e.g., Managing Director, CEO"
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1">
              Email
            </label>
            <input
              type="email"
              value={rep.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={rep.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
          {saving ? 'Saving...' : 'Save Representative'}
        </button>
      </div>
    </div>
  );
}
