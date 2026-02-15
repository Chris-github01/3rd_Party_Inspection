import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Trash2, FileText, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FormTemplate {
  id: string;
  template_name: string;
  applies_to: string;
  template_json: {
    sections: any[];
  };
  created_at: string;
}

const APPLIES_TO_OPTIONS = [
  { value: 'intumescent', label: 'Intumescent' },
  { value: 'cementitious', label: 'Cementitious' },
  { value: 'both', label: 'Both' },
  { value: 'ncr', label: 'NCR' },
  { value: 'general', label: 'General' },
];

export function FormTemplates() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .order('template_name');

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
      const { error } = await supabase.from('form_templates').delete().eq('id', id);
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
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate('/settings/templates')}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">Form Templates</h1>
              <p className="text-slate-600 mt-1">Create and manage custom form templates for inspections</p>
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
            <div className="bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No form templates yet</h3>
            <p className="text-slate-600 mb-6">Create your first form template</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => navigate(`/settings/templates/forms/${template.id}`)}
                  className="bg-slate-50 rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {template.template_name}
                    </h3>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded capitalize">
                      {template.applies_to}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowModal(true);
                        }}
                        className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-sm text-slate-600">
                  {template.template_json?.sections?.length || 0} sections
                </div>
              </div>
              ))}
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
  template: FormTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    template_name: template?.template_name || '',
    applies_to: template?.applies_to || 'intumescent',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        template_name: formData.template_name,
        applies_to: formData.applies_to,
        template_json: template?.template_json || { sections: [] },
      };

      if (template) {
        const { error } = await supabase
          .from('form_templates')
          .update(data)
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('form_templates').insert(data);
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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {template ? 'Edit Template' : 'New Template'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                required
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Standard Intumescent Inspection"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Applies To *
              </label>
              <select
                value={formData.applies_to}
                onChange={(e) => setFormData({ ...formData, applies_to: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {APPLIES_TO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
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
