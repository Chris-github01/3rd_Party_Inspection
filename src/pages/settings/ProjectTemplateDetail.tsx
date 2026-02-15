import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Edit, X } from 'lucide-react';

interface MemberTemplate {
  id: string;
  name: string;
  element_type_default: string | null;
  measurement_method_default: string | null;
  checklist_json: any;
  notes: string | null;
  created_at: string;
}

type TabType = 'details' | 'forms' | 'jobs' | 'locations' | 'specifications' | 'materials' | 'statuses' | 'approvals' | 'folders';

export function ProjectTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [template, setTemplate] = useState<MemberTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('member_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'forms', label: 'Forms' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'locations', label: 'Locations' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'materials', label: 'Materials & Rates' },
    { id: 'statuses', label: 'Custom Statuses' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'folders', label: 'Folders' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Template not found</h2>
            <button
              onClick={() => navigate('/settings/templates/projects')}
              className="text-primary-600 hover:text-primary-700"
            >
              Back to templates
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/settings/templates/projects')}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-sm text-slate-600 mb-1">
              Library &gt; Project Templates
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Project Template: {template.name}
            </h1>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1">
            {activeTab === 'details' && (
              <DetailsTab template={template} onEdit={() => setShowEditModal(true)} />
            )}
            {activeTab === 'forms' && <FormsTab templateId={template.id} />}
            {activeTab === 'jobs' && <PlaceholderTab title="Jobs" />}
            {activeTab === 'locations' && <PlaceholderTab title="Locations" />}
            {activeTab === 'specifications' && <PlaceholderTab title="Specifications" />}
            {activeTab === 'materials' && <PlaceholderTab title="Materials & Rates" />}
            {activeTab === 'statuses' && <PlaceholderTab title="Custom Statuses" />}
            {activeTab === 'approvals' && <PlaceholderTab title="Approvals" />}
            {activeTab === 'folders' && <PlaceholderTab title="Folders" />}
          </main>
        </div>
      </div>

      {showEditModal && template && (
        <EditTemplateModal
          template={template}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            loadTemplate();
          }}
        />
      )}
    </div>
  );
}

function DetailsTab({ template, onEdit }: { template: MemberTemplate; onEdit: () => void }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 mb-2">Details</h2>
      <p className="text-slate-600 mb-6">Manage your template details.</p>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-slate-900">Details</h3>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Template Name</label>
            <p className="text-slate-900 mt-1">{template.name}</p>
          </div>

          {template.element_type_default && (
            <div>
              <label className="text-sm font-medium text-slate-700">Default Element Type</label>
              <p className="text-slate-900 mt-1 capitalize">{template.element_type_default}</p>
            </div>
          )}

          {template.measurement_method_default && (
            <div>
              <label className="text-sm font-medium text-slate-700">Default Measurement Method</label>
              <p className="text-slate-900 mt-1 uppercase">{template.measurement_method_default}</p>
            </div>
          )}

          {template.notes && (
            <div>
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <p className="text-slate-900 mt-1">{template.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormsTab({ templateId }: { templateId: string }) {
  const navigate = useNavigate();
  const [linkedForms, setLinkedForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLinkedForms();
  }, [templateId]);

  const loadLinkedForms = async () => {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .order('template_name');

      if (error) throw error;
      setLinkedForms(data || []);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 mb-2">Forms</h2>
      <p className="text-slate-600 mb-6">Select the Forms to be used with this template.</p>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Linked Forms</h3>
        <p className="text-slate-600 mb-4">{linkedForms.length} form(s) linked with this Project Template</p>

        <button
          onClick={() => navigate('/settings/templates/forms')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 mb-6"
        >
          Select Forms
        </button>

        {linkedForms.length > 0 && (
          <div className="space-y-2">
            {linkedForms.map((form) => (
              <div
                key={form.id}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <span className="text-slate-900">{form.template_name}</span>
                <div className="flex gap-2">
                  <button className="p-1 text-slate-400 hover:text-slate-600">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-600 mb-6">Configure {title.toLowerCase()} for this template.</p>

      <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
        <h3 className="text-lg font-medium text-slate-900 mb-2">Coming Soon</h3>
        <p className="text-slate-600">{title} configuration will be available here</p>
      </div>
    </div>
  );
}

function EditTemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: MemberTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    name: template.name,
    element_type_default: template.element_type_default || '',
    measurement_method_default: template.measurement_method_default || '',
    notes: template.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ELEMENT_TYPES = [
    { value: '', label: 'None' },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('member_templates')
        .update({
          name: formData.name,
          element_type_default: formData.element_type_default || null,
          measurement_method_default: formData.measurement_method_default || null,
          notes: formData.notes || null,
        })
        .eq('id', template.id);

      if (error) throw error;
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
          <h2 className="text-xl font-bold text-slate-900">Edit Template</h2>
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Default Element Type
              </label>
              <select
                value={formData.element_type_default}
                onChange={(e) => setFormData({ ...formData, element_type_default: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {ELEMENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Default Measurement Method
              </label>
              <select
                value={formData.measurement_method_default}
                onChange={(e) => setFormData({ ...formData, measurement_method_default: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {MEASUREMENT_METHODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
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
              {loading ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
