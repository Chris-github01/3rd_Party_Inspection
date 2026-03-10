import { useState, useEffect } from 'react';
import { MapPin, Save, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OnboardingRegisteredAddressCardProps {
  organization: {
    id: string;
    name: string;
    onboarding_config: any;
  };
  onUpdate: () => void;
}

interface RegisteredAddress {
  line1: string;
  line2: string;
  suburb: string;
  city: string;
  postcode: string;
  country: string;
}

const defaultAddress: RegisteredAddress = {
  line1: '',
  line2: '',
  suburb: '',
  city: '',
  postcode: '',
  country: 'New Zealand'
};

export function OnboardingRegisteredAddressCard({ organization, onUpdate }: OnboardingRegisteredAddressCardProps) {
  const [address, setAddress] = useState<RegisteredAddress>(defaultAddress);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (organization.onboarding_config?.registeredAddress) {
      setAddress({ ...defaultAddress, ...organization.onboarding_config.registeredAddress });
    } else {
      setAddress(defaultAddress);
    }
  }, [organization]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!address.line1.trim()) {
      newErrors.line1 = 'Address Line 1 is required';
    }
    if (!address.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!address.country.trim()) {
      newErrors.country = 'Country is required';
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
        registeredAddress: address
      };

      const { error } = await supabase
        .from('organizations')
        .update({ onboarding_config: updatedConfig })
        .eq('id', organization.id);

      if (error) throw error;

      showMessage('Registered address saved successfully', 'success');
      onUpdate();
    } catch (error) {
      console.error('Error saving registered address:', error);
      showMessage('Failed to save registered address', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof RegisteredAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-primary-200 p-6">
      <div className="flex items-center mb-4">
        <MapPin className="w-5 h-5 text-primary-600 mr-2" />
        <h2 className="text-lg font-semibold text-primary-900">Registered Address</h2>
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
        Used for legal identification, invoicing, and onboarding documentation.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary-900 mb-1">
            Address Line 1 <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={address.line1}
            onChange={(e) => handleChange('line1', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm ${
              errors.line1 ? 'border-red-300' : 'border-primary-300'
            }`}
            placeholder="Street address, building name"
          />
          {errors.line1 && <p className="mt-1 text-sm text-red-600">{errors.line1}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-900 mb-1">
            Address Line 2
          </label>
          <input
            type="text"
            value={address.line2}
            onChange={(e) => handleChange('line2', e.target.value)}
            className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            placeholder="Unit, suite, floor (optional)"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1">
              Suburb / Area
            </label>
            <input
              type="text"
              value={address.suburb}
              onChange={(e) => handleChange('suburb', e.target.value)}
              className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              placeholder="Suburb or area"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1">
              City <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={address.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm ${
                errors.city ? 'border-red-300' : 'border-primary-300'
              }`}
              placeholder="City"
            />
            {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1">
              Postcode
            </label>
            <input
              type="text"
              value={address.postcode}
              onChange={(e) => handleChange('postcode', e.target.value)}
              className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              placeholder="Postcode"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1">
              Country / Region <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={address.country}
              onChange={(e) => handleChange('country', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm ${
                errors.country ? 'border-red-300' : 'border-primary-300'
              }`}
              placeholder="Country"
            />
            {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
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
          {saving ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </div>
  );
}
