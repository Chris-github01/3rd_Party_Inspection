import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { Upload, Plus, Trash2, Eye, EyeOff, MoveUp, MoveDown, Save } from 'lucide-react';

interface ClientLogo {
  id: string;
  name: string;
  logo_url: string;
  display_order: number;
  active: boolean;
  preserve_colors: boolean;
  created_at: string;
}

export default function ClientLogos() {
  const [logos, setLogos] = useState<ClientLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchLogos();
  }, []);

  async function fetchLogos() {
    try {
      const { data, error } = await supabase
        .from('client_logos')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setLogos(data || []);
    } catch (error) {
      console.error('Error fetching logos:', error);
      showToast('Failed to load logos', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('client_logos')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;
      showToast(`Logo ${!currentActive ? 'activated' : 'deactivated'}`, 'success');
      fetchLogos();
    } catch (error) {
      console.error('Error toggling logo:', error);
      showToast('Failed to update logo', 'error');
    }
  }

  async function togglePreserveColors(id: string, currentValue: boolean) {
    try {
      const { error } = await supabase
        .from('client_logos')
        .update({ preserve_colors: !currentValue })
        .eq('id', id);

      if (error) throw error;
      showToast('Color setting updated', 'success');
      fetchLogos();
    } catch (error) {
      console.error('Error updating colors:', error);
      showToast('Failed to update setting', 'error');
    }
  }

  async function deleteLogo(id: string) {
    if (!confirm('Are you sure you want to delete this logo?')) return;

    try {
      const { error } = await supabase
        .from('client_logos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Logo deleted', 'success');
      fetchLogos();
    } catch (error) {
      console.error('Error deleting logo:', error);
      showToast('Failed to delete logo', 'error');
    }
  }

  async function moveOrder(id: string, direction: 'up' | 'down') {
    const currentIndex = logos.findIndex(l => l.id === id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= logos.length) return;

    const updates = [
      { id: logos[currentIndex].id, display_order: logos[swapIndex].display_order },
      { id: logos[swapIndex].id, display_order: logos[currentIndex].display_order }
    ];

    try {
      for (const update of updates) {
        const { error } = await supabase
          .from('client_logos')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }
      fetchLogos();
    } catch (error) {
      console.error('Error reordering:', error);
      showToast('Failed to reorder logos', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Loading logos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Client Logos</h1>
            <p className="text-slate-400">Manage logos displayed on the public website</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C8102E] hover:bg-[#A00D24] text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Logo
          </button>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Order</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Preview</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">URL</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Colors</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logos.map((logo, index) => (
                  <tr key={logo.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono">{logo.display_order}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveOrder(logo.id, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <MoveUp className="w-3 h-3 text-slate-400" />
                          </button>
                          <button
                            onClick={() => moveOrder(logo.id, 'down')}
                            disabled={index === logos.length - 1}
                            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <MoveDown className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-20 h-12 bg-slate-800 rounded flex items-center justify-center p-2">
                        <img
                          src={logo.logo_url}
                          alt={logo.name}
                          className={`max-w-full max-h-full object-contain ${
                            logo.preserve_colors ? '' : 'filter brightness-0 invert'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{logo.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400 text-sm font-mono truncate max-w-xs block">
                        {logo.logo_url}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePreserveColors(logo.id, logo.preserve_colors)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          logo.preserve_colors
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {logo.preserve_colors ? 'Original' : 'Filtered'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(logo.id, logo.active)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          logo.active
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {logo.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {logo.active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => deleteLogo(logo.id)}
                          className="p-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {logos.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No logos found. Click "Add Logo" to get started.
          </div>
        )}
      </div>

      {showAddModal && (
        <AddLogoModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchLogos();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddLogoModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [preserveColors, setPreserveColors] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !logoUrl.trim()) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setSaving(true);
    try {
      // Get the highest display_order
      const { data: maxOrderData } = await supabase
        .from('client_logos')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newOrder = (maxOrderData?.display_order || 0) + 1;

      const { error } = await supabase
        .from('client_logos')
        .insert({
          name: name.trim(),
          logo_url: logoUrl.trim(),
          display_order: newOrder,
          preserve_colors: preserveColors,
          active: true
        });

      if (error) throw error;
      showToast('Logo added successfully', 'success');
      onSuccess();
    } catch (error) {
      console.error('Error adding logo:', error);
      showToast('Failed to add logo', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Add New Logo</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Client Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C8102E]"
              placeholder="e.g., Company Name Ltd"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Logo URL
            </label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C8102E] font-mono text-sm"
              placeholder="/images/clients/logo.png"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Upload the logo to public/images/clients/ first
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveColors}
                onChange={(e) => setPreserveColors(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-[#C8102E] focus:ring-[#C8102E]"
              />
              <span className="text-sm text-slate-300">
                Preserve original colors (don't apply white filter)
              </span>
            </label>
            <p className="mt-1 ml-6 text-xs text-slate-500">
              Enable for colored logos like Hawkins or Cassidy
            </p>
          </div>

          {logoUrl && (
            <div className="pt-4 border-t border-slate-800">
              <p className="text-sm text-slate-400 mb-2">Preview:</p>
              <div className="bg-slate-800 rounded-lg p-8 flex items-center justify-center">
                <div className="w-48 h-24 flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt="Preview"
                    className={`max-w-full max-h-full object-contain ${
                      preserveColors ? '' : 'filter brightness-0 invert'
                    }`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#C8102E] hover:bg-[#A00D24] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Add Logo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
