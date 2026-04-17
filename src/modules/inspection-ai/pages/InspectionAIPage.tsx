import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  Camera,
  Upload,
  Zap,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Plus,
  FileText,
  ChevronRight,
  Trash2,
  Eye,
  MapPin,
  Pencil,
  X,
  Clock,
  WifiOff,
  FolderOpen,
  Calendar,
  Building2,
  Map,
  Brain,
} from 'lucide-react';
import { analyseImage, AIUnavailableError, type AnalyseImageResult } from '../services/inspectionAIService';
import { getClients, getProjects, type BridgeProject, type BridgeClient } from '../services/projectBridge';
import {
  uploadInspectionImage,
  createReport,
  saveInspectionItem,
  fetchAllProjects,
  createProject,
  fetchProjectReports,
} from '../services/storageService';
import { saveOverride } from '../utils/overrideLearning';
import { generateNonConformance } from '../utils/standardsMapper';
import { generateRecommendation, generateRisk } from '../utils/reportGenerator';
import { DEFECT_TYPES } from '../utils/defectDictionary';
import { getObservationTemplate } from '../utils/observationTemplates';
import { enqueue, isQueueBusy, queueLength, queueDepth, addQueueListener, isQueuePaused, queuePausedForMs } from '../utils/analysisQueue';
import { enqueueAnalysisJob, triggerWorkerNow } from '../services/jobQueueService';
import { applyInspectionBrain } from '../utils/inspectionBrain';
import { InspectionReportView } from '../components/InspectionReportView';
import { EvidencePhotosPanel } from '../components/EvidencePhotosPanel';
import { ProjectOverview } from '../components/ProjectOverview';
import { BlockLevelNavigator } from '../components/spatial/BlockLevelNavigator';
import { DrawingViewer } from '../components/spatial/DrawingViewer';
import { ExecutiveDashboard } from '../components/ExecutiveDashboard';
import { OverrideAnalyticsPanel } from '../components/OverrideAnalyticsPanel';
import { generatePinSnapshot } from '../utils/drawingExporter';
import { CaptureIntakeWizard } from '../components/CaptureIntakeWizard';
import { SeniorInspectorCard, AnalysingState } from '../components/SeniorInspectorCard';
import { NewInspectionModal } from '../components/NewInspectionModal';
import { InspectionProjectsHome } from '../components/InspectionProjectsHome';
import { ProjectWorkflowDashboard } from '../components/ProjectWorkflowDashboard';
import { InspectionReportBuilder } from '../components/InspectionReportBuilder';
import type { WorkflowItem, ProjectSummary } from '../services/workflowService';
import type { PortfolioProjectStat } from '../services/storageService';
import type {
  AIAnalysisResult,
  CapturedItem,
  SystemType,
  ElementType,
  Severity,
  Extent,
  AnalysisStatus,
  InspectionAIProject,
  InspectionAIReport,
  InspectionAIBlock,
  InspectionAILevel,
  InspectionAIDrawing,
  InspectionAIItemImage,
  CaptureIntakeContext,
} from '../types';
import { updatePin } from '../services/spatialService';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';

const SYSTEM_TYPES: SystemType[] = ['Intumescent', 'Cementitious', 'Protective Coating', 'Firestopping'];
const ELEMENT_TYPES: ElementType[] = ['Beam', 'Column', 'Slab', 'Penetration', 'Other'];
const EXTENT_OPTIONS: Extent[] = ['Localised', 'Moderate', 'Widespread'];
const SEVERITIES: Severity[] = ['Low', 'Medium', 'High'];

