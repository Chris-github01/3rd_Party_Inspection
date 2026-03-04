import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { CreateOrganizationModal } from '../../components/CreateOrganizationModal';
import { EditOrganizationModal } from '../../components/EditOrganizationModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface Organization {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.phone?.includes(searchTerm)
      );
      setFilteredOrgs(filtered);
    } else {
      setFilteredOrgs(organizations);
    }
  }, [searchTerm, organizations]);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
      setFilteredOrgs(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      showMessage('Failed to load organizations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!selectedOrg) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', selectedOrg.id);

      if (error) {
        if (error.message.includes('Cannot delete organization')) {
          throw new Error('Cannot delete organization with existing projects');
        }
        throw error;
      }

      showMessage('Organization deleted successfully', 'success');
      loadOrganizations();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      showMessage(error.message || 'Failed to delete organization', 'error');
    } finally {
      setShowDeleteDialog(false);
      setSelectedOrg(null);
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
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
      <div className="p-8 max-w-7xl">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-primary-600" />
                <h1 className="text-3xl font-bold text-white">Organizations</h1>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Organization
              </button>
            </div>
            <p className="text-blue-100">
              Manage multiple organizations for your inspection reports
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search organizations..."
                className="w-full pl-10 pr-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg ${
                message.includes('success')
                  ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                  : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}
            >
              {message}
            </div>
          )}

          {/* Organizations Grid */}
          {filteredOrgs.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">
                {searchTerm ? 'No organizations found' : 'No organizations yet'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 text-primary-400 hover:text-primary-300"
                >
                  Create your first organization
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:border-primary-500/50 transition-all"
                >
                  {/* Logo and Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
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
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        org.is_active
                          ? 'bg-green-500/10 text-green-300'
                          : 'bg-slate-500/10 text-slate-400'
                      }`}
                    >
                      {org.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Organization Details */}
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                    {org.name}
                  </h3>
                  <div className="space-y-1 text-sm text-slate-300 mb-4">
                    {org.email && (
                      <p className="truncate">{org.email}</p>
                    )}
                    {org.phone && (
                      <p>{org.phone}</p>
                    )}
                    {org.address && (
                      <p className="truncate">{org.address}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-white/10">
                    <button
                      onClick={() => {
                        setSelectedOrg(org);
                        setShowEditModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-600/20 text-primary-300 rounded-lg hover:bg-primary-600/30 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrg(org);
                        setShowDeleteDialog(true);
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateOrganizationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadOrganizations();
          showMessage('Organization created successfully', 'success');
        }}
      />

      {selectedOrg && (
        <EditOrganizationModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedOrg(null);
          }}
          organization={selectedOrg}
          onSuccess={() => {
            loadOrganizations();
            showMessage('Organization updated successfully', 'success');
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Organization"
        message={`Are you sure you want to delete "${selectedOrg?.name}"? This action cannot be undone. Organizations with existing projects cannot be deleted.`}
        confirmText="Delete"
        onConfirm={handleDeleteOrg}
        onCancel={() => {
          setShowDeleteDialog(false);
          setSelectedOrg(null);
        }}
      />
    </div>
  );
}
