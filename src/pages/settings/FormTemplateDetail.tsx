import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, Plus, GripVertical, ChevronDown, ChevronUp,
  Copy, Trash2, MoreHorizontal, X, Menu, List, Save
} from 'lucide-react';

interface FormTemplate {
  id: string;
  template_name: string;
  applies_to: string;
  template_json: {
    sections: FormSection[];
  };
  created_at: string;
}

interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
  collapsed?: boolean;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: any;
}

type FieldType = {
  id: string;
  label: string;
  description: string;
  icon: string;
};

const FIELD_TYPES: FieldType[] = [
  { id: 'section', label: 'New Section', description: 'Organise your forms by section', icon: '☰' },
  { id: 'text', label: 'Text', description: 'Small or large text input', icon: 'T' },
  { id: 'yesno', label: 'Yes/No', description: 'Toggle either yes or no', icon: '⚪' },
  { id: 'select', label: 'Select', description: 'Single selection only', icon: '☑' },
  { id: 'signature', label: 'Signature', description: 'Add a \'wet\' signature', icon: '✍' },
  { id: 'materials', label: 'Materials', description: 'Choose project materials', icon: '📦' },
  { id: 'conditional', label: 'Conditional Field', description: 'Add logic to a form', icon: '🔀' },
  { id: 'number', label: 'Number', description: 'Number only input', icon: '#' },
  { id: 'datetime', label: 'Date & Time', description: 'Choose a date from a calendar', icon: '📅' },
  { id: 'multiselect', label: 'Multiselect', description: 'Can select multiple options', icon: '☑☑' },
  { id: 'photos', label: 'Photos', description: 'Upload photos from a device', icon: '📷' },
];

