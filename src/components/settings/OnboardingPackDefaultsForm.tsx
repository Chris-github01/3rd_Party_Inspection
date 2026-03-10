import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OnboardingPackDefaultsFormProps {
  organization: {
    id: string;
    name: string;
    onboarding_config: any;
  };
  onUpdate: () => void;
}

interface OnboardingConfig {
  serviceOperatedBy: string;
  returnEmail: string;
  platformTagline: string;
  packageName: string;
  billingFrequency: string;
  subscriptionFeeLabel: string;
  agreementDescription: string;
  debitAuthorityDescription: string;
  countryRegion: string;
  industryType: string;
  primaryTradeFocus: string;
  projectSizeRange: string;
  jurisdictionCodeSet: string;
  complianceRole: string;
  footerLine: string;
}

const defaultConfig: OnboardingConfig = {
  serviceOperatedBy: 'P&R Consulting Limited',
  returnEmail: 'admin@verifytrade.co.nz',
  platformTagline: 'Commercial Trade Compliance Platform',
  packageName: 'VerifyTrade Full Package - 5 Users',
  billingFrequency: 'Monthly',
  subscriptionFeeLabel: 'NZD ______ per month excl GST',
  agreementDescription: 'The VerifyTrade platform provides commercial quote auditing, compliance review tools, and reporting capabilities designed to support construction commercial management.',
  debitAuthorityDescription: 'I/We authorise P&R Consulting Limited trading as VerifyTrade to debit the nominated bank account for the monthly subscription relating to the VerifyTrade platform.',
  countryRegion: 'New Zealand',
  industryType: 'Main Contractor',
  primaryTradeFocus: 'Passive Fire Protection',
  projectSizeRange: 'Less than $5m',
  jurisdictionCodeSet: 'NZBC',
  complianceRole: 'Awarding Party',
  footerLine: 'VerifyTrade | Commercial Compliance Platform | Operated by P&R Consulting Limited'
};

export function OnboardingPackDefaultsForm({ organization, onUpdate }: OnboardingPackDefaultsFormProps) {
  const [config, setConfig] = useState<OnboardingConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (organization.onboarding_config) {
      setConfig({ ...defaultConfig, ...organization.onboarding_config });
    } else {
      setConfig(defaultConfig);
    }
  }, [organization]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedConfig = {
        ...organization.onboarding_config,
        ...config
      };

      const { error } = await supabase
        .from('organizations')
        .update({ onboarding_config: updatedConfig })
        .eq('id', organization.id);

      if (error) throw error;

      showMessage('Configuration saved successfully', 'success');
      onUpdate();
    } catch (error) {
      console.error('Error saving configuration:', error);
      showMessage('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof OnboardingConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-primary-200 p-6">
      <div className="flex items-center mb-4">
        <SettingsIcon className="w-5 h-5 text-primary-600 mr-2" />
        <h2 className="text-lg font-semibold text-primary-900">Onboarding Pack Defaults</h2>
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

      <div className="space-y-6">
        {/* Cover / Branding */}
        <div>
          <h3 className="font-medium text-primary-900 mb-3 pb-2 border-b border-primary-200">
            Cover / Branding
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Service Operated By
              </label>
              <input
                type="text"
                value={config.serviceOperatedBy}
                onChange={(e) => handleChange('serviceOperatedBy', e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Return Email
              </label>
              <input
                type="email"
                value={config.returnEmail}
                onChange={(e) => handleChange('returnEmail', e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Platform Tagline
              </label>
              <input
                type="text"
                value={config.platformTagline}
                onChange={(e) => handleChange('platformTagline', e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Subscription Agreement */}
        <div>
          <h3 className="font-medium text-primary-900 mb-3 pb-2 border-b border-primary-200">
            Subscription Agreement
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Subscription Package Name
              </label>
              <input
                type="text"
                value={config.packageName}
                onChange={(e) => handleChange('packageName', e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-900 mb-1">
                  Billing Frequency
                </label>
                <select
                  value={config.billingFrequency}
                  onChange={(e) => handleChange('billingFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Annually</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-900 mb-1">
                  Subscription Fee Label
                </label>
                <input
                  type="text"
                  value={config.subscriptionFeeLabel}
                  onChange={(e) => handleChange('subscriptionFeeLabel', e.target.value)}
                  className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Agreement Description
              </label>
              <textarea
                value={config.agreementDescription}
                onChange={(e) => handleChange('agreementDescription', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Direct Debit Authority */}
        <div>
          <h3 className="font-medium text-primary-900 mb-3 pb-2 border-b border-primary-200">
            Direct Debit Authority
          </h3>
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1">
              Debit Authority Description
            </label>
            <textarea
              value={config.debitAuthorityDescription}
              onChange={(e) => handleChange('debitAuthorityDescription', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Organisation Setup Defaults */}
        <div>
          <h3 className="font-medium text-primary-900 mb-3 pb-2 border-b border-primary-200">
            Organisation Setup Defaults
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Default Country / Region
              </label>
              <input
                type="text"
                value={config.countryRegion}
                onChange={(e) => handleChange('countryRegion', e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Default Industry Type
              </label>
              <input
                type="text"
                value={config.industryType}
                onChange={(e) => handleChange('industryType', e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Default Primary Trade Focus
              </label>
              <input
                type="text"
                value={config.primaryTradeFocus}
                onChange={(e) => handleChange('primaryTradeFocus', e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Default Project Size Range
              </label>
              <select
                value={config.projectSizeRange}
                onChange={(e) => handleChange('projectSizeRange', e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option>Less than $5m</option>
                <option>$5m - $20m</option>
                <option>$20m - $50m</option>
                <option>Over $50m</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Default Jurisdiction / Code Set
              </label>
              <input
                type="text"
                value={config.jurisdictionCodeSet}
                onChange={(e) => handleChange('jurisdictionCodeSet', e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-900 mb-1">
                Default Compliance Role
              </label>
              <input
                type="text"
                value={config.complianceRole}
                onChange={(e) => handleChange('complianceRole', e.target.value)}
                className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer Line */}
        <div>
          <h3 className="font-medium text-primary-900 mb-3 pb-2 border-b border-primary-200">
            Footer / Return Details
          </h3>
          <div>
            <label className="block text-sm font-medium text-primary-900 mb-1">
              Footer Line
            </label>
            <input
              type="text"
              value={config.footerLine}
              onChange={(e) => handleChange('footerLine', e.target.value)}
              className="w-full px-3 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-primary-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
