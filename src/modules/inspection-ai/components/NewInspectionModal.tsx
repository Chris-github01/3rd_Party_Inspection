import { useState, useEffect } from 'react';
import { X, Plus, Building2, MapPin, User, ChevronRight, FolderOpen, Loader2, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { InspectionAIProject } from '../types';
import { fetchOrgProjects, createInspectionProject } from '../services/workflowService';

interface Props {
  onClose: () => void;
  onStart: (params: {
    project: InspectionAIProject;
    inspectorName: string;
    useDrawings: boolean;
  }) => void;
}

type Step = 'select_project' | 'new_project' | 'inspector' | 'drawing_choice';

export function NewInspectionModal({ onClose, onStart }: Props) {
  const [step, setStep] = useState<Step>('select_project');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<InspectionAIProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<InspectionAIProject | null>(null);
  const [query, setQuery] = useState('');
  const [inspectorName, setInspectorName] = useState(() => localStorage.getItem('inspection_ai_inspector_name') ?? '');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [newProjectName, setNewProjectName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newSiteLocation, setNewSiteLocation] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: ou } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (ou?.organization_id) {
        setOrgId(ou.organization_id);
        const list = await fetchOrgProjects(ou.organization_id);
        setProjects(list);
      }
    }
    init();
  }, []);

  const filteredProjects = projects.filter(p =>
    `${p.project_name} ${p.client_name} ${p.site_location}`.toLowerCase().includes(query.toLowerCase())
  );

  async function handleCreateProject() {
    if (!newProjectName.trim() || !orgId || !userId) return;
    setLoading(true);
    try {
      const p = await createInspectionProject({
        organization_id: orgId,
        project_name: newProjectName.trim(),
        client_name: newClientName.trim(),
        site_location: newSiteLocation.trim(),
        user_id: userId,
      });
      setSelectedProject(p);
      setProjects(prev => [p, ...prev]);
      setStep('inspector');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectProject(p: InspectionAIProject) {
    setSelectedProject(p);
    setStep('inspector');
  }

  function handleInspectorNext() {
    if (!inspectorName.trim()) return;
    localStorage.setItem('inspection_ai_inspector_name', inspectorName.trim());
    setStep('drawing_choice');
  }

  function handleStart(useDrawings: boolean) {
    if (!selectedProject) return;
    onStart({ project: selectedProject, inspectorName: inspectorName.trim(), useDrawings });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">

        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New Inspection</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === 'select_project' && 'Select or create a project'}
              {step === 'new_project' && 'Create new project'}
              {step === 'inspector' && 'Inspector details'}
              {step === 'drawing_choice' && 'Drawing setup'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {step === 'select_project' && (
            <div className="px-5 py-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search projects…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <button
                onClick={() => setStep('new_project')}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors text-sm font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create New Project
              </button>

              {filteredProjects.length === 0 && (
                <div className="py-8 text-center">
                  <FolderOpen className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No projects found</p>
                </div>
              )}

              <div className="space-y-2">
                {filteredProjects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProject(p)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-slate-400 bg-white text-left transition-colors group"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors">
                      <Building2 className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{p.project_name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.client_name} · {p.site_location}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'new_project' && (
            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Name *</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. Tower A Passive Fire Inspection"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Client / Developer</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  placeholder="e.g. Naylor Love Construction"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Site Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={newSiteLocation}
                    onChange={e => setNewSiteLocation(e.target.value)}
                    placeholder="e.g. 123 Victoria Street, Auckland"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'inspector' && (
            <div className="px-5 py-4 space-y-4">
              {selectedProject && (
                <div className="bg-slate-50 rounded-2xl p-3.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Project</p>
                  <p className="text-sm font-bold text-slate-900">{selectedProject.project_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedProject.client_name} · {selectedProject.site_location}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Inspector Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={e => setInspectorName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInspectorNext()}
                    placeholder="Your full name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'drawing_choice' && selectedProject && (
            <div className="px-5 py-4 space-y-3">
              <div className="bg-slate-50 rounded-2xl p-3.5 mb-2">
                <p className="text-xs text-slate-500">Inspector: <span className="font-bold text-slate-800">{inspectorName}</span></p>
                <p className="text-xs text-slate-500 mt-0.5">Project: <span className="font-bold text-slate-800">{selectedProject.project_name}</span></p>
              </div>
              <p className="text-sm font-bold text-slate-900">Will you be working with drawings?</p>
              <p className="text-xs text-slate-400">If you have floor plans or fire drawings, pins will be placed on them before each finding is captured.</p>

              <button
                onClick={() => handleStart(true)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white text-left hover:bg-slate-800 transition-colors"
              >
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">With Drawings</p>
                  <p className="text-xs text-white/60">Pin location on drawing before each finding</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto text-white/50 flex-shrink-0" />
              </button>

              <button
                onClick={() => handleStart(false)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 text-left hover:border-slate-400 transition-colors"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-bold text-sm">Without Drawings</p>
                  <p className="text-xs text-slate-400">Use text-based location fields only</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto text-slate-300 flex-shrink-0" />
              </button>
            </div>
          )}
        </div>

        <div className="px-5 pb-safe flex-shrink-0 border-t border-slate-100 pt-4"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {step === 'new_project' && (
            <div className="flex gap-3">
              <button onClick={() => setStep('select_project')} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition-colors">
                Back
              </button>
              <button
                onClick={handleCreateProject}
                disabled={loading || !newProjectName.trim()}
                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Project
              </button>
            </div>
          )}

          {step === 'inspector' && (
            <div className="flex gap-3">
              <button onClick={() => setStep('select_project')} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition-colors">
                Back
              </button>
              <button
                onClick={handleInspectorNext}
                disabled={!inspectorName.trim()}
                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