export function FormTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'field' | 'settings'>('field');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [sections, setSections] = useState<FormSection[]>([]);

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTemplate(data);
      setSections(data.template_json?.sections || [{ id: '1', title: 'New Section', fields: [] }]);
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;

    try {
      const { error } = await supabase
        .from('form_templates')
        .update({
          template_json: { sections },
        })
        .eq('id', template.id);

      if (error) throw error;
      alert('Form saved successfully!');
    } catch (error: any) {
      alert('Error saving form: ' + error.message);
    }
  };

  const addField = (type: string) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: 'Field Title',
      required: false,
      options: {},
    };

    const updatedSections = [...sections];
    if (updatedSections.length === 0) {
      updatedSections.push({ id: '1', title: 'New Section', fields: [] });
    }
    updatedSections[0].fields.push(newField);
    setSections(updatedSections);
    setSelectedField(newField);
    setShowAddModal(false);
  };

  const addSection = () => {
    const newSection: FormSection = {
      id: Date.now().toString(),
      title: 'New Section',
      fields: [],
      collapsed: false,
    };
    setSections([...sections, newSection]);
    setShowAddModal(false);
  };

  const toggleSection = (sectionId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
    ));
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
        : s
    ));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const updateFieldLabel = (sectionId: string, fieldId: string, label: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, label } : f) }
        : s
    ));
  };

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
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Form not found</h2>
            <button
              onClick={() => navigate('/settings/templates/forms')}
              className="text-primary-600 hover:text-primary-700"
            >
              Back to forms
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settings/templates/forms')}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-sm text-slate-600 mb-1">
                Library &gt; Forms &gt; {template.template_name}
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{template.template_name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save className="w-4 h-4" />
              Save & Publish
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50">
                <Menu className="w-5 h-5" />
              </button>
              <button className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50">
                <List className="w-5 h-5" />
              </button>
            </div>

            {sections.map((section, sectionIdx) => (
              <div key={section.id} className="mb-4">
                <div className="bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 p-4 border-b border-slate-200">
                    <button onClick={() => toggleSection(section.id)} className="p-1">
                      {section.collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => {
                        const updated = [...sections];
                        updated[sectionIdx].title = e.target.value;
                        setSections(updated);
                      }}
                      className="flex-1 text-lg font-medium bg-transparent border-none focus:outline-none"
                    />
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  {!section.collapsed && (
                    <div className="p-4 space-y-3">
                      {section.fields.map((field) => (
                        <div
                          key={field.id}
                          onClick={() => setSelectedField(field)}
                          className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                            selectedField?.id === field.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <GripVertical className="w-5 h-5 text-slate-400" />
                          <div className="flex-1">
                            <div className="text-xs text-slate-600 mb-1">#{field.type}</div>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateFieldLabel(section.id, field.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full bg-transparent border-none focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteField(section.id, field.id);
                            }}
                            className="p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full py-2 text-sm text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-lg hover:border-slate-300"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-96 bg-white border-l border-slate-200 overflow-y-auto">
          <div className="p-6">
            <div className="flex gap-4 border-b border-slate-200 mb-6">
              <button
                onClick={() => setActiveTab('field')}
                className={`pb-3 font-medium ${
                  activeTab === 'field' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-600'
                }`}
              >
                Field
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 font-medium ${
                  activeTab === 'settings' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-600'
                }`}
              >
                Form Settings
              </button>
            </div>

            {activeTab === 'field' && selectedField && (
              <FieldSettings field={selectedField} />
            )}

            {activeTab === 'settings' && (
              <FormSettings />
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddElementModal
          onClose={() => setShowAddModal(false)}
          onAddField={addField}
          onAddSection={addSection}
        />
      )}
    </div>
  );
}

function FieldSettings({ field }: { field: FormField }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl">#</span>
        <h3 className="text-xl font-semibold capitalize">{field.type}</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Field Title</label>
        <input
          type="text"
          value={field.label}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {field.type === 'number' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Decimal places (optional)
          </label>
          <input
            type="number"
            defaultValue="0"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      )}

      <div>
        <label className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Required (*)</span>
          <input type="checkbox" className="toggle" defaultChecked={field.required} />
        </label>
        <p className="text-xs text-slate-600">
          This entry is required before the job sheet is submitted
        </p>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Advanced</h4>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900">Remember previous entry</div>
              <div className="text-xs text-slate-600">Entry will be remembered and added to new job sheets</div>
            </div>
            <input type="checkbox" className="toggle" />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900">Show in job sheets table</div>
              <div className="text-xs text-slate-600">Entries will appear in their own table column</div>
            </div>
            <input type="checkbox" className="toggle" />
          </label>

          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900">Enable filter for job sheets table</div>
            </div>
            <input type="checkbox" className="toggle" />
          </label>
        </div>
      </div>
    </div>
  );
}

function FormSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-3">
          <span>👥</span>
          <div>
            <div className="font-medium text-slate-900">Member Declaration</div>
            <div className="text-sm text-slate-600">Require members to accept a declaration</div>
          </div>
        </div>
        <span className="text-sm text-slate-500">Off</span>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-3">
          <span>✓</span>
          <div>
            <div className="font-medium text-slate-900">Approvals</div>
            <div className="text-sm text-slate-600">Require job sheets to go through approval process</div>
          </div>
        </div>
        <span className="text-sm text-slate-500">Off</span>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-3">
          <span>⚙</span>
          <div>
            <div className="font-medium text-slate-900">Advanced Options</div>
            <div className="text-sm text-slate-600">Settings for required fields and other additional options</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddElementModal({
  onClose,
  onAddField,
  onAddSection
}: {
  onClose: () => void;
  onAddField: (type: string) => void;
  onAddSection: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Add Form Elements</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <button
            onClick={onAddSection}
            className="p-4 text-left border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">☰</span>
              <div>
                <div className="font-medium text-slate-900 mb-1">New Section</div>
                <div className="text-sm text-slate-600">Organise your forms by section</div>
              </div>
            </div>
          </button>

          {FIELD_TYPES.slice(1).map((fieldType) => (
            <button
              key={fieldType.id}
              onClick={() => onAddField(fieldType.id)}
              className="p-4 text-left border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{fieldType.icon}</span>
                <div>
                  <div className="font-medium text-slate-900 mb-1">{fieldType.label}</div>
                  <div className="text-sm text-slate-600">{fieldType.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
