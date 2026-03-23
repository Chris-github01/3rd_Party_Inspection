import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateClientModal({ isOpen, onClose, onSuccess }: CreateClientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from('clients')
        .insert(formData);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
      setFormData({
        name: '',
        company: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
      });
    } catch (err: any) {
      console.error('Error creating client:', err);
      setError(err.message || 'Failed to create client');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-slate-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-slate-800 backdrop-blur-sm rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-slate-800 backdrop-blur-sm px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Create New Client</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-200 text-red-400 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-white mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Client Company Limited"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-white mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+64 21 123 4567"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-white mb-1">
                    Address
                  </label>
                  <textarea
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="123 Main Street, Auckland 1010"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-600 rounded-lg text-white hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
