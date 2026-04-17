import { useState, useEffect } from 'react';
import {
  X, Plus, Building2, MapPin, User, ChevronRight, FolderOpen,
  Loader2, Search, AlertCircle, CheckCircle, RefreshCw,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { InspectionAIProject } from '../types';
import { fetchOrgProjects, createInspectionProject } from '../services/workflowService';

function formatSupabaseError(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const parts: string[] = [];
    if (e.message && typeof e.message === 'string') parts.push(e.message);
    if (e.details && typeof e.details === 'string') parts.push(`Details: ${e.details}`);
    if (e.hint && typeof e.hint === 'string') parts.push(`Hint: ${e.hint}`);
    if (e.code && typeof e.code === 'string') parts.push(`Code: ${e.code}`);
    if (parts.length > 0) return parts.join(' — ');
    try { return JSON.stringify(error, null, 2); } catch { return 'Unserializable error object'; }
  }
  return String(error);
}

interface OrgMembership {
  organization_id: string;
  role: string;
  org_name: string;
  org_slug: string | null;
}

interface Props {
  onClose: () => void;
  onStart: (params: {
    project: InspectionAIProject;
    inspectorName: string;
    useDrawings: boolean;
  }) => void;
}

type Step = 'select_project' | 'new_project' | 'inspector' | 'drawing_choice';
type InitState = 'loading' | 'select_org' | 'ready' | 'no_org' | 'error';

