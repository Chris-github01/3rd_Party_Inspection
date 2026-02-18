import { useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Package,
  Layers,
  FileText,
  Layout as LayoutIcon,
  Building2,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  icon: any;
  path?: string;
  children?: NavItem[];
}

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/',
    },
    {
      label: 'Clients',
      icon: Users,
      path: '/clients',
    },
    {
      label: 'Projects',
      icon: FolderOpen,
      path: '/projects',
    },
    {
      label: 'Settings',
      icon: Settings,
      children: [
        { label: 'Organization', icon: Building2, path: '/settings/organization' },
        { label: 'Members', icon: Layers, path: '/settings/members' },
        { label: 'Materials', icon: Package, path: '/settings/materials' },
        { label: 'Reports', icon: FileText, path: '/settings/reports' },
        { label: 'Templates', icon: LayoutIcon, path: '/settings/templates' },
      ],
    },
  ];

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      setSettingsExpanded(!settingsExpanded);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const canAccessSettings = profile?.role === 'admin' || profile?.role === 'inspector';

  console.log('Layout - profile:', profile, 'canAccessSettings:', canAccessSettings);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static inset-y-0 left-0 z-50 w-64 lg:translate-x-0 bg-primary-900/95 lg:bg-primary-900/50 backdrop-blur-sm border-r border-primary-700/50 transition-transform duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 border-b border-primary-700/50 flex items-center justify-between px-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
              P&R
            </div>
            <span className="ml-3 font-semibold text-white">P&R Consulting</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-primary-700/50 rounded text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {

            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <div key={item.label}>
                <button
                  onClick={() => {
                    handleNavClick(item);
                    if (item.path && !item.children) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? 'bg-primary-600 text-white'
                      : 'text-blue-100 hover:bg-primary-700/50'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="ml-3 flex-1 text-left">{item.label}</span>
                  {item.children && (
                    <span className="ml-auto">
                      {settingsExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  )}
                </button>

                {/* Sub-items */}
                {item.children && settingsExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = isActive(child.path);
                      return (
                        <button
                          key={child.label}
                          onClick={() => {
                            navigate(child.path!);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                            childActive
                              ? 'bg-primary-600 text-white'
                              : 'text-blue-200 hover:bg-primary-700/50'
                          }`}
                        >
                          <ChildIcon className="w-4 h-4" />
                          <span className="ml-3">{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-primary-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.name}</p>
              <p className="text-xs text-blue-200 capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-blue-100 hover:bg-primary-700/50 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="pt-3 border-t border-primary-700/50">
            <p className="text-xs text-blue-200 text-center">
              Prepared by <span className="font-semibold text-accent-400">P&R Consulting Limited</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-primary-900/95 backdrop-blur-sm border-b border-primary-700/50">
          <div className="flex items-center justify-between px-4 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-white hover:bg-primary-700/50 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                P&R
              </div>
              <span className="ml-2 font-semibold text-white">P&R Consulting</span>
            </div>
            <div className="w-10"></div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
