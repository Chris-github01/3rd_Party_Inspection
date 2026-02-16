import { useNavigate } from 'react-router-dom';
import { FileText, FolderOpen, Package, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Templates() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canManageTemplates = profile?.role === 'admin' || profile?.role === 'inspector';

  const sections = [
    {
      icon: FileText,
      title: 'Forms',
      description: 'Create, edit, and manage your custom forms to ensure that your team is capturing the right information.',
      path: '/settings/templates/forms',
      color: 'bg-blue-50 text-blue-600',
      hoverColor: 'hover:bg-blue-100',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
      hasQuickCreate: true,
    },
    {
      icon: FolderOpen,
      title: 'Project Templates',
      description: 'Ensure a streamlined workflow with project templates. Manage forms, materials, approvals and custom attributes.',
      path: '/settings/templates/projects',
      color: 'bg-green-50 text-green-600',
      hoverColor: 'hover:bg-green-100',
      buttonColor: 'bg-green-600 hover:bg-green-700',
      hasQuickCreate: true,
    },
    {
      icon: Package,
      title: 'Materials',
      description: 'Build and manage your material library and utilise rates to help generate accurate costs across all your projects.',
      path: '/settings/materials',
      color: 'bg-orange-50 text-orange-600',
      hoverColor: 'hover:bg-orange-100',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
      hasQuickCreate: false,
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl shadow-xl p-8">
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-white">Library</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">Library</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.title}
                  className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/10 p-6 hover:shadow-lg transition-all duration-200 hover:border-white/20 flex flex-col"
                >
                  <button
                    onClick={() => navigate(section.path)}
                    className="text-left flex-1"
                  >
                    <div className={`w-12 h-12 rounded-lg ${section.color} flex items-center justify-center mb-4 transition-colors ${section.hoverColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {section.title}
                    </h3>
                    <p className="text-sm text-blue-100 leading-relaxed mb-4">
                      {section.description}
                    </p>
                  </button>

                  {section.hasQuickCreate && canManageTemplates && (
                    <button
                      onClick={() => navigate(section.path)}
                      className={`flex items-center justify-center px-4 py-2 ${section.buttonColor} text-white rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg mt-4`}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Quick Create
                    </button>
                  )}

                  {!canManageTemplates && (
                    <button
                      onClick={() => navigate(section.path)}
                      className="flex items-center justify-center px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 font-medium text-sm mt-4"
                    >
                      View {section.title}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
