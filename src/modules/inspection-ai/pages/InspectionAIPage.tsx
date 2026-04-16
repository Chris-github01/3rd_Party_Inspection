import { useState, useRef, useCallback, useEffect } from 'react';
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
} from 'lucide-react';
import { analyseImage } from '../services/inspectionAIService';
import { uploadInspectionImage, createReport, saveInspectionItem } from '../services/storageService';
import { generateNonConformance } from '../utils/standardsMapper';
import { generateRecommendation, generateRisk } from '../utils/reportGenerator';
import { DEFECT_TYPES } from '../utils/defectDictionary';
import { getObservationTemplate } from '../utils/observationTemplates';
import { InspectionReportView } from '../components/InspectionReportView';
import type { CapturedItem, AppPhase, SystemType, ElementType, Severity, Extent } from '../types';

const SYSTEM_TYPES: SystemType[] = ['Intumescent', 'Cementitious', 'Protective Coating', 'Firestopping'];
const ELEMENT_TYPES: ElementType[] = ['Beam', 'Column', 'Slab', 'Penetration', 'Other'];
const EXTENT_OPTIONS: Extent[] = ['Localised', 'Moderate', 'Widespread'];
const SEVERITIES: Severity[] = ['Low', 'Medium', 'High'];

const LS_PROJECT_KEY = 'inspection_ai_project_name';
const LS_INSPECTOR_KEY = 'inspection_ai_inspector_name';
const LS_SYSTEM_KEY = 'inspection_ai_system_type';
const LS_ELEMENT_KEY = 'inspection_ai_element_type';

function TagGrid<T extends string>({
  label,
  value,
  options,
  onChange,
  cols = 2,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
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
  locationLevel,
  locationGrid,
  locationDescription,
  onChange,
  disabled,
}: {
  locationLevel: string;
  locationGrid: string;
  locationDescription: string;
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
          <input
            type="text"
            value={locationLevel}
            onChange={(e) => onChange('locationLevel', e.target.value)}
            placeholder="e.g. Level 3"
            disabled={disabled}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent placeholder-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-400">Grid Ref</label>
          <input
            type="text"
            value={locationGrid}
            onChange={(e) => onChange('locationGrid', e.target.value)}
            placeholder="e.g. B4"
            disabled={disabled}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent placeholder-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="block text-xs text-slate-400">Description</label>
        <input
          type="text"
          value={locationDescription}
          onChange={(e) => onChange('locationDescription', e.target.value)}
          placeholder="e.g. North face secondary beam, approx. 200mm from connection"
          disabled={disabled}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent placeholder-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>
    </div>
  );
}