const LS_INSPECTOR_KEY = 'inspection_ai_inspector_name';
const LS_SYSTEM_KEY = 'inspection_ai_system_type';
const LS_ELEMENT_KEY = 'inspection_ai_element_type';

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const map: Record<AnalysisStatus, { label: string; className: string; icon: React.ReactNode }> = {
    idle: { label: 'Idle', className: 'bg-slate-100 text-slate-500 border-slate-200', icon: null },
    pending: { label: 'Pending AI', className: 'bg-amber-50 text-amber-600 border-amber-200', icon: <Clock className="w-3 h-3" /> },
    queued: { label: 'Queued…', className: 'bg-sky-50 text-sky-600 border-sky-200', icon: <Clock className="w-3 h-3" /> },
    analysing: { label: 'Analysing…', className: 'bg-blue-50 text-blue-600 border-blue-200', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    retrying: { label: 'Retrying…', className: 'bg-amber-50 text-amber-600 border-amber-200', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    done: { label: 'Done', className: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> },
    manual: { label: 'Manual mode', className: 'bg-orange-50 text-orange-600 border-orange-200', icon: <WifiOff className="w-3 h-3" /> },
    failed: { label: 'AI unavailable', className: 'bg-red-50 text-red-600 border-red-200', icon: <AlertTriangle className="w-3 h-3" /> },
  };
  const { label, className, icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${className}`}>
      {icon}{label}
    </span>
  );
}

function TagGrid<T extends string>({
  label, value, options, onChange, cols = 2,
}: { label: string; value: T; options: T[]; onChange: (v: T) => void; cols?: number }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {options.map((opt) => (
          <button
            key={opt} type="button" onClick={() => onChange(opt)}
            className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
              value === opt
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    High: 'bg-red-100 text-red-700 border-red-200',
    Medium: 'bg-amber-100 text-amber-700 border-amber-200',
    Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${styles[severity] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {severity}
    </span>
  );
}

function ExtentBadge({ extent }: { extent: string }) {
  const styles: Record<string, string> = {
    Localised: 'bg-blue-50 text-blue-700 border-blue-200',
    Moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    Widespread: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles[extent] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {extent}
    </span>
  );
}

function LocationSection({
  locationLevel, locationGrid, locationDescription, onChange, disabled,
}: {
  locationLevel: string; locationGrid: string; locationDescription: string;
  onChange: (field: 'locationLevel' | 'locationGrid' | 'locationDescription', value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-slate-400" />
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Level / Floor</label>
          <input type="text" value={locationLevel} onChange={(e) => onChange('locationLevel', e.target.value)}
            placeholder="e.g. Level 3" disabled={disabled}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent placeholder-slate-300 disabled:bg-slate-50 disabled:text-slate-400" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Grid Ref</label>
          <input type="text" value={locationGrid} onChange={(e) => onChange('locationGrid', e.target.value)}
            placeholder="e.g. B4" disabled={disabled}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent placeholder-slate-300 disabled:bg-slate-50 disabled:text-slate-400" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-xs text-slate-400">Description</label>
        <input type="text" value={locationDescription} onChange={(e) => onChange('locationDescription', e.target.value)}
          placeholder="e.g. North face secondary beam, approx. 200mm from connection" disabled={disabled}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent placeholder-slate-300 disabled:bg-slate-50 disabled:text-slate-400" />
      </div>
    </div>
  );
}

function InspectorOverridePanel({
  item, onUpdate, onClose,
}: { item: CapturedItem; onUpdate: (patch: Partial<CapturedItem>) => void; onClose: () => void }) {
  const [defectType, setDefectType] = useState(item.defectTypeOverride ?? item.analysisResult?.defect_type ?? DEFECT_TYPES[0]);
  const [severity, setSeverity] = useState<Severity>(
    (item.severityOverride as Severity) ?? (item.analysisResult?.severity as Severity) ?? 'Medium'
  );
  const [observation, setObservation] = useState(
    item.observationOverride ?? item.analysisResult?.observation ?? getObservationTemplate(DEFECT_TYPES[0])
  );

  const handleDefectTypeChange = (newDefect: string) => {
    setDefectType(newDefect);
    const template = getObservationTemplate(newDefect);
    if (template) setObservation(template);
  };

  const handleApplyTemplate = () => {
    const template = getObservationTemplate(defectType);
    if (template) setObservation(template);
  };

  const handleApply = () => {
    const aiDefect = item.analysisResult?.defect_type ?? '';
    const aiSeverity = item.analysisResult?.severity ?? 'Medium';
    const aiObs = item.analysisResult?.observation ?? '';
    const hasChange = defectType !== aiDefect || severity !== aiSeverity || observation !== aiObs;
    onUpdate({ defectTypeOverride: defectType, severityOverride: severity, observationOverride: observation, inspectorOverride: hasChange, analysisStatus: 'done' });
    onClose();
  };

  const handleClear = () => {
    onUpdate({ defectTypeOverride: null, severityOverride: null, observationOverride: null, inspectorOverride: false });
    onClose();
  };

  const templateText = getObservationTemplate(defectType);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-base">Inspector Override</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Override the AI classification with your professional assessment. Overrides are flagged in the report.
        </p>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Defect Type</label>
          <select value={defectType} onChange={(e) => handleDefectTypeChange(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white">
            {DEFECT_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Severity</label>
          <div className="grid grid-cols-3 gap-2">
            {SEVERITIES.map((s) => {
              const active = severity === s;
              const colours: Record<string, string> = {
                High: active ? 'bg-red-600 text-white border-red-600' : 'text-red-700 border-red-200 hover:border-red-400',
                Medium: active ? 'bg-amber-500 text-white border-amber-500' : 'text-amber-700 border-amber-200 hover:border-amber-400',
                Low: active ? 'bg-emerald-600 text-white border-emerald-600' : 'text-emerald-700 border-emerald-200 hover:border-emerald-400',
              };
              return (
                <button key={s} type="button" onClick={() => setSeverity(s)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${colours[s]}`}>{s}</button>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Observation</label>
            {templateText && observation !== templateText && (
              <button type="button" onClick={handleApplyTemplate}
                className="text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors">Use template</button>
            )}
          </div>
          <textarea value={observation} onChange={(e) => setObservation(e.target.value)} rows={4}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 resize-none" />
          {templateText && <p className="text-xs text-slate-400 leading-relaxed italic">Template: "{templateText}"</p>}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={handleClear}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Clear Override
          </button>
          <button onClick={handleApply}
            className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function makeBlankItem(file: File, previewUrl: string, ctx: CaptureIntakeContext): CapturedItem {
  return {
    imageFile: file, imagePreviewUrl: previewUrl, annotatedImageUrl: null,
    systemType: ctx.systemType, element: ctx.element,
    environment: ctx.environment, observedConcern: ctx.observedConcern, isNewInstall: ctx.isNewInstall,
    locationLevel: '', locationGrid: '', locationDescription: '',
    extent: 'Localised', analysisResult: null, nonConformance: '', recommendation: '', risk: '',
    defectTypeOverride: null, severityOverride: null, observationOverride: null,
    inspectorOverride: false, analysisStatus: 'idle', isAnalysing: false, isSaved: false,
  };
}

function AnalyseLaterRow({ onAnalyseLater }: { onAnalyseLater: () => void }) {
  return (
    <div className="flex items-center justify-between bg-white border border-dashed border-slate-200 rounded-xl px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-700">Batch capture mode</p>
        <p className="text-xs text-slate-400 mt-0.5">Add images without AI — classify manually later</p>
      </div>
      <button onClick={onAnalyseLater}
        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-3 py-2 rounded-lg transition-colors flex-shrink-0 ml-3">
        <Clock className="w-4 h-4" />
        Analyse Later
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// New Project Modal (on home screen)
// ─────────────────────────────────────────────
function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (p: InspectionAIProject) => void;
}) {
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingClients, setExistingClients] = useState<BridgeClient[]>([]);
  const [existingProjects, setExistingProjects] = useState<BridgeProject[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);

  useEffect(() => {
    getClients().then(setExistingClients);
    getProjects().then(setExistingProjects);
  }, []);

  const handleCreate = async () => {
    if (!projectName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const p = await createProject(projectName.trim(), clientName.trim(), siteLocation.trim());
      onCreate(p);
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. 35 Walmsley Road — Passive Fire" autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder-slate-300" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Client Name</label>
              {existingClients.length > 0 && (
                <button type="button" onClick={() => setShowClientPicker((v) => !v)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                  {showClientPicker ? 'Type manually' : `Pick from ${existingClients.length} existing`}
                </button>
              )}
            </div>
            {showClientPicker && existingClients.length > 0 ? (
              <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                {existingClients.map((c) => (
                  <button key={c.id} type="button"
                    onClick={() => { setClientName(c.name); setShowClientPicker(false); }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm font-medium transition-colors ${clientName === c.name ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:border-slate-400 text-slate-800'}`}>
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                    {c.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Naylor Love Construction"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder-slate-300" />
              </div>
            )}
            {!showClientPicker && existingProjects.filter((p) => p.client_name === clientName && clientName).length > 0 && (
              <p className="text-xs text-slate-400">
                {existingProjects.filter((p) => p.client_name === clientName).length} existing project{existingProjects.filter((p) => p.client_name === clientName).length > 1 ? 's' : ''} for this client
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Site Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={siteLocation} onChange={(e) => setSiteLocation(e.target.value)}
                placeholder="e.g. Auckland CBD"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder-slate-300" />
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={!projectName.trim() || saving}
            className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Home — project list
// ─────────────────────────────────────────────
function HomeScreen({
  projects,
  loadingProjects,
  onSelectProject,
  onCreateProject,
  onSelectPortfolioProject,
}: {
  projects: InspectionAIProject[];
  loadingProjects: boolean;
  onSelectProject: (p: InspectionAIProject) => void;
  onCreateProject: () => void;
  onSelectPortfolioProject: (stat: PortfolioProjectStat) => void;
}) {
  const [tab, setTab] = useState<'projects' | 'executive' | 'learning'>('projects');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-md mx-auto px-5 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Inspection AI</h1>
              <p className="text-slate-400 text-xs">Field intelligence platform</p>
            </div>
            <button
              onClick={onCreateProject}
              className="ml-auto flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-3.5 py-2 rounded-xl transition-all active:scale-95 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          <div className="flex gap-1 bg-white/10 rounded-xl p-1">
            <button
              onClick={() => setTab('projects')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === 'projects'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Projects
            </button>
            <button
              onClick={() => setTab('executive')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === 'executive'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Portfolio
            </button>
            <button
              onClick={() => setTab('learning')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === 'learning'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              v4
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full px-5 py-5">
        {tab === 'projects' && (
          <>
            {loadingProjects ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-7 h-7 animate-spin text-slate-500" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">No projects yet</p>
                <p className="text-slate-600 text-xs mt-1">Create a project to start inspecting</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
                  Recent Projects
                </p>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelectProject(p)}
                    className="w-full bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-98 text-left"
                  >
                    <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{p.project_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.client_name && (
                          <span className="flex items-center gap-1 text-xs text-slate-400 truncate">
                            <Building2 className="w-3 h-3 flex-shrink-0" />
                            {p.client_name}
                          </span>
                        )}
                        {p.site_location && (
                          <span className="flex items-center gap-1 text-xs text-slate-400 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {p.site_location}
                          </span>
                        )}
                        {!p.client_name && !p.site_location && (
                          <span className="text-xs text-slate-500">
                            {format(new Date(p.created_at), 'd MMM yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'executive' && (
          <ExecutiveDashboard onSelectProject={onSelectPortfolioProject} />
        )}

        {tab === 'learning' && (
          <OverrideAnalyticsPanel />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Setup screen (inspector name + start)
// ─────────────────────────────────────────────
function SetupScreen({
  project,
  inspectorName,
  setInspectorName,
  onBack,
  onStart,
  starting,
  existingReports,
  onOpenReport,
  onOpenDrawings,
}: {
  project: InspectionAIProject;
  inspectorName: string;
  setInspectorName: (v: string) => void;
  onBack: () => void;
  onStart: () => void;
  starting: boolean;
  existingReports: InspectionAIReport[];
  onOpenReport: (r: InspectionAIReport) => void;
  onOpenDrawings: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
      <div className="sticky top-0 z-10 bg-transparent px-5 pt-5 pb-2 max-w-md mx-auto w-full">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Projects</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 pb-10 max-w-md mx-auto w-full space-y-5">
        <div className="mb-2">
          <div className="flex items-center gap-2.5 mb-1">
            <FolderOpen className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-bold text-white">{project.project_name}</h2>
          </div>
          {(project.client_name || project.site_location) && (
            <p className="text-slate-400 text-sm">
              {[project.client_name, project.site_location].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Inspector Name
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-300"
            />
          </div>
          <button
            onClick={onStart}
            disabled={!inspectorName.trim() || starting}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-slate-800 transition-all active:scale-98 shadow-sm"
          >
            {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Start New Inspection <ChevronRight className="w-5 h-5" /></>}
          </button>
          <div className="border-t border-slate-100 pt-4">
            <button
              onClick={onOpenDrawings}
              className="w-full flex items-center gap-3 border border-slate-200 text-slate-700 py-3.5 px-4 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              <Map className="w-4 h-4 text-slate-500" />
              <span>Drawings & Pins</span>
              <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
            </button>
          </div>
        </div>

        {existingReports.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
              Previous Sessions
            </p>
            {existingReports.slice(0, 5).map((r) => (
              <button
                key={r.id}
                onClick={() => onOpenReport(r)}
                className="w-full bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition-all active:scale-98"
              >
                <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.inspector_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(r.created_at), 'd MMM yyyy, h:mm a')}
                    </span>
                    {(r.item_count ?? 0) > 0 && (
                      <span className="text-xs text-slate-400">
                        · {r.item_count} finding{r.item_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  r.status === 'completed'
                    ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                    : 'bg-amber-900/40 text-amber-300 border-amber-700'
                }`}>
                  {r.status === 'completed' ? 'Complete' : 'Draft'}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-slate-600 text-xs">
          Visual inspection only · No compliance certification
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

type Screen = 'home' | 'project-overview' | 'setup' | 'capture' | 'spatial-nav' | 'drawing-viewer'
  | 'wf-home' | 'wf-project' | 'wf-report';

export default function InspectionAIPage() {
  const [screen, setScreen] = useState<Screen>('wf-home');
  const [projects, setProjects] = useState<InspectionAIProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const [selectedProject, setSelectedProject] = useState<InspectionAIProject | null>(null);
  const [projectReports, setProjectReports] = useState<InspectionAIReport[]>([]);

  const [activeDrawing, setActiveDrawing] = useState<InspectionAIDrawing | null>(null);
  const [activeDrawingLevel, setActiveDrawingLevel] = useState<InspectionAILevel | null>(null);
  const [activeDrawingBlock, setActiveDrawingBlock] = useState<InspectionAIBlock | null>(null);
  const [pendingPinId, setPendingPinId] = useState<string | null>(null);

  const [inspectorName, setInspectorName] = useState(() => localStorage.getItem(LS_INSPECTOR_KEY) ?? '');
  const [reportId, setReportId] = useState<string | null>(null);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);

  const [items, setItems] = useState<CapturedItem[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [overrideIdx, setOverrideIdx] = useState<number | null>(null);

  const [sessionSystemType, setSessionSystemType] = useState<SystemType>(
    () => (localStorage.getItem(LS_SYSTEM_KEY) as SystemType) ?? 'Intumescent'
  );
  const [sessionElement, setSessionElement] = useState<ElementType>(
    () => (localStorage.getItem(LS_ELEMENT_KEY) as ElementType) ?? 'Beam'
  );

  const [showIntakeWizard, setShowIntakeWizard] = useState(false);
  const [pendingIntakeCtx, setPendingIntakeCtx] = useState<CaptureIntakeContext | null>(null);
  const [evidencePhotos, setEvidencePhotos] = useState<Record<string, InspectionAIItemImage[]>>({});
  const [retryCountdowns, setRetryCountdowns] = useState<Record<number, number>>({});

  const [showNewInspectionModal, setShowNewInspectionModal] = useState(false);
  const [wfSelectedProject, setWfSelectedProject] = useState<InspectionAIProject | null>(null);
  const [wfProjectSummary, setWfProjectSummary] = useState<ProjectSummary | null>(null);
  const [wfReportItems, setWfReportItems] = useState<WorkflowItem[]>([]);

  const liveQueueDepth = useSyncExternalStore(
    addQueueListener,
    queueDepth
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [startingSession, setStartingSession] = useState(false);

  useEffect(() => { localStorage.setItem(LS_INSPECTOR_KEY, inspectorName); }, [inspectorName]);
  useEffect(() => { localStorage.setItem(LS_SYSTEM_KEY, sessionSystemType); }, [sessionSystemType]);
  useEffect(() => { localStorage.setItem(LS_ELEMENT_KEY, sessionElement); }, [sessionElement]);

  useEffect(() => {
    fetchAllProjects()
      .then(setProjects)
      .finally(() => setLoadingProjects(false));
  }, []);

  const itemsRef = useRef<CapturedItem[]>(items);
  itemsRef.current = items;

  const loadProjectReports = async (projectId: string) => {
    const reports = await fetchProjectReports(projectId);
    setProjectReports(reports);
    return reports;
  };

  const handleSelectProject = async (p: InspectionAIProject) => {
    setSelectedProject(p);
    await loadProjectReports(p.id);
    setScreen('setup');
  };

  const handleCreateProject = (p: InspectionAIProject) => {
    setProjects((prev) => [p, ...prev]);
    setShowNewProjectModal(false);
    setSelectedProject(p);
    setProjectReports([]);
    setScreen('setup');
  };

  const handleStartInspection = async () => {
    if (!inspectorName.trim() || !selectedProject) return;
    setStartingSession(true);
    try {
      const r = await createReport(
        selectedProject.project_name,
        inspectorName.trim(),
        selectedProject.id
      );
      setReportId(r.id);
      setItems([]);
      setActiveIdx(null);
      setScreen('capture');
    } finally {
      setStartingSession(false);
    }
  };

  const handleOpenDrawings = () => {
    setScreen('spatial-nav');
  };

  const handleSelectDrawing = (
    drawing: InspectionAIDrawing,
    level: InspectionAILevel,
    block: InspectionAIBlock
  ) => {
    setActiveDrawing(drawing);
    setActiveDrawingLevel(level);
    setActiveDrawingBlock(block);
    setScreen('drawing-viewer');
  };

  const handlePinCapture = async (pinId: string, _useCamera: boolean) => {
    setPendingPinId(pinId);
    if (!reportId && selectedProject && inspectorName.trim()) {
      const r = await createReport(selectedProject.project_name, inspectorName.trim(), selectedProject.id);
      setReportId(r.id);
    }
    setScreen('capture');
    setTimeout(() => setShowIntakeWizard(true), 100);
  };

  const setItemStatus = useCallback((idx: number, status: AnalysisStatus) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, analysisStatus: status, isAnalysing: status === 'analysing' || status === 'retrying' || status === 'queued' || status === 'pending' }
          : item
      )
    );
  }, []);

  const runAnalysis = useCallback(
    async (idx: number, systemType: SystemType, element: ElementType, imageFile: File, environment?: string, observedConcern?: string, isNewInstall?: boolean, forceTier2?: boolean) => {
      const item = items[idx];
      if (item?.isAnalysing || item?.analysisStatus === 'queued') return;

      const taskId = `item-${idx}-${imageFile.name}-${imageFile.size}${forceTier2 ? '-t2' : ''}`;
      const alreadyBusy = isQueueBusy() || queueLength() > 0;
      setItemStatus(idx, alreadyBusy ? 'queued' : 'analysing');

      try {
        await enqueue(async () => {
          setItemStatus(idx, 'analysing');
          let aiResult: AnalyseImageResult;
          try {
            aiResult = await analyseImage(
              imageFile,
              systemType,
              element,
              (attemptNumber, delayMs) => {
                setItemStatus(idx, 'retrying');
                const endsAt = Date.now() + delayMs;
                const tick = () => {
                  const remaining = Math.ceil((endsAt - Date.now()) / 1000);
                  if (remaining <= 0) {
                    setRetryCountdowns((prev) => { const next = { ...prev }; delete next[idx]; return next; });
                    return;
                  }
                  setRetryCountdowns((prev) => ({ ...prev, [idx]: remaining }));
                  setTimeout(tick, 500);
                };
                tick();
                void attemptNumber;
              },
              environment,
              observedConcern,
              isNewInstall,
              queueDepth(),
              forceTier2
            );
          } catch (err) {
          const msg = err instanceof AIUnavailableError ? err.message : 'AI analysis failed. Classify manually.';
          const isRateLimit = err instanceof AIUnavailableError && err.reason === 'rate_limit';
          setItems((prev) =>
            prev.map((item, i) =>
              i !== idx ? item : {
                ...item,
                analysisStatus: 'failed' as AnalysisStatus,
                isAnalysing: false,
                aiErrorMessage: msg,
                aiErrorIsRateLimit: isRateLimit,
              }
            )
          );
          setActiveIdx(idx);
          return;
        }
        const isManual = aiResult.confidence === 0;

        let result = aiResult;
        if (!isManual) {
          const brainResult = applyInspectionBrain(aiResult, {
            systemType,
            element,
            environment: (environment ?? 'Internal') as import('../types').Environment,
            observedConcern: (observedConcern ?? 'Unsure') as import('../types').ObservedConcern,
            isNewInstall: isNewInstall ?? false,
          });
          result = {
            defect_type: brainResult.defect_type,
            severity: brainResult.severity,
            observation: brainResult.observation,
            confidence: brainResult.confidence,
            needsReview: brainResult.needsReview,
            likely_cause: brainResult.likely_cause,
            next_checks: brainResult.next_checks,
            escalate: brainResult.escalate,
            escalation_reason: brainResult.escalation_reason,
            remediation_guidance: brainResult.remediation_guidance,
            _brainMode: brainResult.brainMode,
            _confidenceBoost: brainResult.confidenceBoost,
            _triggeredRules: brainResult.rulebook.triggeredRules,
            _hiddenRisks: brainResult.rulebook.hiddenRisks,
            _complianceConcernLevel: brainResult.rulebookV2.complianceConcernLevel,
            _likelyIssueType: brainResult.rulebookV2.likelyIssueType,
            _standardsNotes: brainResult.rulebookV2.standardsNotes,
            _manufacturerLogicNotes: brainResult.rulebookV2.manufacturerLogicNotes,
            _intumescentSystemNotes: brainResult.rulebookV2.intumescentSystemNotes,
            _complianceRationale: brainResult.rulebookV2.complianceRationale ?? undefined,
            _v3FamilyHint: brainResult.rulebookV3.familyHint !== 'unknown' ? brainResult.rulebookV3.familyHint : undefined,
            _v3FamilyConfidence: brainResult.rulebookV3.familyConfidence,
            _v3ReviewTriggers: brainResult.rulebookV3.reviewTriggers.length > 0 ? brainResult.rulebookV3.reviewTriggers : undefined,
            _v3ManufacturerLogicNotes: brainResult.rulebookV3.manufacturerLogicNotes.length > 0 ? brainResult.rulebookV3.manufacturerLogicNotes : undefined,
            _v3MatchedRuleIds: brainResult.rulebookV3.matchedRuleIds.length > 0 ? brainResult.rulebookV3.matchedRuleIds : undefined,
          } as unknown as AIAnalysisResult;
        }

        const nc = generateNonConformance(result.defect_type, element);
        const rec = generateRecommendation(result.defect_type, systemType);
        const risk = generateRisk(result.severity as Severity);

        setRetryCountdowns((prev) => { const next = { ...prev }; delete next[idx]; return next; });
        setItems((prev) =>
          prev.map((item, i) => {
            if (i !== idx) return item;
            return { ...item, analysisResult: result, nonConformance: nc, recommendation: rec, risk, analysisStatus: isManual ? 'manual' : 'done', isAnalysing: false };
          })
        );

        if (isManual) { setActiveIdx(idx); setOverrideIdx(idx); }

        if (aiResult.needsT2Escalation) {
          setTimeout(() => runAnalysis(idx, systemType, element, imageFile, environment, observedConcern, isNewInstall, true), 0);
        }
      }, taskId, forceTier2 ? 'high' : 'normal');
      } catch (err) {
        if (err instanceof Error && err.message === 'debounced') {
          console.info(`[AI] Debounced duplicate for task ${taskId}`);
        }
      }
    },
    [setItemStatus, items]
  );

  const addImageFromFile = useCallback(
    (file: File, ctx: CaptureIntakeContext, _analyseLater = false) => {
      const previewUrl = URL.createObjectURL(file);
      const base = makeBlankItem(file, previewUrl, ctx);
      const newItem: CapturedItem = { ...base, analysisStatus: 'pending', isAnalysing: true };
      setItems((prev) => {
        const next = [...prev, newItem];
        const newIdx = next.length - 1;
        setActiveIdx(newIdx);
        if (!isQueueBusy() && queueLength() === 0) {
          setTimeout(() => runAnalysis(newIdx, ctx.systemType, ctx.element, file, ctx.environment, ctx.observedConcern, ctx.isNewInstall), 0);
        }
        return next;
      });
      enqueueAnalysisJob(file, ctx).then(() => {
        triggerWorkerNow();
      }).catch(() => {});
    },
    [runAnalysis]
  );

  const runAnalysisRef = useRef(runAnalysis);
  runAnalysisRef.current = runAnalysis;

  useEffect(() => {
    const BACKGROUND_INTERVAL_MS = 15000;
    const timer = setInterval(() => {
      if (isQueueBusy() || queueLength() > 0) return;
      const currentItems = itemsRef.current;
      const pendingIdx = currentItems.findIndex((item) => item.analysisStatus === 'pending');
      if (pendingIdx === -1) return;
      const item = currentItems[pendingIdx];
      console.info(`[AI Background] Processing pending item ${pendingIdx}`);
      runAnalysisRef.current(
        pendingIdx,
        item.systemType,
        item.element,
        item.imageFile,
        item.environment,
        item.observedConcern,
        item.isNewInstall
      );
    }, BACKGROUND_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, ctx?: CaptureIntakeContext, analyseLater = false) => {
    const file = e.target.files?.[0];
    const activeCtx: CaptureIntakeContext = ctx ?? {
      systemType: sessionSystemType, element: sessionElement,
      environment: 'Internal', observedConcern: 'Unsure', isNewInstall: false,
    };
    if (file) addImageFromFile(file, activeCtx, analyseLater);
    e.target.value = '';
  };

  const updateItem = useCallback((idx: number, patch: Partial<CapturedItem>) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  }, []);

  const handleReanalyse = (idx: number) => {
    const item = items[idx];
    if (!item || item.isAnalysing || item.analysisStatus === 'queued') return;
    updateItem(idx, { analysisResult: null, nonConformance: '', recommendation: '', risk: '', defectTypeOverride: null, severityOverride: null, observationOverride: null, inspectorOverride: false, analysisStatus: 'idle', isSaved: false, aiErrorMessage: undefined, aiErrorIsRateLimit: undefined });
    runAnalysis(idx, item.systemType, item.element, item.imageFile, item.environment, item.observedConcern, item.isNewInstall);
  };

  const handleSave = async (idx: number) => {
    const item = items[idx];
    if (!reportId || item.isSaved) return;
    const effectiveDefect = item.defectTypeOverride ?? item.analysisResult?.defect_type ?? 'Unknown';
    const effectiveSeverity = item.severityOverride ?? item.analysisResult?.severity ?? 'Medium';
    const effectiveObservation = item.observationOverride ?? item.analysisResult?.observation ?? getObservationTemplate('Unknown');
    const nc = generateNonConformance(effectiveDefect, item.element);
    const rec = generateRecommendation(effectiveDefect, item.systemType);
    const risk = generateRisk(effectiveSeverity as Severity);

    try {
      let annotatedImageUrl = item.annotatedImageUrl;

      if (pendingPinId && activeDrawing) {
        const snapshotBlob = await generatePinSnapshot(activeDrawing.file_url, {
          x_percent: 50,
          y_percent: 50,
          severity: effectiveSeverity,
          label: effectiveDefect,
        });
        if (snapshotBlob) {
          const snapshotFile = new File([snapshotBlob], 'markup.jpg', { type: 'image/jpeg' });
          try {
            const snapshotUrl = await uploadInspectionImage(snapshotFile, `${reportId}-markups`);
            annotatedImageUrl = snapshotUrl;
          } catch {
          }
        }
      }

      const imageUrl = await uploadInspectionImage(item.imageFile, reportId);
      const saved = await saveInspectionItem({
        report_id: reportId, image_url: imageUrl, system_type: item.systemType, element: item.element,
        defect_type: effectiveDefect, severity: effectiveSeverity, observation: effectiveObservation,
        non_conformance: nc, recommendation: rec, risk, confidence: item.analysisResult?.confidence ?? 0,
        location_level: item.locationLevel, location_grid: item.locationGrid, location_description: item.locationDescription,
        extent: item.extent, defect_type_override: item.defectTypeOverride, severity_override: item.severityOverride,
        observation_override: item.observationOverride, inspector_override: item.inspectorOverride, annotated_image_url: annotatedImageUrl,
        tier_used: item.analysisResult?.tier_used ?? null,
        model_used: item.analysisResult?.model_used ?? null,
      });
      updateItem(idx, { isSaved: true, savedId: saved.id, savedImageUrl: imageUrl });

      if (item.inspectorOverride && item.analysisResult) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const changedFields: string[] = [];
          if (item.defectTypeOverride && item.defectTypeOverride !== item.analysisResult.defect_type) changedFields.push('defect_type');
          if (item.severityOverride && item.severityOverride !== item.analysisResult.severity) changedFields.push('severity');
          if (item.observationOverride && item.observationOverride !== item.analysisResult.observation) changedFields.push('observation');

          if (changedFields.length > 0) {
            saveOverride({
              itemId: saved.id,
              reportId,
              userId: userData.user.id,
              systemType: item.systemType,
              elementType: item.element,
              environment: item.environment,
              observedConcern: item.observedConcern,
              v3FamilyHint: item.analysisResult._v3FamilyHint ?? null,
              aiDefectType: item.analysisResult.defect_type,
              aiSeverity: item.analysisResult.severity,
              aiConfidence: item.analysisResult.confidence,
              finalDefectType: effectiveDefect,
              finalSeverity: effectiveSeverity,
              changedFields,
            });
          }
        }
      }

      if (pendingPinId) {
        await updatePin(pendingPinId, {
          item_id: saved.id,
          severity: effectiveSeverity,
          label: effectiveDefect,
        });
        setPendingPinId(null);
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (activeIdx === idx) setActiveIdx(next.length > 0 ? Math.max(0, idx - 1) : null);
      else if (activeIdx !== null && activeIdx > idx) setActiveIdx(activeIdx - 1);
      return next;
    });
  };

  // ── NEW WORKFLOW: Projects home
  if (screen === 'wf-home') {
    return (
      <div className="h-screen flex flex-col">
        {showNewInspectionModal && (
          <NewInspectionModal
            onClose={() => setShowNewInspectionModal(false)}
            onStart={({ project, inspectorName: name, useDrawings }) => {
              setShowNewInspectionModal(false);
              setWfSelectedProject(project);
              setWfProjectSummary(null);
              setInspectorName(name);
              if (useDrawings) {
                setSelectedProject(project);
                setScreen('spatial-nav');
              } else {
                setSelectedProject(project);
                setScreen('setup');
              }
            }}
          />
        )}
        <InspectionProjectsHome
          onSelectProject={(project, summary) => {
            setWfSelectedProject(project);
            setWfProjectSummary(summary);
            setScreen('wf-project');
          }}
          onNewInspection={() => setShowNewInspectionModal(true)}
        />
      </div>
    );
  }

  // ── NEW WORKFLOW: Project dashboard
  if (screen === 'wf-project' && wfSelectedProject) {
    return (
      <div className="h-screen flex flex-col">
        {showNewInspectionModal && (
          <NewInspectionModal
            onClose={() => setShowNewInspectionModal(false)}
            onStart={({ project, inspectorName: name, useDrawings }) => {
              setShowNewInspectionModal(false);
              setInspectorName(name);
              if (useDrawings) {
                setSelectedProject(project);
                setScreen('spatial-nav');
              } else {
                setSelectedProject(project);
                setScreen('setup');
              }
            }}
          />
        )}
        <ProjectWorkflowDashboard
          project={wfSelectedProject}
          summary={wfProjectSummary}
          onAddInspection={() => setShowNewInspectionModal(true)}
          onViewReport={(items) => {
            setWfReportItems(items);
            setScreen('wf-report');
          }}
          onOpenDrawings={() => {
            setSelectedProject(wfSelectedProject);
            setScreen('spatial-nav');
          }}
          onBack={() => setScreen('wf-home')}
        />
      </div>
    );
  }

  // ── NEW WORKFLOW: Report builder
  if (screen === 'wf-report' && wfSelectedProject) {
    return (
      <InspectionReportBuilder
        project={wfSelectedProject}
        items={wfReportItems}
        onClose={() => setScreen('wf-project')}
      />
    );
  }

  // ── View report from history (read-only, no capture state)
  if (viewingReportId) {
    return (
      <InspectionReportView
        reportId={viewingReportId}
        onBack={() => {
          setViewingReportId(null);
          if (screen === 'project-overview') return;
          if (selectedProject) setScreen('setup');
        }}
      />
    );
  }

  // ── Home
  if (screen === 'home') {
    return (
      <>
        {showNewProjectModal && (
          <NewProjectModal
            onClose={() => setShowNewProjectModal(false)}
            onCreate={handleCreateProject}
          />
        )}
        <HomeScreen
          projects={projects}
          loadingProjects={loadingProjects}
          onSelectProject={handleSelectProject}
          onCreateProject={() => setShowNewProjectModal(true)}
          onSelectPortfolioProject={(stat) => handleSelectProject(stat.project)}
        />
      </>
    );
  }

  // ── Project overview (all sessions for a project)
  if (screen === 'project-overview' && selectedProject) {
    return (
      <ProjectOverview
        project={selectedProject}
        onBack={() => setScreen('home')}
        onOpenReport={(r) => setViewingReportId(r.id)}
        onNewReport={() => setScreen('setup')}
      />
    );
  }

  // ── Setup (inspector name + start / load previous)
  if (screen === 'setup' && selectedProject) {
    return (
      <SetupScreen
        project={selectedProject}
        inspectorName={inspectorName}
        setInspectorName={setInspectorName}
        onBack={() => setScreen('home')}
        onStart={handleStartInspection}
        starting={startingSession}
        existingReports={projectReports}
        onOpenReport={(r) => setViewingReportId(r.id)}
        onOpenDrawings={handleOpenDrawings}
      />
    );
  }

  // ── Spatial navigator (block → level → drawings)
  if (screen === 'spatial-nav' && selectedProject) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <BlockLevelNavigator
          project={selectedProject}
          onSelectDrawing={handleSelectDrawing}
          onBack={() => wfSelectedProject ? setScreen('wf-project') : setScreen('setup')}
        />
      </div>
    );
  }

  // ── Drawing viewer (zoom/pan/pins)
  if (screen === 'drawing-viewer' && activeDrawing) {
    return (
      <div className="h-screen flex flex-col">
        <DrawingViewer
          drawing={activeDrawing}
          reportId={reportId}
          onBack={() => setScreen('spatial-nav')}
          onStartCapture={handlePinCapture}
        />
      </div>
    );
  }

  // ── Capture
  const savedCount = items.filter((i) => i.isSaved).length;
  const unsavedWithResult = items.filter((i) => (i.analysisResult || i.inspectorOverride) && !i.isSaved);
  const queuedCount = items.filter((i) => i.analysisStatus === 'queued' || i.analysisStatus === 'analysing' || i.analysisStatus === 'retrying').length;

  const defaultCtx: CaptureIntakeContext = {
    systemType: sessionSystemType, element: sessionElement,
    environment: 'Internal', observedConcern: 'Unsure', isNewInstall: false,
  };

  const handleWizardCaptureCamera = (ctx: CaptureIntakeContext) => {
    setPendingIntakeCtx(ctx);
    setShowIntakeWizard(false);
    setSessionSystemType(ctx.systemType);
    setSessionElement(ctx.element);
    setTimeout(() => cameraInputRef.current?.click(), 100);
  };

  const handleWizardCaptureUpload = (ctx: CaptureIntakeContext) => {
    setPendingIntakeCtx(ctx);
    setShowIntakeWizard(false);
    setSessionSystemType(ctx.systemType);
    setSessionElement(ctx.element);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  if (showIntakeWizard) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => {
            const ctx = pendingIntakeCtx ?? defaultCtx;
            setPendingIntakeCtx(null);
            handleFileSelect(e, ctx, false);
          }} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => {
            const ctx = pendingIntakeCtx ?? defaultCtx;
            setPendingIntakeCtx(null);
            handleFileSelect(e, ctx, false);
          }} />
        <CaptureIntakeWizard
          initialContext={defaultCtx}
          onCaptureCamera={handleWizardCaptureCamera}
          onCaptureUpload={handleWizardCaptureUpload}
          onCancel={() => setShowIntakeWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {overrideIdx !== null && items[overrideIdx] && (
        <InspectorOverridePanel
          item={items[overrideIdx]}
          onUpdate={(patch) => updateItem(overrideIdx, patch)}
          onClose={() => setOverrideIdx(null)}
        />
      )}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => {
          const ctx = pendingIntakeCtx ?? defaultCtx;
          setPendingIntakeCtx(null);
          handleFileSelect(e, ctx, false);
        }} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const ctx = pendingIntakeCtx ?? defaultCtx;
          setPendingIntakeCtx(null);
          handleFileSelect(e, ctx, false);
        }} />

      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setScreen('setup')}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Setup</span>
          </button>
          <div className="text-center">
            <p className="font-bold text-slate-900 text-sm leading-tight truncate max-w-[160px]">
              {selectedProject?.project_name ?? 'Inspection'}
            </p>
            <p className="text-xs text-slate-500">
              {items.length} captured · {savedCount} saved
              {queuedCount > 0 && ` · ${queuedCount} in queue`}
            </p>
            {pendingPinId && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mt-0.5">
                <Map className="w-3 h-3" />
                Linking to pin
              </span>
            )}
          </div>
          {reportId && (
            <button
              onClick={() => setViewingReportId(reportId)}
              className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              Report
            </button>
          )}
        </div>
      </div>

      {(() => {
        const pendingCount = items.filter((i) => i.analysisStatus === 'pending').length;
        const analysingCount = items.filter((i) => i.analysisStatus === 'analysing' || i.analysisStatus === 'retrying').length;
        const failedCount = items.filter((i) => i.analysisStatus === 'failed').length;
        const doneCount = items.filter((i) => i.analysisStatus === 'done' || i.analysisStatus === 'manual').length;
        const totalActive = pendingCount + analysingCount + liveQueueDepth;
        const rateLimitPaused = isQueuePaused();
        const pauseSecs = Math.ceil(queuePausedForMs() / 1000);

        if (rateLimitPaused || totalActive > 0 || failedCount > 0) {
          const isPauseOnly = rateLimitPaused && analysingCount === 0;
          return (
            <div className={`border-b px-4 py-2.5 max-w-2xl mx-auto w-full ${isPauseOnly ? 'bg-orange-50 border-orange-100' : analysingCount > 0 ? 'bg-sky-50 border-sky-100' : failedCount > 0 && pendingCount === 0 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-center gap-2">
                {isPauseOnly ? (
                  <Clock className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                ) : analysingCount > 0 ? (
                  <Loader2 className="w-3.5 h-3.5 text-sky-500 animate-spin flex-shrink-0" />
                ) : pendingCount > 0 ? (
                  <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                )}
                <p className={`text-xs font-semibold ${isPauseOnly ? 'text-orange-700' : analysingCount > 0 ? 'text-sky-700' : failedCount > 0 && pendingCount === 0 ? 'text-red-700' : 'text-amber-700'}`}>
                  {isPauseOnly
                    ? `Rate limit reached — resuming in ${pauseSecs}s`
                    : analysingCount > 0
                    ? `Analysing — 1 of ${pendingCount + analysingCount} photos`
                    : pendingCount > 0
                    ? `${pendingCount} photo${pendingCount > 1 ? 's' : ''} queued — AI will process shortly`
                    : `${failedCount} failed — tap to classify manually`}
                </p>
                <span className="ml-auto text-[10px] text-slate-400">
                  {doneCount > 0 ? `${doneCount} done` : 'Keep capturing'}
                </span>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 space-y-4">
        <button
          onClick={() => setShowIntakeWizard(true)}
          className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-2xl font-bold text-base shadow-sm hover:bg-slate-800 transition-all active:scale-95"
        >
          <Camera className="w-6 h-6" />
          Capture Finding
        </button>

        {items.length === 0 && (
          <div className="text-center py-14 text-slate-400">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-base font-semibold text-slate-600">No findings yet</p>
            <p className="text-sm mt-1 text-slate-400">Tap "Capture Finding" to start</p>
            <p className="text-xs mt-1 text-slate-300">AI will reason like a senior inspector</p>
          </div>
        )}

        {items.map((item, idx) => {
          const effectiveDefect = item.defectTypeOverride ?? item.analysisResult?.defect_type;
          const effectiveSeverity = item.severityOverride ?? item.analysisResult?.severity;
          const hasOverride = !!(item.defectTypeOverride || item.severityOverride || item.observationOverride);
          const isInProgress = item.analysisStatus === 'queued' || item.analysisStatus === 'analysing' || item.analysisStatus === 'retrying';
          const isFailed = item.analysisStatus === 'failed';
          const canSave = !item.isSaved && (!!item.analysisResult || item.inspectorOverride);

          return (
            <div key={idx}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                activeIdx === idx ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
              }`}
            >
              <button className="w-full text-left" onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}>
                <div className="flex items-center gap-3 p-4">
                  {item.imagePreviewUrl && (
                    <img src={item.imagePreviewUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-slate-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">Finding {idx + 1}</p>
                      {effectiveSeverity && <SeverityBadge severity={effectiveSeverity} />}
                      {item.extent !== 'Localised' && <ExtentBadge extent={item.extent} />}
                      {hasOverride && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">Overridden</span>
                      )}
                      {item.analysisResult?.escalate && !hasOverride && (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">Review</span>
                      )}
                      {item.isSaved && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                      {!item.isSaved && <AnalysisStatusBadge status={item.analysisStatus} />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {item.systemType} · {item.element}
                      {effectiveDefect ? ` · ${effectiveDefect}` : isInProgress ? '' : ' · Pending classification'}
                      {item.locationLevel ? ` · ${item.locationLevel}` : ''}
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${activeIdx === idx ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {activeIdx === idx && (
                <div className="border-t border-slate-100 p-4 space-y-5">
                  {item.imagePreviewUrl && (
                    <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
                      <img src={item.imagePreviewUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <LocationSection
                    locationLevel={item.locationLevel} locationGrid={item.locationGrid}
                    locationDescription={item.locationDescription}
                    onChange={(field, value) => updateItem(idx, { [field]: value })}
                    disabled={item.isSaved}
                  />

                  <TagGrid label="Extent of Defect" value={item.extent} options={EXTENT_OPTIONS} cols={3}
                    onChange={(v) => updateItem(idx, { extent: v })} />

                  {isInProgress && (
                    <AnalysingState
                      status={item.analysisStatus}
                      retryCountdown={retryCountdowns[idx]}
                      queuePosition={item.analysisStatus === 'queued' ? Math.max(0, items.slice(0, idx).filter((it) => it.analysisStatus === 'queued' || it.analysisStatus === 'analysing' || it.analysisStatus === 'retrying').length) : undefined}
                    />
                  )}

                  {isFailed && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-red-800">
                            {item.aiErrorIsRateLimit ? 'AI temporarily rate limited' : 'AI analysis unavailable'}
                          </p>
                          <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                            {item.aiErrorMessage ?? 'Classify this finding manually or retry.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleReanalyse(idx)}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Retry AI Analysis
                      </button>
                      <button
                        onClick={() => {
                          updateItem(idx, {
                            analysisStatus: 'manual',
                            analysisResult: { defect_type: 'Unknown', severity: 'Medium', observation: getObservationTemplate('Unknown'), confidence: 0, needsReview: true },
                          });
                          setOverrideIdx(idx);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        Classify Manually
                      </button>
                    </div>
                  )}

                  {item.analysisStatus === 'idle' && !item.analysisResult && (
                    <div className="space-y-2">
                      <button onClick={() => runAnalysis(idx, item.systemType, item.element, item.imageFile, item.environment, item.observedConcern, item.isNewInstall)}
                        className="w-full flex items-center justify-center gap-2.5 bg-slate-900 text-white py-4 rounded-xl font-bold text-base hover:bg-slate-800 transition-all active:scale-95 shadow-sm">
                        <Zap className="w-5 h-5" />
                        Analyse with Senior Inspector AI
                      </button>
                      <button onClick={() => {
                        updateItem(idx, { analysisStatus: 'manual', analysisResult: { defect_type: 'Unknown', severity: 'Medium', observation: getObservationTemplate('Unknown'), confidence: 0, needsReview: true } });
                        setOverrideIdx(idx);
                      }}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">
                        <Pencil className="w-4 h-4" />
                        Classify Manually
                      </button>
                    </div>
                  )}

                  {!isInProgress && item.analysisResult && (
                    <>
                      <SeniorInspectorCard
                        result={item.analysisResult}
                        defectTypeOverride={item.defectTypeOverride}
                        severityOverride={item.severityOverride}
                        observationOverride={item.observationOverride}
                        inspectorOverride={item.inspectorOverride}
                        analysisStatus={item.analysisStatus}
                        isSaved={item.isSaved}
                        canSave={canSave}
                        onSave={() => handleSave(idx)}
                        onOverride={() => setOverrideIdx(idx)}
                        onReanalyse={item.analysisResult.confidence > 0 && !isInProgress ? () => handleReanalyse(idx) : undefined}
                      />
                      {item.analysisResult.tier_used === 1 && !item.isSaved && !isInProgress && !item.isAnalysing && item.analysisStatus !== 'queued' && (
                        <button
                          onClick={() => runAnalysis(idx, item.systemType, item.element, item.imageFile, item.environment, item.observedConcern, item.isNewInstall, true)}
                          className="w-full flex items-center justify-center gap-2 border border-slate-300 text-slate-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                          <Brain className="w-4 h-4 text-slate-500" />
                          Request Expert Review
                        </button>
                      )}
                    </>
                  )}

                  {item.isSaved && item.savedId && (
                    <div className="border-t border-slate-100 pt-4">
                      <EvidencePhotosPanel
                        itemId={item.savedId}
                        images={evidencePhotos[item.savedId] ?? []}
                        onImagesChange={(imgs) =>
                          setEvidencePhotos((prev) => ({ ...prev, [item.savedId!]: imgs }))
                        }
                      />
                    </div>
                  )}

                  <button onClick={() => handleRemoveItem(idx)}
                    className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-600 text-sm py-2 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    Remove finding
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {savedCount > 0 && reportId && (
          <button onClick={() => setViewingReportId(reportId)}
            className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 text-slate-800 py-4 rounded-2xl font-bold text-base hover:border-slate-400 transition-all active:scale-95 shadow-sm">
            <FileText className="w-5 h-5" />
            View Report ({savedCount} finding{savedCount !== 1 ? 's' : ''})
          </button>
        )}

        {unsavedWithResult.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              {unsavedWithResult.length} finding{unsavedWithResult.length !== 1 ? 's have' : ' has'} not been saved. Expand and tap "Save to Report" before viewing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
