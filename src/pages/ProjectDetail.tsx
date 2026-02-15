import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, FileText, Users, ClipboardCheck, AlertTriangle, Download, Paperclip, Map, Smartphone, FileCheck, BookOpen } from 'lucide-react';
import { DocumentsTab } from '../components/DocumentsTab';
import { MembersTab } from '../components/MembersTab';
import { InspectionsTab } from '../components/InspectionsTab';
import { NCRsTab } from '../components/NCRsTab';
import { ExportsTab } from '../components/ExportsTab';
import { ExportAttachmentsTab } from '../components/ExportAttachmentsTab';
import { SiteManagerTab } from '../components/SiteManagerTab';
import { ExecutiveSummaryPreview } from '../components/ExecutiveSummaryPreview';
import { IntroductionPreview } from '../components/IntroductionPreview';

interface Project {
  id: string;
  name: string;
  client_name: string;
  main_contractor: string;
  site_address: string;
  project_ref: string;
  start_date: string;
  notes: string;
}

type TabType = 'documents' | 'members' | 'inspections' | 'ncrs' | 'attachments' | 'exports' | 'site-manager' | 'executive-summary' | 'introduction';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('documents');

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white/10 backdrop-blur-sm flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white/10 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Project not found</h2>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'documents' as TabType, label: 'Documents', icon: FileText },
    { id: 'site-manager' as TabType, label: 'Site Manager', icon: Map },
    { id: 'members' as TabType, label: 'Member Register', icon: Users },
    { id: 'inspections' as TabType, label: 'Inspections', icon: ClipboardCheck },
    { id: 'ncrs' as TabType, label: 'NCRs', icon: AlertTriangle },
    { id: 'attachments' as TabType, label: 'Export Attachments', icon: Paperclip },
    { id: 'introduction' as TabType, label: 'Introduction', icon: BookOpen },
    { id: 'executive-summary' as TabType, label: 'Executive Summary', icon: FileCheck },
    { id: 'exports' as TabType, label: 'Exports', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-white/10 backdrop-blur-sm">
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-blue-100 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </button>

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-white">{project.name}</h1>
              <button
                onClick={() => navigate(`/projects/${project.id}/site`)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Smartphone className="w-5 h-5" />
                <span className="font-medium">Site Mode</span>
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-blue-100">
              <span>Client: {project.client_name}</span>
              {project.main_contractor && <span>Contractor: {project.main_contractor}</span>}
              {project.project_ref && <span>Ref: {project.project_ref}</span>}
            </div>
          </div>

          <div className="flex space-x-1 border-b border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-300'
                      : 'border-transparent text-blue-100 hover:text-white hover:border-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeTab === 'site-manager' ? (
        <div className="h-[calc(100vh-240px)]">
          <SiteManagerTab projectId={project.id} />
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
            {activeTab === 'documents' && <DocumentsTab projectId={project.id} />}
            {activeTab === 'members' && <MembersTab projectId={project.id} />}
            {activeTab === 'inspections' && <InspectionsTab projectId={project.id} />}
            {activeTab === 'ncrs' && <NCRsTab projectId={project.id} />}
            {activeTab === 'attachments' && <ExportAttachmentsTab projectId={project.id} />}
            {activeTab === 'introduction' && <IntroductionPreview projectId={project.id} />}
            {activeTab === 'executive-summary' && <ExecutiveSummaryPreview projectId={project.id} />}
            {activeTab === 'exports' && <ExportsTab project={project} />}
          </div>
        </div>
      )}
    </div>
  );
}
