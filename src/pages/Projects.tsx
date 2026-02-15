import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, FolderOpen, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ProjectWizard } from '../components/ProjectWizard';

interface Project {
  id: string;
  name: string;
  client_name: string;
  site_address: string;
  project_ref: string;
  start_date: string;
  created_at: string;
  clients?: {
    client_name: string;
  };
}

export function Projects() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadProjects();
    if (searchParams.get('new') === 'true') {
      navigate('/?showCreate=true');
    }
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(client_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  console.log('Projects page - profile:', profile);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
              <p className="text-slate-600 mt-1">View and manage inspection projects</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center bg-slate-50">
              <FolderOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No projects yet</h3>
              <p className="text-slate-600 mb-6">Create your first inspection project</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="bg-slate-50 rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{project.name}</h3>
                      <p className="text-sm text-slate-600">
                        {project.clients?.client_name || project.client_name}
                      </p>
                    </div>
                    <FolderOpen className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="space-y-2">
                    {project.site_address && (
                      <p className="text-sm text-slate-600 truncate">{project.site_address}</p>
                    )}
                    {project.project_ref && (
                      <p className="text-xs text-slate-500">Ref: {project.project_ref}</p>
                    )}
                    {project.start_date && (
                      <div className="flex items-center text-xs text-slate-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(project.start_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <ProjectWizard
          onClose={() => {
            setShowCreateModal(false);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}
