import { useState, useEffect } from 'react';
import { ClipboardList, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OnboardingBrandingCard } from '../../components/settings/OnboardingBrandingCard';
import { OnboardingPackDefaultsForm } from '../../components/settings/OnboardingPackDefaultsForm';
import { OnboardingRegisteredAddressCard } from '../../components/settings/OnboardingRegisteredAddressCard';
import { OnboardingAuthorisedRepCard } from '../../components/settings/OnboardingAuthorisedRepCard';
import { OnboardingPlatformAdminCard } from '../../components/settings/OnboardingPlatformAdminCard';
import { OnboardingSectionsCard } from '../../components/settings/OnboardingSectionsCard';
import { OnboardingExportCard } from '../../components/settings/OnboardingExportCard';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  onboarding_config: any;
}

export function Onboarding() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url, onboarding_config')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setOrganizations(data || []);

      if (data && data.length > 0 && !selectedOrgId) {
        setSelectedOrgId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
  };

  const handleConfigUpdate = () => {
    loadOrganizations();
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="min-h-full bg-gradient-to-br from-primary-50 via-white to-blue-50 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-h-full bg-gradient-to-br from-primary-50 via-white to-blue-50 p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center mb-2">
              <ClipboardList className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-3xl font-bold text-primary-900">VerifyTrade Onboarding</h1>
            </div>
            <p className="text-primary-600 ml-11">
              Configure branded client onboarding packs for the selected organisation.
            </p>
          </div>

          {/* Organization Selector */}
          {organizations.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">No Organizations Found</h3>
                  <p className="text-amber-700 text-sm">
                    Please create an organization first in Settings → Organizations before configuring onboarding packs.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-primary-200 p-6">
                <label className="block text-sm font-medium text-primary-900 mb-2">
                  Select Organisation
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => handleOrgChange(e.target.value)}
                  className="w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-primary-600">
                  The onboarding pack will be branded and configured for this organisation.
                </p>
              </div>

              {selectedOrg && (
                <>
                  {/* Branding Section */}
                  <OnboardingBrandingCard
                    organization={selectedOrg}
                    onUpdate={handleConfigUpdate}
                  />

                  {/* Pack Defaults Section */}
                  <OnboardingPackDefaultsForm
                    organization={selectedOrg}
                    onUpdate={handleConfigUpdate}
                  />

                  {/* Registered Address */}
                  <OnboardingRegisteredAddressCard
                    organization={selectedOrg}
                    onUpdate={handleConfigUpdate}
                  />

                  {/* Authorised Representative */}
                  <OnboardingAuthorisedRepCard
                    organization={selectedOrg}
                    onUpdate={handleConfigUpdate}
                  />

                  {/* Platform Administrator */}
                  <OnboardingPlatformAdminCard
                    organization={selectedOrg}
                    onUpdate={handleConfigUpdate}
                  />

                  {/* Included Sections */}
                  <OnboardingSectionsCard
                    organization={selectedOrg}
                    onUpdate={handleConfigUpdate}
                  />

                  {/* Export Actions */}
                  <OnboardingExportCard
                    organization={selectedOrg}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
