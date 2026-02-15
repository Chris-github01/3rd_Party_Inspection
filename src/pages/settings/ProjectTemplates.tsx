import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Trash2, FolderOpen, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MemberTemplate {
  id: string;
  name: string;
  element_type_default: string | null;
  measurement_method_default: string | null;
  checklist_json: any;
  notes: string | null;
  created_at: string;
}

const ELEMENT_TYPES = [
  { value: 'beam', label: 'Beam' },
  { value: 'column', label: 'Column' },
  { value: 'brace', label: 'Brace' },
  { value: 'other', label: 'Other' },
];

const MEASUREMENT_METHODS = [
  { value: 'dft', label: 'DFT (Dry Film Thickness)' },
  { value: 'thickness', label: 'Thickness' },
  { value: 'both', label: 'Both' },
];

export function ProjectTemplates() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<MemberTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MemberTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('member_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase.from('member_templates').delete().eq('id', id);
      if (error) throw error;
      await loadTemplates();
    } catch (error: any) {
      alert('Error deleting template: ' + error.message);
    }
  };

  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate('/settings/templates')}
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white">Project Templates</h1>
              <p className="text-blue-100 mt-1">Manage member templates for streamlined project setup</p>
            </div>
          {isAdmin && (
            <button
              onClick={() => {
                setEditingTemplate(null);
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Template
            </button>
          )}
        </div>

          {templates.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border-2 border-dashed border-white/10 p-12 text-center">
            <FolderOpen className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No project templates yet</h3>
            <p className="text-blue-100 mb-6">Create your first project template</p>
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Template
              </button>
            )}
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 backdrop-blur-sm border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                      Element Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                      Measurement Method
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {templates.map((template) => (
                    <tr
                      key={template.id}
                      onClick={() => navigate(`/settings/templates/projects/${template.id}`)}
                      className="hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {template.name}
                      </td>
                      <td className="px-6 py-4">
                        {template.element_type_default ? (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-500/20 text-primary-300 rounded capitalize">
                            {template.element_type_default}
                          </span>
                        ) : (
                          <span className="text-blue-300 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {template.measurement_method_default ? (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-500/20 text-green-300 rounded uppercase">
                            {template.measurement_method_default}
                          </span>
                        ) : (
                          <span className="text-blue-300 text-sm">-</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setEditingTemplate(template);
                                setShowModal(true);
                              }}
                              className="p-1 text-primary-300 hover:bg-white/5 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="p-1 text-red-300 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingTemplate(null);
            loadTemplates();
          }}
        />
      )}
    </div>
  );
}

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: MemberTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    element_type_default: template?.element_type_default || 'beam',
    measurement_method_default: template?.measurement_method_default || 'dft',
    notes: template?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        name: formData.name,
        element_type_default: formData.element_type_default,
        measurement_method_default: formData.measurement_method_default,
        checklist_json: template?.checklist_json || [],
        notes: formData.notes,
      };

      if (template) {
        const { error } = await supabase
          .from('member_templates')
          .update(data)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('member_templates').insert(data);
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
      <div className="bg-white/5 backdrop-blur-sm rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {template ? 'Edit Template' : 'New Template'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Template Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Standard Steel Beam"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Default Element Type
              </label>
              <select
                value={formData.element_type_default || ''}
                onChange={(e) => setFormData({ ...formData, element_type_default: e.target.value })}
                className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">None</option>
                {ELEMENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Default Measurement Method
              </label>
              <select
                value={formData.measurement_method_default || ''}
                onChange={(e) => setFormData({ ...formData, measurement_method_default: e.target.value })}
                className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {MEASUREMENT_METHODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-white/20 bg-white/5 text-white placeholder-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Additional notes about this template..."
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
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : template ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
