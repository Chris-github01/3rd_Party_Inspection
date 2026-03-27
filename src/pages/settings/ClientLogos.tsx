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
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    console.log('ClientLogos component mounted');
    fetchLogos();
  }, []);

  async function fetchLogos() {
    try {
      console.log('Fetching logos...');
      setError(null);
      const { data, error } = await supabase
        .from('client_logos')
        .select('*')
        .order('display_order');

      if (error) throw error;
      console.log('Logos fetched:', data);
      setLogos(data || []);
    } catch (error: any) {
      console.error('Error fetching logos:', error);
      setError(error.message || 'Failed to load logos');
      showToast('Failed to load logos', 'error');
    } finally {
      console.log('Setting loading to false');
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

  async function deleteLogo(id: string, event?: React.MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!window.confirm('Are you sure you want to delete this logo?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('client_logos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Logo deleted', 'success');
      await fetchLogos();
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

  console.log('ClientLogos render - loading:', loading, 'logos count:', logos.length, 'showAddModal:', showAddModal, 'error:', error);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0F14]">
        <div className="text-slate-400">Loading logos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0F14] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-300">Error: {error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchLogos();
              }}
              className="mt-4 px-4 py-2 bg-[#C8102E] hover:bg-[#A00D24] text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
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
            type="button"
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
                  <th className="text-left px-4 py-4 text-sm font-semibold text-slate-300 w-24">Order</th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-slate-300 w-28">Preview</th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-slate-300">Name</th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-slate-300">URL</th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-slate-300 w-24">Colors</th>
                  <th className="text-left px-4 py-4 text-sm font-semibold text-slate-300 w-24">Status</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-slate-300 w-20">Delete</th>
                </tr>
              </thead>
              <tbody>
                {logos.map((logo, index) => (
                  <tr key={logo.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-mono text-sm">{logo.display_order}</span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveOrder(logo.id, 'up'); }}
                            disabled={index === 0}
                            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <MoveUp className="w-3 h-3 text-slate-400" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveOrder(logo.id, 'down'); }}
                            disabled={index === logos.length - 1}
                            className="p-1 hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <MoveDown className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4">
                      <span className="text-white font-medium">{logo.name}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-slate-400 text-sm font-mono truncate max-w-xs block">
                        {logo.logo_url}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePreserveColors(logo.id, logo.preserve_colors); }}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          logo.preserve_colors
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                        title="Toggle color preservation"
                      >
                        {logo.preserve_colors ? 'Original' : 'Filtered'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleActive(logo.id, logo.active); }}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          logo.active
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                        title="Toggle visibility"
                      >
                        {logo.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {logo.active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteLogo(logo.id, e);
                          }}
                          className="p-2 hover:bg-red-500/20 bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg transition-colors border border-red-500/30 hover:border-red-500/50"
                          title="Delete logo"
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preserveColors, setPreserveColors] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      showToast('Please select a PNG or JPEG file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error');
      return;
    }

    setLogoFile(file);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);
  }

  async function uploadLogo(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('client-logos')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('client-logos')
      .getPublicUrl(filePath);

    return publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a client name', 'error');
      return;
    }

    if (!logoFile) {
      showToast('Please select a logo file', 'error');
      return;
    }

    setSaving(true);
    try {
      // Upload the logo file
      setUploading(true);
      const uploadedUrl = await uploadLogo(logoFile);
      setUploading(false);

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
          logo_url: uploadedUrl,
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
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-w-md w-full my-8">
        <div className="px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-xl font-bold text-white">Add New Logo</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
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
              Logo File
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
                className="hidden"
                id="logo-upload"
                required
              />
              <label
                htmlFor="logo-upload"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-800 border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-lg cursor-pointer transition-colors group"
              >
                <Upload className="w-5 h-5 text-slate-400 group-hover:text-slate-300" />
                <span className="text-slate-400 group-hover:text-slate-300">
                  {logoFile ? logoFile.name : 'Click to upload PNG or JPEG'}
                </span>
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Maximum file size: 5MB
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={preserveColors}
                onChange={(e) => setPreserveColors(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-slate-800 text-[#C8102E] focus:ring-[#C8102E]"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  Logo has a dark/black background (don't apply white filter)
                </span>
                <p className="mt-1 text-xs text-slate-400">
                  ✓ Check this if your logo file has a DARK/BLACK BACKGROUND<br/>
                  ✓ The logo graphics should already be light/white colored<br/>
                  ✗ Uncheck for TRANSPARENT background logos (they'll be converted to white)
                </p>
              </div>
            </label>
          </div>

          {logoFile && logoUrl && (
            <div className="pt-4 border-t border-slate-800">
              <p className="text-sm text-slate-400 mb-3">Preview (as it will appear on website):</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2">On Dark Background:</p>
                  <div className="bg-[#0B0F14] border border-slate-700 rounded-lg p-6 flex items-center justify-center">
                    <div className="w-32 h-20 flex items-center justify-center">
                      <img
                        src={logoUrl}
                        alt="Preview Dark"
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
                <div>
                  <p className="text-xs text-slate-500 mb-2">Original:</p>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 flex items-center justify-center">
                    <div className="w-32 h-20 flex items-center justify-center">
                      <img
                        src={logoUrl}
                        alt="Preview Original"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {!preserveColors && (
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 If you see a WHITE BOX on the dark preview, your logo has a dark background. Check the box above to fix it!
                  </p>
                </div>
              )}
              {preserveColors && (
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-xs text-green-300">
                    ✓ Your logo has a dark background. This setting will preserve it as-is on the website.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-slate-900 pb-2 -mb-6 -mx-6 px-6 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 px-4 py-2 bg-[#C8102E] hover:bg-[#A00D24] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>Uploading...</>
              ) : saving ? (
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
