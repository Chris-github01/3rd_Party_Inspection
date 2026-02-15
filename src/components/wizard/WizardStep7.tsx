import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { WizardData } from '../ProjectWizard';

interface WizardStep7Props {
  data: WizardData;
  onComplete: () => void;
}

export function WizardStep7({ data, onComplete }: WizardStep7Props) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreateProject = async () => {
    setCreating(true);
    setError('');

    try {
      const fullAddress = [
        data.addressLine,
        data.suburb,
        data.city,
        data.postcode,
        data.country,
      ]
        .filter(Boolean)
        .join(', ');

      const projectData: any = {
        name: data.projectName,
        package: data.package || null,
        project_image_path: data.projectImagePath || null,
        site_type: 'single_site',
        client_id: data.clientId,
        client_name: data.clientName,
        drawing_mode: data.drawingMode,
        country: data.country,
        address_line: data.addressLine,
        suburb: data.suburb,
        city: data.city,
        postcode: data.postcode,
        site_address: fullAddress,
        latitude: data.latitude,
        longitude: data.longitude,
        what3words: data.what3words || null,
        setup_mode: data.setupMode,
        source_project_id: data.sourceProjectId || null,
        cloned_elements_json: {
          elements: data.clonedElements,
          timestamp: new Date().toISOString(),
        },
        created_by_user_id: profile?.id || null,
      };

      if (data.setupMode === 'template' || data.setupMode === 'hybrid') {
        projectData.intumescent_template_id = data.templateId;
      }

      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (projectError) throw projectError;

      if (data.setupMode === 'duplicate' && data.sourceProjectId) {
        await cloneProjectData(data.sourceProjectId, newProject.id, data.clonedElements);
      } else if (data.setupMode === 'hybrid' && data.sourceProjectId) {
        await importProjectSettings(data.sourceProjectId, newProject.id, data.clonedElements);
      }

      onComplete();
      navigate(`/projects/${newProject.id}`);
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(`Failed to create project: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const cloneProjectData = async (
    sourceId: string,
    targetId: string,
    elements: string[]
  ) => {
    try {
      if (elements.includes('members')) {
        const { data: members } = await supabase
          .from('members')
          .select('*')
          .eq('project_id', sourceId);

        if (members && members.length > 0) {
          const newMembers = members.map(({ id, created_at, ...member }) => ({
            ...member,
            project_id: targetId,
          }));

          await supabase.from('members').insert(newMembers);
        }
      }

      if (elements.includes('report_profile')) {
        const { data: sourceProject } = await supabase
          .from('projects')
          .select('default_report_profile_id')
          .eq('id', sourceId)
          .single();

        if (sourceProject?.default_report_profile_id) {
          await supabase
            .from('projects')
            .update({ default_report_profile_id: sourceProject.default_report_profile_id })
            .eq('id', targetId);
        }
      }

    } catch (err) {
      console.error('Error cloning project data:', err);
    }
  };

  const importProjectSettings = async (
    sourceId: string,
    targetId: string,
    settings: string[]
  ) => {
    try {
      if (settings.includes('report_profile')) {
        const { data: sourceProject } = await supabase
          .from('projects')
          .select('default_report_profile_id')
          .eq('id', sourceId)
          .single();

        if (sourceProject?.default_report_profile_id) {
          await supabase
            .from('projects')
            .update({ default_report_profile_id: sourceProject.default_report_profile_id })
            .eq('id', targetId);
        }
      }

    } catch (err) {
      console.error('Error importing project settings:', err);
    }
  };

  const getSetupModeLabel = () => {
    switch (data.setupMode) {
      case 'template':
        return 'From Template';
      case 'duplicate':
        return 'Duplicated Project';
      case 'hybrid':
        return 'Template + Imported Settings';
      default:
        return data.setupMode;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Summary
        </h3>
        <p className="text-slate-300">
          Review your project details before creating
        </p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Created By</p>
            <p className="text-white">{profile?.name || 'Current User'}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300">Site Type</p>
            <p className="text-white">{data.siteType}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300">Project Name</p>
            <p className="text-white font-semibold">{data.projectName}</p>
          </div>

          {data.package && (
            <div>
              <p className="text-sm font-medium text-slate-300">Package</p>
              <p className="text-white">{data.package}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-slate-300">Client</p>
            <p className="text-white">{data.clientName}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300">Setup Mode</p>
            <p className="text-white">{getSetupModeLabel()}</p>
          </div>

          {data.setupMode === 'template' || data.setupMode === 'hybrid' ? (
            <div>
              <p className="text-sm font-medium text-slate-300">Template</p>
              <p className="text-white">{data.templateName}</p>
            </div>
          ) : null}

          {data.setupMode === 'duplicate' || data.setupMode === 'hybrid' ? (
            <div>
              <p className="text-sm font-medium text-slate-300">
                {data.setupMode === 'duplicate' ? 'Source Project' : 'Reference Project'}
              </p>
              <p className="text-white">{data.sourceProjectName}</p>
            </div>
          ) : null}

          <div>
            <p className="text-sm font-medium text-slate-300">Drawing Mode</p>
            <p className="text-white">
              {data.drawingMode === 'with_drawings' ? 'With Drawings' : 'Without Drawings'}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <p className="text-sm font-medium text-slate-300 mb-2">Address</p>
          <p className="text-white">
            {[data.addressLine, data.suburb, data.city, data.postcode, data.country]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>

        {data.latitude && data.longitude && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Coordinates</p>
            <p className="text-white font-mono text-sm">
              {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
            </p>
          </div>
        )}

        {data.what3words && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">what3words</p>
            <p className="text-white font-mono text-sm">{data.what3words}</p>
          </div>
        )}

        {data.clonedElements.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">
              {data.setupMode === 'duplicate' ? 'Cloned Elements' : 'Imported Settings'}
            </p>
            <div className="flex flex-wrap gap-2">
              {data.clonedElements.map((element) => (
                <span
                  key={element}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary-900/30 text-primary-300 rounded text-xs font-medium"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {element.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleCreateProject}
          disabled={creating}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {creating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Project...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Create Project
            </>
          )}
        </button>
      </div>
    </div>
  );
}
