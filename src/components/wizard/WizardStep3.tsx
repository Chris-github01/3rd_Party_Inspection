import { useState, useEffect } from 'react';
import { FileText, Copy, Blend, Search, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { WizardData } from '../ProjectWizard';
import { format } from 'date-fns';

interface Template {
  id: string;
  template_name: string;
  applies_to: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  client_name: string;
  created_at: string;
  drawing_mode: string;
}

interface WizardStep3Props {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

const CLONE_OPTIONS = [
  { id: 'members', label: 'Members', default: true },
  { id: 'materials', label: 'Material library links', default: true },
  { id: 'templates', label: 'Inspection templates', default: true },
  { id: 'report_profile', label: 'Report profile', default: true },
  { id: 'export_attachments', label: 'Export attachments', default: false },
  { id: 'drawing_mode', label: 'Drawing mode', default: true },
  { id: 'locations', label: 'Locations', default: true },
  { id: 'inspections', label: 'Inspections', default: false },
  { id: 'ncrs', label: 'NCRs', default: false },
];

const IMPORT_OPTIONS = [
  { id: 'materials', label: 'Material selections' },
  { id: 'report_profile', label: 'Default report profile' },
  { id: 'custom_fields', label: 'Custom form fields' },
  { id: 'environmental_limits', label: 'Environmental limits' },
  { id: 'inspection_customizations', label: 'Inspection checklist customizations' },
];

export function WizardStep3({ data, updateData }: WizardStep3Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (data.setupMode === 'template') {
      updateData({ sourceProjectId: '', clonedElements: [] });
    } else if (data.setupMode === 'duplicate') {
      updateData({ templateId: '', templateName: '' });
    }
  }, [data.setupMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesResult, projectsResult] = await Promise.all([
        supabase.from('form_templates').select('*').order('template_name'),
        supabase.from('projects').select('id, name, client_name, created_at, drawing_mode').order('created_at', { ascending: false }),
      ]);

      if (templatesResult.data) setTemplates(templatesResult.data);
      if (projectsResult.data) setProjects(projectsResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloneOptionToggle = (optionId: string) => {
    const current = data.clonedElements || [];
    const updated = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];
    updateData({ clonedElements: updated });
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12 text-slate-300">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Project Setup Mode
        </h3>
        <p className="text-slate-300">
          Choose how you want to set up your new project
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => updateData({ setupMode: 'template' })}
          className={`p-6 border-2 rounded-lg text-left transition-all ${
            data.setupMode === 'template'
              ? 'border-primary-600 bg-primary-900/30'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <FileText className={`w-8 h-8 mb-3 ${data.setupMode === 'template' ? 'text-primary-400' : 'text-slate-400'}`} />
          <h4 className="font-semibold text-white mb-2">Start From Template</h4>
          <p className="text-sm text-slate-300">Create from a library template</p>
        </button>

        <button
          onClick={() => updateData({ setupMode: 'duplicate' })}
          className={`p-6 border-2 rounded-lg text-left transition-all ${
            data.setupMode === 'duplicate'
              ? 'border-primary-600 bg-primary-900/30'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <Copy className={`w-8 h-8 mb-3 ${data.setupMode === 'duplicate' ? 'text-primary-400' : 'text-slate-400'}`} />
          <h4 className="font-semibold text-white mb-2">Duplicate Project</h4>
          <p className="text-sm text-slate-300">Clone existing project structure</p>
        </button>

        <button
          onClick={() => updateData({ setupMode: 'hybrid' })}
          className={`p-6 border-2 rounded-lg text-left transition-all ${
            data.setupMode === 'hybrid'
              ? 'border-primary-600 bg-primary-900/30'
              : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <Blend className={`w-8 h-8 mb-3 ${data.setupMode === 'hybrid' ? 'text-primary-400' : 'text-slate-400'}`} />
          <h4 className="font-semibold text-white mb-2">Hybrid</h4>
          <p className="text-sm text-slate-300">Template + import settings</p>
        </button>
      </div>

      {data.setupMode === 'template' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-300">
              All Templates ({templates.length})
            </h4>
            <button className="text-sm text-primary-400 hover:underline flex items-center gap-1">
              <Settings className="w-4 h-4" />
              Need to add a new template?
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() =>
                  updateData({
                    templateId: template.id,
                    templateName: template.template_name,
                  })
                }
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  data.templateId === template.id
                    ? 'border-primary-600 bg-primary-900/30'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <h5 className="font-semibold text-white mb-1">
                  {template.template_name}
                </h5>
                <p className="text-sm text-slate-300 mb-2">
                  {template.applies_to}
                </p>
                <p className="text-xs text-slate-400">
                  Updated {format(new Date(template.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.setupMode === 'duplicate' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search existing projects"
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
            />
          </div>

          <div className="border border-slate-700 rounded-lg divide-y divide-slate-700 max-h-64 overflow-y-auto">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() =>
                  updateData({
                    sourceProjectId: project.id,
                    sourceProjectName: project.name,
                    clonedElements: CLONE_OPTIONS.filter((opt) => opt.default).map((opt) => opt.id),
                  })
                }
                className={`p-4 cursor-pointer hover:bg-slate-700 ${
                  data.sourceProjectId === project.id ? 'bg-primary-900/30 border-l-4 border-primary-600' : ''
                }`}
              >
                <h5 className="font-semibold text-white">{project.name}</h5>
                <p className="text-sm text-slate-300 mt-1">
                  Client: {project.client_name}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Created {format(new Date(project.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>

          {data.sourceProjectId && (
            <div className="border border-slate-700 rounded-lg p-4 bg-slate-800">
              <h5 className="font-semibold text-white mb-3">Clone Options</h5>
              <div className="space-y-2">
                {CLONE_OPTIONS.map((option) => (
                  <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.clonedElements.includes(option.id)}
                      onChange={() => handleCloneOptionToggle(option.id)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-300">{option.label}</span>
                  </label>
                ))}
              </div>
              {data.clonedElements.length === 0 && (
                <p className="text-sm text-red-400 mt-3">
                  At least one option must be selected
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {data.setupMode === 'hybrid' && (
        <div className="space-y-6">
          <div>
            <h5 className="font-semibold text-white mb-3">1. Select Template</h5>
            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() =>
                    updateData({
                      templateId: template.id,
                      templateName: template.template_name,
                    })
                  }
                  className={`p-3 border-2 rounded-lg cursor-pointer text-sm ${
                    data.templateId === template.id
                      ? 'border-primary-600 bg-primary-900/30'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <h6 className="font-semibold text-white">{template.template_name}</h6>
                  <p className="text-xs text-slate-300">{template.applies_to}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="font-semibold text-white mb-3">2. Select Reference Project</h5>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects"
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-slate-400"
              />
            </div>
            <div className="border border-slate-700 rounded-lg divide-y divide-slate-700 max-h-48 overflow-y-auto">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() =>
                    updateData({
                      sourceProjectId: project.id,
                      sourceProjectName: project.name,
                      clonedElements: IMPORT_OPTIONS.map((opt) => opt.id),
                    })
                  }
                  className={`p-3 cursor-pointer hover:bg-slate-700 text-sm ${
                    data.sourceProjectId === project.id ? 'bg-primary-900/30 border-l-4 border-primary-600' : ''
                  }`}
                >
                  <h6 className="font-semibold text-white">{project.name}</h6>
                  <p className="text-xs text-slate-300">{project.client_name}</p>
                </div>
              ))}
            </div>
          </div>

          {data.sourceProjectId && (
            <div className="border border-slate-700 rounded-lg p-4 bg-slate-800">
              <h5 className="font-semibold text-white mb-3">3. Import Settings</h5>
              <div className="space-y-2">
                {IMPORT_OPTIONS.map((option) => (
                  <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.clonedElements.includes(option.id)}
                      onChange={() => handleCloneOptionToggle(option.id)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-300">{option.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                This will NOT clone: Members, Inspections, NCRs, or Attachments
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
