import { useState, useEffect } from 'react';
import { Building2, AlertCircle, ExternalLink, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WizardData } from '../ProjectWizard';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
}

interface WizardStep0Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function WizardStep0({ data, updateData }: WizardStep0Props) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const { data: orgs, error: fetchError } = await supabase
        .from('organizations')
        .select('id, name, logo_url, address, email, phone')
        .eq('is_active', true)
        .order('name');

      if (fetchError) throw fetchError;

      setOrganizations(orgs || []);

      // Auto-select if only one organization
      if (orgs && orgs.length === 1 && !data.organizationId) {
        handleSelectOrganization(orgs[0]);
      }
    } catch (err: any) {
      console.error('Error loading organizations:', err);
      setError(err.message || 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrganization = (org: Organization) => {
    updateData({
      organizationId: org.id,
      organizationName: org.name,
      organizationLogoUrl: org.logo_url,
    });
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg mb-2">Error Loading Organizations</p>
        <p className="text-slate-400">{error}</p>
        <button
          onClick={loadOrganizations}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-primary-600/20 p-4 rounded-full">
            <Building2 className="w-12 h-12 text-primary-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Select Your Organization
        </h2>
        <p className="text-slate-300 text-base max-w-2xl mx-auto">
          Choose the organization for this project. This determines what branding appears on reports,
          which clients and templates are available, and how project data is organized.
        </p>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 font-medium mb-1">Important</p>
            <p className="text-amber-300/80 text-sm">
              Organization cannot be changed after project creation. All reports will use this organization's
              branding (logo, name, address, contact details).
            </p>
          </div>
        </div>
      </div>

      {/* No Organizations State */}
      {organizations.length === 0 && (
        <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
          <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-white text-lg font-medium mb-2">No Active Organizations Found</p>
          <p className="text-slate-400 mb-4">
            You need to create at least one active organization before creating a project.
          </p>
          <a
            href="/settings/organizations"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            Create Organization
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Search (show if more than 3 organizations) */}
      {organizations.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search organizations..."
            className="w-full pl-10 pr-4 py-3 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Organizations Grid */}
      {organizations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredOrganizations.map((org) => {
            const isSelected = data.organizationId === org.id;
            return (
              <button
                key={org.id}
                onClick={() => handleSelectOrganization(org)}
                className={`text-left p-6 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20'
                    : 'border-white/10 bg-white/5 hover:border-primary-500/50 hover:bg-white/10'
                }`}
              >
                {/* Logo and Selected Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  {isSelected && (
                    <span className="px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
                      Selected
                    </span>
                  )}
                </div>

                {/* Organization Details */}
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                  {org.name}
                </h3>
                <div className="space-y-1 text-sm text-slate-300">
                  {org.email && (
                    <p className="truncate">{org.email}</p>
                  )}
                  {org.phone && (
                    <p>{org.phone}</p>
                  )}
                  {org.address && (
                    <p className="truncate text-slate-400">{org.address}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No Search Results */}
      {organizations.length > 0 && filteredOrganizations.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400">No organizations match your search.</p>
        </div>
      )}

      {/* Selected Organization Summary (if selected) */}
      {data.organizationId && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {data.organizationLogoUrl ? (
                <img
                  src={data.organizationLogoUrl}
                  alt={data.organizationName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-green-300 font-medium mb-1">Organization Selected</p>
              <p className="text-white font-semibold">{data.organizationName}</p>
              <p className="text-green-300/80 text-sm mt-1">
                All project data and reports will use this organization's branding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Message */}
      {!data.organizationId && organizations.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
          <p className="text-blue-300 text-sm">
            👆 Please select an organization above to continue
          </p>
        </div>
      )}
    </div>
  );
}
