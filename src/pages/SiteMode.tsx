import { useState, useEffect } from 'react';
import { useParams, useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Menu,
  X,
  MapPin,
  Camera,
  FileText,
  Download,
  Layout as LayoutIcon,
  Package,
  ChevronLeft,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  client_name: string;
  site_address: string;
}

export function SiteMode() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('drawings');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentLevel, setCurrentLevel] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadProject();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (error) {
      console.error('Error loading project:', error);
      return;
    }

    setProject(data);
  };

  const handleExitSiteMode = () => {
    navigate(`/projects/${projectId}`);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`/projects/${projectId}/site/${tab === 'drawings' ? '' : tab}`);
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-white/10 backdrop-blur-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-100">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white/5 backdrop-blur-sm">
      <header className="sticky top-0 z-50 bg-white/5 backdrop-blur-sm border-b border-white/10 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          <div className="flex-1 text-center px-4">
            <h1 className="text-sm font-semibold text-white truncate">{project.name}</h1>
            {currentLevel && (
              <p className="text-xs text-blue-200 truncate">{currentLevel}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center" title={isOnline ? 'Online' : 'Offline'}>
              {isSyncing ? (
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              ) : isOnline ? (
                <Cloud className="w-5 h-5 text-green-300" />
              ) : (
                <CloudOff className="w-5 h-5 text-blue-300" />
              )}
            </div>
            <button
              onClick={() => navigate(`/projects/${projectId}/site/pins/new`)}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
              aria-label="Add pin"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet context={{ project, currentLevel, setCurrentLevel }} />
      </main>

      <nav className="sticky bottom-0 z-50 bg-white/5 backdrop-blur-sm border-t border-white/10 shadow-lg">
        <div className="flex items-center justify-around h-16">
          <NavButton
            icon={LayoutIcon}
            label="Drawings"
            active={activeTab === 'drawings'}
            onClick={() => handleTabChange('drawings')}
          />
          <NavButton
            icon={MapPin}
            label="Pins"
            active={activeTab === 'pins'}
            onClick={() => handleTabChange('pins')}
          />
          <NavButton
            icon={Package}
            label="Inspect"
            active={activeTab === 'inspect'}
            onClick={() => handleTabChange('inspect')}
          />
          <NavButton
            icon={Camera}
            label="Photos"
            active={activeTab === 'photos'}
            onClick={() => handleTabChange('photos')}
          />
          <NavButton
            icon={Download}
            label="Export"
            active={activeTab === 'export'}
            onClick={() => handleTabChange('export')}
          />
        </div>
      </nav>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white/5 backdrop-blur-sm shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/5 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-blue-100" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <h3 className="font-medium text-white mb-2">{project.name}</h3>
                <p className="text-sm text-blue-100">{project.client_name}</p>
                {project.site_address && (
                  <p className="text-xs text-blue-200 mt-1">{project.site_address}</p>
                )}
              </div>

              <nav className="space-y-1">
                <DrawerLink
                  icon={Package}
                  label="Inspection Packages"
                  onClick={() => {
                    navigate(`/projects/${projectId}/site/packages`);
                    setDrawerOpen(false);
                  }}
                />
                <DrawerLink
                  icon={FileText}
                  label="Documents"
                  onClick={() => {
                    navigate(`/projects/${projectId}/site/documents`);
                    setDrawerOpen(false);
                  }}
                />
              </nav>

              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={handleExitSiteMode}
                  className="flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg hover:bg-white/5 transition-colors text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">Exit Site Mode</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center space-y-1 px-3 py-2 min-h-[44px] transition-colors ${
        active ? 'text-primary-300' : 'text-blue-100 hover:text-white'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function DrawerLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-3 px-3 py-2 w-full text-left rounded-lg hover:bg-white/5 transition-colors text-white"
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
