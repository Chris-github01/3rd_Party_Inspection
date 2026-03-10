import { useState, useEffect } from 'react';
import { ListChecks, Save, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OnboardingSectionsCardProps {
  organization: {
    id: string;
    name: string;
    onboarding_config: any;
  };
  onUpdate: () => void;
}

interface SectionToggles {
  includeCoverPage: boolean;
  includeSubscriptionAgreement: boolean;
  includeDirectDebitAuthority: boolean;
  includeOrganisationSetup: boolean;
  includeAuthorisedSignatory: boolean;
}

const defaultToggles: SectionToggles = {
  includeCoverPage: true,
  includeSubscriptionAgreement: true,
  includeDirectDebitAuthority: true,
  includeOrganisationSetup: true,
  includeAuthorisedSignatory: true
};

export function OnboardingSectionsCard({ organization, onUpdate }: OnboardingSectionsCardProps) {
  const [sections, setSections] = useState<SectionToggles>(defaultToggles);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (organization.onboarding_config) {
      setSections({
        includeCoverPage: organization.onboarding_config.includeCoverPage ?? true,
        includeSubscriptionAgreement: organization.onboarding_config.includeSubscriptionAgreement ?? true,
        includeDirectDebitAuthority: organization.onboarding_config.includeDirectDebitAuthority ?? true,
        includeOrganisationSetup: organization.onboarding_config.includeOrganisationSetup ?? true,
        includeAuthorisedSignatory: organization.onboarding_config.includeAuthorisedSignatory ?? true
      });
    }
  }, [organization]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggle = (field: keyof SectionToggles) => {
    setSections(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedConfig = {
        ...organization.onboarding_config,
        ...sections
      };

      const { error } = await supabase
        .from('organizations')
        .update({ onboarding_config: updatedConfig })
        .eq('id', organization.id);

      if (error) throw error;

      showMessage('Section settings saved successfully', 'success');
      onUpdate();
    } catch (error) {
      console.error('Error saving section settings:', error);
      showMessage('Failed to save section settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const sectionsList = [
    { key: 'includeCoverPage' as keyof SectionToggles, label: 'Cover Page', description: 'Title page with branding and pack overview' },
    { key: 'includeSubscriptionAgreement' as keyof SectionToggles, label: 'Enterprise Subscription Agreement', description: 'Client agreement for VerifyTrade services' },
    { key: 'includeDirectDebitAuthority' as keyof SectionToggles, label: 'Direct Debit Authority', description: 'Payment authorization form' },
    { key: 'includeOrganisationSetup' as keyof SectionToggles, label: 'Organisation Setup Details', description: 'Client organization information form' },
    { key: 'includeAuthorisedSignatory' as keyof SectionToggles, label: 'Authorised Signatory', description: 'Signature and approval section' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-primary-200 p-6">
      <div className="flex items-center mb-4">
        <ListChecks className="w-5 h-5 text-primary-600 mr-2" />
        <h2 className="text-lg font-semibold text-primary-900">Included Sections</h2>
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
        Select which sections will be included in the exported onboarding pack.
      </p>

      <div className="space-y-3 mb-6">
        {sectionsList.map((section) => (
          <label
            key={section.key}
            className="flex items-start p-4 border border-primary-200 rounded-lg hover:bg-primary-50/50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={sections[section.key]}
              onChange={() => handleToggle(section.key)}
              className="mt-1 h-4 w-4 text-primary-600 border-primary-300 rounded focus:ring-primary-500"
            />
            <div className="ml-3 flex-1">
              <div className="font-medium text-primary-900">{section.label}</div>
              <div className="text-sm text-primary-600 mt-0.5">{section.description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-primary-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Section Settings'}
        </button>
      </div>
    </div>
  );
}
