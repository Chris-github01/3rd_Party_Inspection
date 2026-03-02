import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    main_contractor: '',
    site_address: '',
    project_ref: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from('projects')
        .insert({
          ...formData,
          status: 'active',
        });

      if (insertError) throw insertError;

      onSuccess();
      onClose();
      setFormData({
        name: '',
        client_name: '',
        main_contractor: '',
        site_address: '',
        project_ref: '',
        start_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen px-0 sm:px-4 pt-0 sm:pt-4 pb-0 sm:pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-slate-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-slate-800 backdrop-blur-sm rounded-t-2xl sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full max-h-[90vh] overflow-y-auto">
          <div className="bg-slate-800 backdrop-blur-sm px-4 sm:px-6 pt-5 pb-4 sticky top-0 z-10 border-b border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-medium text-white">Create New Project</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-500 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-200 text-red-400 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Commercial Tower Project"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-white mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Client Company Ltd"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-white mb-2">
                    Main Contractor
                  </label>
                  <input
                    type="text"
                    value={formData.main_contractor}
                    onChange={(e) => setFormData({ ...formData, main_contractor: e.target.value })}
                    className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Contractor Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Project Reference
                  </label>
                  <input
                    type="text"
                    value={formData.project_ref}
                    onChange={(e) => setFormData({ ...formData, project_ref: e.target.value })}
                    className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="PROJ-2024-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">
                    Site Address
                  </label>
                  <input
                    type="text"
                    value={formData.site_address}
                    onChange={(e) => setFormData({ ...formData, site_address: e.target.value })}
                    className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="123 Main Street, City"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-3 min-h-[48px] text-base border border-slate-600 bg-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Project notes..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sticky bottom-0 bg-slate-800 pb-4 sm:pb-0 border-t sm:border-t-0 border-slate-700 -mx-4 sm:mx-0 px-4 sm:px-0 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 min-h-[48px] border border-slate-600 rounded-lg text-white hover:bg-slate-700 order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-3 min-h-[48px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 order-1 sm:order-2"
                >
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
