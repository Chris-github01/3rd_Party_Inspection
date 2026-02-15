import { useState, useEffect } from 'react';
import { Search, Plus, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WizardData } from '../ProjectWizard';

interface Client {
  id: string;
  client_name: string;
  main_contractor: string;
  contact_name: string;
  contact_email: string;
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
    client_name: '',
    main_contractor: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data: clientsData, error } = await supabase
      .from('clients')
      .select('*')
      .order('client_name');

    if (error) {
      console.error('Error loading clients:', error);
      return;
    }

    setClients(clientsData || []);
  };

  const handleCreateClient = async () => {
    if (!newClient.client_name.trim()) {
      alert('Client name is required');
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
        clientName: createdClient.client_name,
      });
      setShowCreate(false);
      setNewClient({
        client_name: '',
        main_contractor: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
      });
    } catch (error: any) {
      console.error('Error creating client:', error);
      alert(`Failed to create client: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Choose a Client
        </h3>
        <p className="text-slate-600">
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
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700">
              All Clients ({filteredClients.length})
            </h4>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50"
            >
              <Plus className="w-4 h-4" />
              Create New Client
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-96 overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No clients found. Create a new one to get started.
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() =>
                    updateData({
                      clientId: client.id,
                      clientName: client.client_name,
                    })
                  }
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    data.clientId === client.id ? 'bg-primary-50 border-l-4 border-primary-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Building className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-slate-900">
                        {client.client_name}
                      </h5>
                      {client.main_contractor && (
                        <p className="text-sm text-slate-600 mt-1">
                          Main Contractor: {client.main_contractor}
                        </p>
                      )}
                      {client.contact_name && (
                        <p className="text-xs text-slate-500 mt-1">
                          Contact: {client.contact_name}
                          {client.contact_email && ` (${client.contact_email})`}
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
        <div className="space-y-4 border border-slate-200 rounded-lg p-6">
          <h4 className="font-semibold text-slate-900 mb-4">Create New Client</h4>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newClient.client_name}
              onChange={(e) =>
                setNewClient({ ...newClient, client_name: e.target.value })
              }
              placeholder="e.g., Auckland City Council"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Main Contractor
            </label>
            <input
              type="text"
              value={newClient.main_contractor}
              onChange={(e) =>
                setNewClient({ ...newClient, main_contractor: e.target.value })
              }
              placeholder="e.g., Fletcher Construction"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Name
            </label>
            <input
              type="text"
              value={newClient.contact_name}
              onChange={(e) =>
                setNewClient({ ...newClient, contact_name: e.target.value })
              }
              placeholder="e.g., John Smith"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={newClient.contact_email}
              onChange={(e) =>
                setNewClient({ ...newClient, contact_email: e.target.value })
              }
              placeholder="e.g., john.smith@example.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              value={newClient.contact_phone}
              onChange={(e) =>
                setNewClient({ ...newClient, contact_phone: e.target.value })
              }
              placeholder="e.g., +64 21 123 4567"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCreateClient}
              disabled={creating || !newClient.client_name.trim()}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Client'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              disabled={creating}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