function InspectorOverridePanel({
  item,
  onUpdate,
  onClose,
}: {
  item: CapturedItem;
  onUpdate: (patch: Partial<CapturedItem>) => void;
  onClose: () => void;
}) {
  const [defectType, setDefectType] = useState(item.defectTypeOverride ?? item.analysisResult?.defect_type ?? '');
  const [severity, setSeverity] = useState<Severity>(
    (item.severityOverride as Severity) ?? (item.analysisResult?.severity ?? 'Low')
  );
  const [observation, setObservation] = useState(
    item.observationOverride ?? item.analysisResult?.observation ?? ''
  );

  const handleDefectTypeChange = (newDefect: string) => {
    setDefectType(newDefect);
    const template = getObservationTemplate(newDefect);
    if (template && observation === (item.observationOverride ?? item.analysisResult?.observation ?? '')) {
      setObservation(template);
    }
  };

  const handleApplyTemplate = () => {
    const template = getObservationTemplate(defectType);
    if (template) setObservation(template);
  };

  const handleApply = () => {
    const aiDefect = item.analysisResult?.defect_type ?? '';
    const aiSeverity = item.analysisResult?.severity ?? 'Low';
    const aiObs = item.analysisResult?.observation ?? '';
    const hasChange = defectType !== aiDefect || severity !== aiSeverity || observation !== aiObs;
    onUpdate({
      defectTypeOverride: defectType !== aiDefect ? defectType : null,
      severityOverride: severity !== aiSeverity ? severity : null,
      observationOverride: observation !== aiObs ? observation : null,
      inspectorOverride: hasChange,
    });
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Override the AI classification with your professional assessment. Overrides are flagged in the report.
        </p>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Defect Type</label>
          <select
            value={defectType}
            onChange={(e) => handleDefectTypeChange(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 bg-white"
          >
            {DEFECT_TYPES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
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
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${colours[s]}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Observation</label>
            {templateText && observation !== templateText && (
              <button
                type="button"
                onClick={handleApplyTemplate}
                className="text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors flex items-center gap-1"
              >
                Use template
              </button>
            )}
          </div>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            rows={4}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 resize-none"
          />
          {templateText && (
            <p className="text-xs text-slate-400 leading-relaxed italic">
              Template: "{templateText}"
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleClear}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Clear Override
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InspectionAIPage() {
  const [phase, setPhase] = useState<AppPhase>('setup');
  const [projectName, setProjectName] = useState(() => localStorage.getItem(LS_PROJECT_KEY) ?? '');
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [startingSession, setStartingSession] = useState(false);

  useEffect(() => { localStorage.setItem(LS_PROJECT_KEY, projectName); }, [projectName]);
  useEffect(() => { localStorage.setItem(LS_INSPECTOR_KEY, inspectorName); }, [inspectorName]);
  useEffect(() => { localStorage.setItem(LS_SYSTEM_KEY, sessionSystemType); }, [sessionSystemType]);
  useEffect(() => { localStorage.setItem(LS_ELEMENT_KEY, sessionElement); }, [sessionElement]);

  const handleStartInspection = async () => {
    if (!projectName.trim() || !inspectorName.trim()) return;
    setStartingSession(true);
    try {
      const r = await createReport(projectName.trim(), inspectorName.trim());
      setReportId(r.id);
      setPhase('capture');
    } finally {
      setStartingSession(false);
    }
  };

  const runAnalysis = useCallback(async (
    idx: number,
    systemType: SystemType,
    element: ElementType,
    imageFile: File
  ) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, isAnalysing: true } : item));
    try {
      const result = await analyseImage(imageFile, systemType, element);
      const nc = generateNonConformance(result.defect_type, element);
      const rec = generateRecommendation(result.defect_type, systemType);
      const risk = generateRisk(result.severity as Severity);
      setItems((prev) =>
        prev.map((item, i) =>
          i === idx
            ? { ...item, analysisResult: result, nonConformance: nc, recommendation: rec, risk, isAnalysing: false }
            : item
        )
      );
    } catch (err) {
      console.error('Analysis error:', err);
      setItems((prev) => prev.map((item, i) => i === idx ? { ...item, isAnalysing: false } : item));
      alert('Analysis failed. Please check your connection and try again.');
    }
  }, []);

  const addImageFromFile = useCallback(
    (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      const newItem: CapturedItem = {
        imageFile: file,
        imagePreviewUrl: previewUrl,
        annotatedImageUrl: null,
        systemType: sessionSystemType,
        element: sessionElement,
        locationLevel: '',
        locationGrid: '',
        locationDescription: '',
        extent: 'Localised',
        analysisResult: null,
        nonConformance: '',
        recommendation: '',
        risk: '',
        defectTypeOverride: null,
        severityOverride: null,
        observationOverride: null,
        inspectorOverride: false,
        isAnalysing: false,
        isSaved: false,
      };
      setItems((prev) => {
        const next = [...prev, newItem];
        const newIdx = next.length - 1;
        setActiveIdx(newIdx);
        setTimeout(() => runAnalysis(newIdx, sessionSystemType, sessionElement, file), 0);
        return next;
      });
    },
    [sessionSystemType, sessionElement, runAnalysis]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addImageFromFile(file);
    e.target.value = '';
  };

  const updateItem = (idx: number, patch: Partial<CapturedItem>) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));
  };

  const handleReanalyse = (idx: number) => {
    const item = items[idx];
    if (!item || item.isAnalysing) return;
    updateItem(idx, {
      analysisResult: null,
      nonConformance: '',
      recommendation: '',
      risk: '',
      defectTypeOverride: null,
      severityOverride: null,
      observationOverride: null,
      inspectorOverride: false,
      isSaved: false,
    });
    runAnalysis(idx, item.systemType, item.element, item.imageFile);
  };

  const handleSave = async (idx: number) => {
    const item = items[idx];
    if (!item?.analysisResult || !reportId || item.isSaved) return;

    const effectiveDefect = item.defectTypeOverride ?? item.analysisResult.defect_type;
    const effectiveSeverity = item.severityOverride ?? item.analysisResult.severity;
    const effectiveObservation = item.observationOverride ?? item.analysisResult.observation;

    const nc = generateNonConformance(effectiveDefect, item.element);
    const rec = generateRecommendation(effectiveDefect, item.systemType);
    const risk = generateRisk(effectiveSeverity as Severity);

    try {
      const imageUrl = await uploadInspectionImage(item.imageFile, reportId);
      const saved = await saveInspectionItem({
        report_id: reportId,
        image_url: imageUrl,
        system_type: item.systemType,
        element: item.element,
        defect_type: effectiveDefect,
        severity: effectiveSeverity,
        observation: effectiveObservation,
        non_conformance: nc,
        recommendation: rec,
        risk,
        confidence: item.analysisResult.confidence,
        location_level: item.locationLevel,
        location_grid: item.locationGrid,
        location_description: item.locationDescription,
        extent: item.extent,
        defect_type_override: item.defectTypeOverride,
        severity_override: item.severityOverride,
        observation_override: item.observationOverride,
        inspector_override: item.inspectorOverride,
        annotated_image_url: item.annotatedImageUrl,
      });
      updateItem(idx, { isSaved: true, savedId: saved.id, savedImageUrl: imageUrl });
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save finding. Please try again.');
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

  if (viewingReportId) {
    return <InspectionReportView reportId={viewingReportId} onBack={() => setViewingReportId(null)} />;
  }

  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
        <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
          <div className="mb-10">
            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Inspection AI</h1>
            <p className="text-slate-400 text-base leading-relaxed">
              Capture photos, classify defects with AI, and generate standards-aligned inspection reports.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. 35 Walmsley Road"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Inspector Name</label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-300"
              />
            </div>
            <button
              onClick={handleStartInspection}
              disabled={!projectName.trim() || !inspectorName.trim() || startingSession}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-slate-800 transition-all active:scale-98 shadow-sm"
            >
              {startingSession ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Start Inspection <ChevronRight className="w-5 h-5" /></>
              )}
            </button>
          </div>

          <p className="text-center text-slate-500 text-xs mt-6">
            Visual inspection only · No compliance certification
          </p>
        </div>
      </div>
    );
  }

  const savedCount = items.filter((i) => i.isSaved).length;
  const unsavedAnalysed = items.filter((i) => i.analysisResult && !i.isSaved);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {overrideIdx !== null && items[overrideIdx] && (
        <InspectorOverridePanel
          item={items[overrideIdx]}
          onUpdate={(patch) => updateItem(overrideIdx, patch)}
          onClose={() => setOverrideIdx(null)}
        />
      )}

      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setPhase('setup')}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Setup</span>
          </button>
          <div className="text-center">
            <p className="font-bold text-slate-900 text-sm leading-tight truncate max-w-[160px]">{projectName}</p>
            <p className="text-xs text-slate-500">{items.length} captured · {savedCount} saved</p>
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

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <TagGrid label="System Type" value={sessionSystemType} options={SYSTEM_TYPES} onChange={setSessionSystemType} />
          <TagGrid label="Element" value={sessionElement} options={ELEMENT_TYPES} onChange={setSessionElement} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 bg-slate-900 text-white py-5 rounded-2xl font-semibold text-sm shadow-sm hover:bg-slate-800 transition-all active:scale-95"
          >
            <Camera className="w-7 h-7" />
            Take Photo
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 bg-white text-slate-700 py-5 rounded-2xl font-semibold text-sm border border-slate-200 hover:border-slate-400 transition-all active:scale-95"
          >
            <Upload className="w-7 h-7" />
            Upload Image
          </button>
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        {items.length === 0 && (
          <div className="text-center py-14 text-slate-400">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium">No photos yet</p>
            <p className="text-sm mt-1">Take a photo — analysis starts automatically</p>
          </div>
        )}

        {items.map((item, idx) => {
          const effectiveDefect = item.defectTypeOverride ?? item.analysisResult?.defect_type;
          const effectiveSeverity = item.severityOverride ?? item.analysisResult?.severity;
          const hasOverride = !!(item.defectTypeOverride || item.severityOverride || item.observationOverride);

          return (
            <div
              key={idx}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                activeIdx === idx ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
              }`}
            >
              <button className="w-full text-left" onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}>
                <div className="flex items-center gap-3 p-4">
                  {item.imagePreviewUrl && (
                    <img src={item.imagePreviewUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-slate-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">Finding {idx + 1}</p>
                      {effectiveSeverity && <SeverityBadge severity={effectiveSeverity} />}
                      {item.extent !== 'Localised' && <ExtentBadge extent={item.extent} />}
                      {hasOverride && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                          Overridden
                        </span>
                      )}
                      {item.analysisResult?.needsReview && !hasOverride && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Review
                        </span>
                      )}
                      {item.isSaved && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                      {item.isAnalysing && <Loader2 className="w-4 h-4 text-slate-400 animate-spin flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {item.systemType} · {item.element}
                      {effectiveDefect ? ` · ${effectiveDefect}` : item.isAnalysing ? ' · Analysing…' : ' · Pending'}
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
                    locationLevel={item.locationLevel}
                    locationGrid={item.locationGrid}
                    locationDescription={item.locationDescription}
                    onChange={(field, value) => updateItem(idx, { [field]: value })}
                    disabled={item.isSaved}
                  />

                  <TagGrid
                    label="Extent of Defect"
                    value={item.extent}
                    options={EXTENT_OPTIONS}
                    cols={3}
                    onChange={(v) => updateItem(idx, { extent: v })}
                  />

                  {item.isAnalysing && (
                    <div className="flex items-center justify-center gap-3 py-6 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="font-medium">Analysing image…</span>
                    </div>
                  )}

                  {!item.isAnalysing && !item.analysisResult && (
                    <button
                      onClick={() => runAnalysis(idx, item.systemType, item.element, item.imageFile)}
                      className="w-full flex items-center justify-center gap-2.5 bg-red-600 text-white py-4 rounded-xl font-bold text-base hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                    >
                      <Zap className="w-5 h-5" />
                      Analyse Image
                    </button>
                  )}

                  {!item.isAnalysing && item.analysisResult && (
                    <div className="space-y-4">
                      {item.analysisResult.needsReview && !hasOverride && (
                        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-amber-800">Manual Review Recommended</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              AI confidence is below 70%. Verify the finding or use Inspector Override.
                            </p>
                          </div>
                        </div>
                      )}

                      {hasOverride && (
                        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3">
                          <Pencil className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-800 font-medium">
                            Inspector override applied. AI classification has been modified.
                          </p>
                        </div>
                      )}

                      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 text-sm">
                            {item.defectTypeOverride ?? item.analysisResult.defect_type}
                          </p>
                          <SeverityBadge severity={item.severityOverride ?? item.analysisResult.severity} />
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Observation</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {item.observationOverride ?? item.analysisResult.observation}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                            AI Confidence: {Math.round(item.analysisResult.confidence)}%
                          </p>
                          <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                item.analysisResult.confidence >= 70
                                  ? 'bg-emerald-500'
                                  : item.analysisResult.confidence >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${item.analysisResult.confidence}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {!item.isSaved && (
                        <button
                          onClick={() => setOverrideIdx(idx)}
                          className="w-full flex items-center justify-center gap-2 border border-slate-300 text-slate-700 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          {hasOverride ? 'Edit Override' : 'Inspector Override'}
                        </button>
                      )}

                      {item.isSaved ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold text-sm py-3">
                          <CheckCircle className="w-5 h-5" />
                          Saved to report
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSave(idx)}
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-xl font-bold text-base hover:bg-emerald-700 transition-all active:scale-95 shadow-sm"
                        >
                          <Plus className="w-5 h-5" />
                          Save to Report
                        </button>
                      )}

                      <button
                        onClick={() => handleReanalyse(idx)}
                        className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 text-sm py-2 transition-colors"
                      >
                        Re-analyse
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleRemoveItem(idx)}
                    className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-600 text-sm py-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove finding
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {savedCount > 0 && reportId && (
          <button
            onClick={() => setViewingReportId(reportId)}
            className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 text-slate-800 py-4 rounded-2xl font-bold text-base hover:border-slate-400 transition-all active:scale-95 shadow-sm"
          >
            <FileText className="w-5 h-5" />
            View Report ({savedCount} finding{savedCount !== 1 ? 's' : ''})
          </button>
        )}

        {unsavedAnalysed.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              {unsavedAnalysed.length} finding{unsavedAnalysed.length !== 1 ? 's have' : ' has'} not been saved. Tap "Save to Report" before viewing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
