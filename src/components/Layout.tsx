import { useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, FolderOpen, Settings, LogOut, Menu, X, ChevronDown, ChevronRight, Package, Layers, FileText, LayoutGrid as LayoutIcon, Building2, ClipboardList, Image, Zap, TrendingUp, Kanban, FileCheck, Megaphone, ScanSearch } from 'lucide-react';

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
  const [growthExpanded, setGrowthExpanded] = useState(false);

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/app',
    },
    {
      label: 'Clients',
      icon: Users,
      path: '/app/clients',
    },
    {
      label: 'Projects',
      icon: FolderOpen,
      path: '/app/projects',
    },
    {
      label: 'Inspection AI',
      icon: Zap,
      path: '/app/inspection-ai',
    },
    {
      label: 'Growth Hub',
      icon: TrendingUp,
      children: [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/app/growth/dashboard' },
        { label: 'Leads', icon: Kanban, path: '/app/growth/leads' },
        { label: 'Quotes', icon: FileCheck, path: '/app/growth/quotes' },
        { label: 'Campaigns', icon: Megaphone, path: '/app/growth/campaigns' },
      ],
    },
    {
      label: 'Settings',
      icon: Settings,
      children: [
        { label: 'Organizations', icon: Building2, path: '/settings/organizations' },
        { label: 'Members', icon: Layers, path: '/settings/members' },
        { label: 'Materials', icon: Package, path: '/settings/materials' },
        { label: 'Reports', icon: FileText, path: '/settings/reports' },
        { label: 'Templates', icon: LayoutIcon, path: '/settings/templates' },
        { label: 'Onboarding', icon: ClipboardList, path: '/settings/onboarding' },
        { label: 'Client Logos', icon: Image, path: '/settings/client-logos' },
        { label: 'AI Telemetry', icon: Zap, path: '/settings/inspection-ai-telemetry' },
        { label: 'Classification Analytics', icon: ScanSearch, path: '/settings/classification-analytics' },
      ],
    },
  ];

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const isGroupActive = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some(c => c.path && location.pathname.startsWith(c.path));
  };

  const handleNavClick = (item: NavItem) => {
    if (item.children) {
      if (item.label === 'Settings') setSettingsExpanded(!settingsExpanded);
      else if (item.label === 'Growth Hub') setGrowthExpanded(!growthExpanded);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const isExpanded = (item: NavItem) => {
    if (item.label === 'Settings') return settingsExpanded;
    if (item.label === 'Growth Hub') return growthExpanded;
    return false;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const canAccessSettings = profile?.role === 'admin' || profile?.role === 'inspector';

  console.log('Layout - profile:', profile, 'canAccessSettings:', canAccessSettings);

  return (
    <div className="min-h-screen bg-[#0B0F14] flex">
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
        } fixed lg:static inset-y-0 left-0 z-50 w-64 lg:translate-x-0 bg-[#0B0F14]/95 lg:bg-[#0B0F14]/50 backdrop-blur-sm border-r border-slate-800 transition-transform duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-[#C8102E] to-[#A60E25] rounded-lg flex items-center justify-center text-white font-bold">
              P&R
            </div>
            <span className="ml-3 font-semibold text-white">P&R Consulting</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-slate-800 rounded text-white lg:hidden"
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
                    active || isGroupActive(item)
                      ? 'bg-[#C8102E] text-white'
                      : 'text-[#D1D5DB] hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="ml-3 flex-1 text-left">{item.label}</span>
                  {item.children && (
                    <span className="ml-auto">
                      {isExpanded(item) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  )}
                </button>

                {/* Sub-items */}
                {item.children && isExpanded(item) && (
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
                              ? 'bg-[#C8102E] text-white'
                              : 'text-[#D1D5DB] hover:bg-slate-800'
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
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.name}</p>
              <p className="text-xs text-[#D1D5DB] capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-[#D1D5DB] hover:bg-slate-800 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="pt-3 border-t border-slate-800">
            <p className="text-xs text-[#D1D5DB] text-center">
              Prepared by <span className="font-semibold text-[#C8102E]">P&R Consulting Limited</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#0B0F14]/95 backdrop-blur-sm border-b border-slate-800">
          <div className="flex items-center justify-between px-4 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-white hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-[#C8102E] to-[#A60E25] rounded-lg flex items-center justify-center text-white font-bold">
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