export function NewInspectionModal({ onClose, onStart }: Props) {
  const [step, setStep] = useState<Step>('select_project');
  const [initState, setInitState] = useState<InitState>('loading');
  const [initError, setInitError] = useState('');
  const [loading, setLoading] = useState(false);

  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  const [projects, setProjects] = useState<InspectionAIProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<InspectionAIProject | null>(null);
  const [query, setQuery] = useState('');
  const [inspectorName, setInspectorName] = useState(() => localStorage.getItem('inspection_ai_inspector_name') ?? '');

  const [newProjectName, setNewProjectName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newSiteLocation, setNewSiteLocation] = useState('');
  const [projectNameError, setProjectNameError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [inspectorError, setInspectorError] = useState('');

  async function loadMemberships() {
    setInitState('loading');
    setInitError('');
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) {
        setInitState('error');
        setInitError('Not authenticated. Please log in again.');
        return;
      }
      setUserId(user.id);
      console.debug('[NewInspectionModal] auth user id:', user.id);

      const { data: orgs, error: rpcErr } = await supabase.rpc('get_my_org_memberships');
      console.debug('[NewInspectionModal] get_my_org_memberships response:', { orgs, rpcErr });

      if (rpcErr) {
        setInitState('error');
        setInitError(`Failed to load organisations: ${formatSupabaseError(rpcErr)}`);
        return;
      }

      const list: OrgMembership[] = (orgs ?? []) as OrgMembership[];

      if (list.length === 0) {
        setInitState('no_org');
        return;
      }

      setMemberships(list);

      if (list.length === 1) {
        await selectOrg(list[0], user.id);
      } else {
        setInitState('select_org');
      }
    } catch (e: unknown) {
      console.error('[NewInspectionModal] loadMemberships threw:', e);
      setInitState('error');
      setInitError(`Unexpected error: ${formatSupabaseError(e)}`);
    }
  }

  async function selectOrg(membership: OrgMembership, uid?: string) {
    const resolvedUid = uid ?? userId;
    setOrgId(membership.organization_id);
    setOrgName(membership.org_name);
    setInitState('loading');
    console.debug('[NewInspectionModal] selectOrg org_id:', membership.organization_id);
    try {
      const list = await fetchOrgProjects(membership.organization_id);
      console.debug('[NewInspectionModal] fetchOrgProjects returned', list.length, 'projects');
      setProjects(list);
      setInitState('ready');
    } catch (e: unknown) {
      console.error('[NewInspectionModal] fetchOrgProjects threw:', e);
      setInitState('error');
      setInitError(`Failed to load projects: ${formatSupabaseError(e)}`);
    }
    if (resolvedUid) setUserId(resolvedUid);
  }

  useEffect(() => { loadMemberships(); }, []);

  const filteredProjects = projects.filter(p =>
    `${p.project_name} ${p.client_name} ${p.site_location}`.toLowerCase().includes(query.toLowerCase())
  );

  async function handleCreateProject() {
    setProjectNameError('');
    setSubmitError('');

    if (!newProjectName.trim()) {
      setProjectNameError('Project name is required.');
      return;
    }
    if (!userId) {
      setSubmitError('Authentication error — please close and reopen this modal.');
      return;
    }
    if (!orgId) {
      setSubmitError('No organisation selected.');
      return;
    }

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
      setSuccessMessage(`"${p.project_name}" created.`);
      setTimeout(() => { setSuccessMessage(''); setStep('inspector'); }, 900);
    } catch (e: unknown) {
      console.error('[NewInspectionModal] createInspectionProject threw:', e);
      const msg = formatSupabaseError(e);
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setSubmitError('A project with this name already exists.');
      } else if (msg.includes('row-level security') || msg.includes('policy')) {
        setSubmitError('Permission denied. Your account may not have project creation rights.');
      } else if (msg.includes('null value') || msg.includes('not-null')) {
        setSubmitError('Missing required data — check all fields are filled in.');
      } else {
        setSubmitError(`Create failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSelectProject(p: InspectionAIProject) {
    setSelectedProject(p);
    setStep('inspector');
  }

  function handleInspectorNext() {
    setInspectorError('');
    if (!inspectorName.trim()) {
      setInspectorError('Inspector name is required.');
      return;
    }
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

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New Inspection</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === 'select_project' && (orgName ? `${orgName}` : 'Select or create a project')}
              {step === 'new_project' && 'Create new project'}
              {step === 'inspector' && 'Inspector details'}
              {step === 'drawing_choice' && 'Drawing setup'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Loading ── */}
          {(initState === 'loading') && step === 'select_project' && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading your organisation…</span>
            </div>
          )}

          {/* ── No org ── */}
          {initState === 'no_org' && step === 'select_project' && (
            <div className="px-5 py-8 space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">No organisation membership found</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Your account is not linked to any organisation. Contact your administrator to be added.
                  </p>
                </div>
              </div>
              <button
                onClick={loadMemberships}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {initState === 'error' && step === 'select_project' && (
            <div className="px-5 py-8 space-y-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800">Could not load organisations</p>
                  <p className="text-xs text-red-600 mt-1">{initError}</p>
                </div>
              </div>
              <button
                onClick={loadMemberships}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* ── Org selector (multiple orgs) ── */}
          {initState === 'select_org' && step === 'select_project' && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm font-bold text-slate-700">Select an organisation</p>
              {memberships.map(m => (
                <button
                  key={m.organization_id}
                  onClick={() => selectOrg(m)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-slate-400 bg-white text-left transition-colors group"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors">
                    <Building2 className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{m.org_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{m.role}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* ── Project list ── */}
          {initState === 'ready' && step === 'select_project' && (
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
                onClick={() => { setSubmitError(''); setProjectNameError(''); setStep('new_project'); }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors text-sm font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create New Project
              </button>

              {filteredProjects.length === 0 && (
                <div className="py-8 text-center">
                  <FolderOpen className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No projects yet</p>
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
                      <p className="text-xs text-slate-400 truncate">{p.client_name}{p.site_location ? ` · ${p.site_location}` : ''}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── New project form ── */}
          {step === 'new_project' && (
            <div className="px-5 py-4 space-y-4">
              {successMessage && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 font-semibold">{successMessage}</p>
                </div>
              )}
              {submitError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{submitError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => { setNewProjectName(e.target.value); if (projectNameError) setProjectNameError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                  placeholder="e.g. Tower A Passive Fire Inspection"
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    projectNameError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-slate-800'
                  }`}
                  autoFocus
                />
                {projectNameError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{projectNameError}
                  </p>
                )}
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

          {/* ── Inspector ── */}
          {step === 'inspector' && (
            <div className="px-5 py-4 space-y-4">
              {selectedProject && (
                <div className="bg-slate-50 rounded-2xl p-3.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Project</p>
                  <p className="text-sm font-bold text-slate-900">{selectedProject.project_name}</p>
                  {(selectedProject.client_name || selectedProject.site_location) && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[selectedProject.client_name, selectedProject.site_location].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Inspector Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={e => { setInspectorName(e.target.value); if (inspectorError) setInspectorError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleInspectorNext()}
                    placeholder="Your full name"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                      inspectorError ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-slate-800'
                    }`}
                    autoFocus
                  />
                </div>
                {inspectorError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{inspectorError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Drawing choice ── */}
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

        {/* Footer actions */}
        <div
          className="px-5 flex-shrink-0 border-t border-slate-100 pt-4"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {step === 'new_project' && (
            <div className="flex gap-3">
              <button
                onClick={() => { setSubmitError(''); setProjectNameError(''); setStep('select_project'); }}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={handleCreateProject}
                disabled={loading || !newProjectName.trim()}
                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Creating…</>
                ) : (
                  'Create Project'
                )}
              </button>
            </div>
          )}

          {step === 'inspector' && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select_project')}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleInspectorNext}
                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
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
