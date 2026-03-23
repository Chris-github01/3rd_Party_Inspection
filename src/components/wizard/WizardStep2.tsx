import { useState, useEffect } from 'react';
import { Search, Plus, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WizardData } from '../ProjectWizard';

interface Client {
  id: string;
  name: string;
  company: string;
  contact_person: string;
  email: string;
}

interface WizardStep2Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function WizardStep2({ data, updateData }: WizardStep2Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    company: '',
    contact_person: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data: clientsData, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading clients:', error);
      return;
    }

    setClients(clientsData || []);
  };

  const handleCreateClient = async () => {
    if (!newClient.name.trim()) {
      alert('Client name is required');
      return;
    }
    if (!newClient.company.trim()) {
      alert('Company is required');
      return;
    }

    setCreating(true);
    try {
      const { data: createdClient, error } = await supabase
        .from('clients')
        .insert([newClient])
        .select()
        .single();

      if (error) throw error;

      await loadClients();
      updateData({
        clientId: createdClient.id,
        clientName: createdClient.name,
      });
      setShowCreate(false);
      setNewClient({
        name: '',
        company: '',
        contact_person: '',
        email: '',
        phone: '',
      });
    } catch (error: any) {
      console.error('Error creating client:', error);
      alert(`Failed to create client: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {data.organizationName && (
        <div className="bg-primary-900/20 border border-primary-600/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            {data.organizationLogoUrl ? (
              <img
                src={data.organizationLogoUrl}
                alt={data.organizationName}
                className="w-12 h-12 object-contain rounded"
              />
            ) : (
              <Building className="w-12 h-12 text-primary-400" />
            )}
            <div>
              <p className="text-xs text-slate-400">Organization</p>
              <p className="text-sm font-semibold text-white">{data.organizationName}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Choose a Client
        </h3>
        <p className="text-slate-300">
          Select an existing client or create a new one
        </p>
      </div>

      {!showCreate ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search or create a client"
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-300">
              All Clients ({filteredClients.length})
            </h4>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 text-primary-400 border border-primary-600 rounded-lg hover:bg-slate-700"
            >
              <Plus className="w-4 h-4" />
              Create New Client
            </button>
          </div>

          <div className="border border-slate-700 rounded-lg divide-y divide-slate-700 max-h-96 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No clients found. Create a new one to get started.
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() =>
                    updateData({
                      clientId: client.id,
                      clientName: client.name,
                    })
                  }
                  className={`p-4 cursor-pointer hover:bg-slate-700 transition-colors ${
                    data.clientId === client.id ? 'bg-primary-900/30 border-l-4 border-primary-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary-900/30 rounded-lg">
                      <Building className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-white">
                        {client.name}
                      </h5>
                      {client.company && (
                        <p className="text-sm text-slate-300 mt-1">
                          Company: {client.company}
                        </p>
                      )}
                      {client.contact_person && (
                        <p className="text-xs text-slate-400 mt-1">
                          Contact: {client.contact_person}
                          {client.email && ` (${client.email})`}
                        </p>
                      )}
                    </div>
                    {data.clientId === client.id && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4 border border-slate-700 rounded-lg p-6 bg-slate-800">
          <h4 className="font-semibold text-white mb-4">Create New Client</h4>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newClient.name}
              onChange={(e) =>
                setNewClient({ ...newClient, name: e.target.value })
              }
              placeholder="e.g., Auckland City Council"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Company <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newClient.company}
              onChange={(e) =>
                setNewClient({ ...newClient, company: e.target.value })
              }
              placeholder="e.g., Fletcher Construction"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contact Person
            </label>
            <input
              type="text"
              value={newClient.contact_person}
              onChange={(e) =>
                setNewClient({ ...newClient, contact_person: e.target.value })
              }
              placeholder="e.g., John Smith"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={newClient.email}
              onChange={(e) =>
                setNewClient({ ...newClient, email: e.target.value })
              }
              placeholder="e.g., john.smith@example.com"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={newClient.phone}
              onChange={(e) =>
                setNewClient({ ...newClient, phone: e.target.value })
              }
              placeholder="e.g., +64 21 123 4567"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCreateClient}
              disabled={creating || !newClient.name.trim() || !newClient.company.trim()}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Client'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              disabled={creating}
              className="px-4 py-2 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
