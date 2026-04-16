import { useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  ChevronDown,
  MapPin,
  Building2,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { fetchAllProjects, createProject } from '../services/storageService';
import type { InspectionAIProject } from '../types';

function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (project: InspectionAIProject) => void;
}) {
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!projectName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const project = await createProject(
        projectName.trim(),
        clientName.trim(),
        siteLocation.trim()
      );
      onCreate(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-base">New Project</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. 35 Walmsley Road — Passive Fire"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-300"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Client Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Naylor Love Construction"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-300"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Site Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={siteLocation}
                onChange={(e) => setSiteLocation(e.target.value)}
                placeholder="e.g. Auckland CBD"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-300"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!projectName.trim() || saving}
            className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectSelector({
  selectedProject,
  onSelect,
}: {
  selectedProject: InspectionAIProject | null;
  onSelect: (project: InspectionAIProject) => void;
}) {
  const [projects, setProjects] = useState<InspectionAIProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    fetchAllProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = (project: InspectionAIProject) => {
    setProjects((prev) => [project, ...prev]);
    onSelect(project);
    setShowNewModal(false);
    setOpen(false);
  };

  return (
    <>
      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreate}
        />
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Project
        </label>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-left hover:border-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <FolderOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {selectedProject ? (
              <span className="text-slate-900 font-medium text-sm truncate">
                {selectedProject.project_name}
              </span>
            ) : (
              <span className="text-slate-400 text-sm">Select a project…</span>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => {
                setOpen(false);
                setShowNewModal(true);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-100 transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              New Project
            </button>

            {loading ? (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6 px-4">
                No projects yet. Create your first project above.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelect(p);
                      setOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                      selectedProject?.id === p.id ? 'bg-slate-50' : ''
                    }`}
                  >
                    <FolderOpen className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {p.project_name}
                      </p>
                      {(p.client_name || p.site_location) && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {[p.client_name, p.site_location].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    {selectedProject?.id === p.id && (
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
