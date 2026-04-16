import { useState, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { analyseImage } from '../services/inspectionAIService';
import { uploadInspectionImage, createReport, saveInspectionItem } from '../services/storageService';
import { generateNonConformance } from '../utils/standardsMapper';
import { generateRecommendation, generateRisk } from '../utils/reportGenerator';
import { InspectionReportView } from '../components/InspectionReportView';
import type { CapturedItem, AppPhase, SystemType, ElementType, Severity } from '../types';

const SYSTEM_TYPES: SystemType[] = ['Intumescent', 'Cementitious', 'Protective Coating', 'Firestopping'];
const ELEMENT_TYPES: ElementType[] = ['Beam', 'Column', 'Slab', 'Penetration', 'Other'];

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`py-3 px-3 rounded-xl text-sm font-medium border transition-all active:scale-95 ${
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

export default function InspectionAIPage() {
  const [phase, setPhase] = useState<AppPhase>('setup');
  const [projectName, setProjectName] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);

  const [items, setItems] = useState<CapturedItem[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [startingSession, setStartingSession] = useState(false);

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

  const addImageFromFile = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const newItem: CapturedItem = {
      imageFile: file,
      imagePreviewUrl: previewUrl,
      systemType: 'Intumescent',
      element: 'Beam',
      analysisResult: null,
      nonConformance: '',
      recommendation: '',
      risk: '',
      isAnalysing: false,
      isSaved: false,
    };
    setItems((prev) => {
      const next = [...prev, newItem];
      setActiveIdx(next.length - 1);
      return next;
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addImageFromFile(file);
    e.target.value = '';
  };

  const updateItem = (idx: number, patch: Partial<CapturedItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const handleAnalyse = async (idx: number) => {
    const item = items[idx];
    if (!item || item.isAnalysing || !reportId) return;

    updateItem(idx, { isAnalysing: true });

    try {
      const result = await analyseImage(item.imageFile, item.systemType, item.element);
      const nc = generateNonConformance(result.defect_type, item.element);
      const rec = generateRecommendation(result.defect_type, item.systemType);
      const risk = generateRisk(result.severity as Severity);

      updateItem(idx, {
        analysisResult: result,
        nonConformance: nc,
        recommendation: rec,
        risk,
        isAnalysing: false,
      });
    } catch (err) {
      console.error('Analysis error:', err);
      updateItem(idx, { isAnalysing: false });
      alert('Analysis failed. Please check your connection and try again.');
    }
  };

  const handleSave = async (idx: number) => {
    const item = items[idx];
    if (!item?.analysisResult || !reportId || item.isSaved) return;

    try {
      const imageUrl = await uploadInspectionImage(item.imageFile, reportId);
      const saved = await saveInspectionItem({
        report_id: reportId,
        image_url: imageUrl,
        system_type: item.systemType,
        element: item.element,
        defect_type: item.analysisResult.defect_type,
        severity: item.analysisResult.severity,
        observation: item.analysisResult.observation,
        non_conformance: item.nonConformance,
        recommendation: item.recommendation,
        risk: item.risk,
        confidence: item.analysisResult.confidence,
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
    return (
      <InspectionReportView
        reportId={viewingReportId}
        onBack={() => setViewingReportId(null)}
      />
    );
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
              Capture photos, identify defects with AI, and generate professional inspection reports.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. 35 Walmsley Road"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder-slate-300"
              />
            </div>

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
              onClick={handleStartInspection}
              disabled={!projectName.trim() || !inspectorName.trim() || startingSession}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-slate-800 transition-all active:scale-98 shadow-sm"
            >
              {startingSession ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Start Inspection
                  <ChevronRight className="w-5 h-5" />
                </>
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
            <p className="font-bold text-slate-900 text-sm leading-tight">{projectName}</p>
            <p className="text-xs text-slate-500">{items.length} finding{items.length !== 1 ? 's' : ''} captured</p>
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

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5">
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

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {items.length === 0 && (
          <div className="text-center py-14 text-slate-400">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium">No photos yet</p>
            <p className="text-sm mt-1">Take a photo or upload an image to begin</p>
          </div>
        )}

        {items.map((item, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
              activeIdx === idx ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
            }`}
          >
            <button
              className="w-full text-left"
              onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
            >
              <div className="flex items-center gap-3 p-4">
                {item.imagePreviewUrl && (
                  <img
                    src={item.imagePreviewUrl}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-slate-100"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 text-sm">Finding {idx + 1}</p>
                    {item.analysisResult && <SeverityBadge severity={item.analysisResult.severity} />}
                    {item.isSaved && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    {item.isAnalysing && <Loader2 className="w-4 h-4 text-slate-400 animate-spin flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {item.systemType} · {item.element}
                    {item.analysisResult ? ` · ${item.analysisResult.defect_type}` : ''}
                  </p>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${activeIdx === idx ? 'rotate-90' : ''}`}
                />
              </div>
            </button>

            {activeIdx === idx && (
              <div className="border-t border-slate-100 p-4 space-y-5">
                {item.imagePreviewUrl && (
                  <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden">
                    <img src={item.imagePreviewUrl} alt="" className="w-full h-full object-contain" />
                  </div>
                )}

                <Select
                  label="System Type"
                  value={item.systemType}
                  options={SYSTEM_TYPES}
                  onChange={(v) => updateItem(idx, { systemType: v })}
                />

                <Select
                  label="Element"
                  value={item.element}
                  options={ELEMENT_TYPES}
                  onChange={(v) => updateItem(idx, { element: v })}
                />

                {!item.analysisResult ? (
                  <button
                    onClick={() => handleAnalyse(idx)}
                    disabled={item.isAnalysing}
                    className="w-full flex items-center justify-center gap-2.5 bg-red-600 text-white py-4 rounded-xl font-bold text-base disabled:opacity-60 hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                  >
                    {item.isAnalysing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analysing…
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Analyse Image
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-900 text-sm capitalize">
                          {item.analysisResult.defect_type}
                        </p>
                        <SeverityBadge severity={item.analysisResult.severity} />
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          Observation
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {item.analysisResult.observation}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          Non-Conformance
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">{item.nonConformance}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          Recommendation
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">{item.recommendation}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          Risk
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">{item.risk}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                          Confidence: {Math.round(item.analysisResult.confidence)}%
                        </p>
                        <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              item.analysisResult.confidence >= 75
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
                      onClick={() => updateItem(idx, { analysisResult: null, nonConformance: '', recommendation: '', risk: '', isSaved: false })}
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
        ))}

        {items.length > 0 && reportId && (
          <button
            onClick={() => setViewingReportId(reportId)}
            className="w-full flex items-center justify-center gap-2.5 bg-white border border-slate-200 text-slate-800 py-4 rounded-2xl font-bold text-base hover:border-slate-400 transition-all active:scale-95 shadow-sm"
          >
            <FileText className="w-5 h-5" />
            View Report ({items.filter(i => i.isSaved).length} saved)
          </button>
        )}

        {items.some(i => i.analysisResult && !i.isSaved) && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              You have unsaved findings. Tap "Save to Report" on each analysed finding before viewing the report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
