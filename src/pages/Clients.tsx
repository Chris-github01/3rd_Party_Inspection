import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Building2, Mail, Phone, X } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';

interface Client {
  id: string;
  client_name: string;
  main_contractor: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  billing_notes: string;
  logo_path: string | null;
  created_at: string;
}

export function Clients() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    loadClients();
    if (searchParams.get('new') === 'true') {
      setShowModal(true);
      setSearchParams({});
    }
  }, []);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('client_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      await loadClients();
    } catch (error: any) {
      alert('Error deleting client: ' + error.message);
    }
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'inspector';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  console.log('Clients page - profile:', profile, 'canEdit:', canEdit);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Clients</h1>
              <p className="text-blue-100 mt-1">Manage client contacts and information</p>
            </div>
            <button
              onClick={() => {
                setEditingClient(null);
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Client
            </button>
          </div>

          {clients.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-white/10 p-12 text-center bg-white/10 backdrop-blur-sm">
              <Building2 className="w-16 h-16 text-blue-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No clients yet</h3>
              <p className="text-blue-100 mb-6">Get started by adding your first client</p>
              {canEdit && (
                <button
                  onClick={() => {
                    setEditingClient(null);
                    setShowModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Client
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {client.client_name}
                      </h3>
                      {client.main_contractor && (
                        <p className="text-sm text-blue-100">Contractor: {client.main_contractor}</p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingClient(client);
                            setShowModal(true);
                          }}
                          className="p-1 text-primary-600 hover:bg-white/5 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="p-1 text-red-600 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {client.contact_name && (
                      <p className="text-sm text-white">
                        <span className="font-medium">Contact:</span> {client.contact_name}
                      </p>
                    )}
                    {client.contact_email && (
                      <div className="flex items-center text-sm text-blue-100">
                        <Mail className="w-4 h-4 mr-2" />
                        {client.contact_email}
                      </div>
                    )}
                    {client.contact_phone && (
                      <div className="flex items-center text-sm text-blue-100">
                        <Phone className="w-4 h-4 mr-2" />
                        {client.contact_phone}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="mt-4 w-full px-4 py-2 text-sm text-primary-600 border border-primary-600 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    View Projects
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ClientModal
          client={editingClient}
          onClose={() => {
            setShowModal(false);
            setEditingClient(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingClient(null);
            loadClients();
          }}
        />
      )}
    </div>
  );
}

function ClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    client_name: client?.client_name || '',
    main_contractor: client?.main_contractor || '',
    contact_name: client?.contact_name || '',
    contact_email: client?.contact_email || '',
    contact_phone: client?.contact_phone || '',
    billing_notes: client?.billing_notes || '',
    logo_path: client?.logo_path || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (client) {
        const { error } = await supabase
          .from('clients')
          .update(formData)
          .eq('id', client.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert(formData);
        if (error) throw error;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white/5 backdrop-blur-sm rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {client ? 'Edit Client' : 'New Client'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/20 text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Client Name *
              </label>
              <input
                type="text"
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Main Contractor
              </label>
              <input
                type="text"
                value={formData.main_contractor}
                onChange={(e) => setFormData({ ...formData, main_contractor: e.target.value })}
                className="w-full px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <ImageUpload
              currentImagePath={formData.logo_path}
              onImageUploaded={(path) => setFormData({ ...formData, logo_path: path })}
              label="Company Logo"
              maxSizeMB={5}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Billing Notes
              </label>
              <textarea
                value={formData.billing_notes}
                onChange={(e) => setFormData({ ...formData, billing_notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-white hover:bg-white/10 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : client ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
