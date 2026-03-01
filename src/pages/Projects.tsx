import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, FolderOpen, Calendar, X } from 'lucide-react';
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
    name: string;
  };
}

export function Projects() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clientName, setClientName] = useState<string>('');
  const clientId = searchParams.get('client');

  useEffect(() => {
    loadProjects();
    // Open create modal if 'new' param is present
    if (searchParams.get('new') === 'true') {
      setShowCreateModal(true);
      // Clean up URL parameter
      navigate('/projects', { replace: true });
    }
  }, [searchParams, navigate]);

  const loadProjects = async () => {
    try {
      let query = supabase
        .from('projects')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      // Filter by client if clientId is provided
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects(data || []);

      // Get client name if filtering by client
      if (clientId && data && data.length > 0) {
        setClientName(data[0].clients?.name || '');
      } else if (clientId) {
        // Fetch client name even if no projects
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', clientId)
          .single();
        setClientName(clientData?.name || '');
      }
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
        <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Projects</h1>
              <p className="text-blue-100 mt-1">View and manage inspection projects</p>
              {clientId && clientName && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-600/20 text-primary-300 border border-primary-600/30">
                    Filtered by: {clientName}
                  </span>
                  <button
                    onClick={() => navigate('/projects')}
                    className="inline-flex items-center px-2 py-1 text-sm text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear Filter
                  </button>
                </div>
              )}
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
            <div className="rounded-lg border-2 border-dashed border-white/10 p-12 text-center bg-white/10 backdrop-blur-sm">
              <FolderOpen className="w-16 h-16 text-blue-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
              <p className="text-blue-100 mb-6">Create your first inspection project</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{project.name}</h3>
                      <p className="text-sm text-blue-100">
                        {project.clients?.name || project.client_name}
                      </p>
                    </div>
                    <FolderOpen className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="space-y-2">
                    {project.site_address && (
                      <p className="text-sm text-blue-100 truncate">{project.site_address}</p>
                    )}
                    {project.project_ref && (
                      <p className="text-xs text-blue-200">Ref: {project.project_ref}</p>
                    )}
                    {project.start_date && (
                      <div className="flex items-center text-xs text-blue-200">
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
