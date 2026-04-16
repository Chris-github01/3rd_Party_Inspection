import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  ClipboardList,
  Lightbulb,
  Wrench,
  Clock,
  WifiOff,
} from 'lucide-react';
import { useState } from 'react';
import type { AIAnalysisResult, Severity } from '../types';
import { CONFIDENCE_REVIEW_THRESHOLD } from '../services/inspectionAIService';

const SEVERITY_STYLES: Record<string, { badge: string; bar: string; ring: string }> = {
  High:   { badge: 'bg-red-100 text-red-800 border-red-200',     bar: 'bg-red-500',     ring: 'ring-red-200' },
  Medium: { badge: 'bg-amber-100 text-amber-800 border-amber-200', bar: 'bg-amber-500', ring: 'ring-amber-200' },
  Low:    { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-500', ring: 'ring-emerald-200' },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const styles = SEVERITY_STYLES;
  const colour = pct >= 70 ? styles.Low.bar : pct >= 50 ? styles.Medium.bar : styles.High.bar;
  const label = pct >= 70 ? 'High confidence' : pct >= 50 ? 'Medium confidence' : 'Low confidence';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">AI Confidence</span>
        <span className="text-[11px] font-bold text-slate-600">{pct}% · {label}</span>
      </div>
      <div className="bg-slate-200 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface SeniorInspectorCardProps {
  result: AIAnalysisResult;
  defectTypeOverride?: string | null;
  severityOverride?: string | null;
  observationOverride?: string | null;
  inspectorOverride?: boolean;
  analysisStatus: string;
  isSaved: boolean;
  canSave: boolean;
  onSave: () => void;
  onOverride: () => void;
  onReanalyse?: () => void;
}

export function SeniorInspectorCard({
  result,
  defectTypeOverride,
  severityOverride,
  observationOverride,
  inspectorOverride,
  analysisStatus,
  isSaved,
  canSave,
  onSave,
  onOverride,
  onReanalyse,
}: SeniorInspectorCardProps) {
  const [showGuidance, setShowGuidance] = useState(true);

  const effectiveDefect = defectTypeOverride ?? result.defect_type;
  const effectiveSeverity = (severityOverride ?? result.severity) as Severity;
  const effectiveObservation = observationOverride ?? result.observation;
  const hasOverride = !!(defectTypeOverride || severityOverride || observationOverride);
  const isManual = analysisStatus === 'manual';
  const sev = SEVERITY_STYLES[effectiveSeverity] ?? SEVERITY_STYLES.Low;
  const showReasoning = !isManual && result.confidence > 0;
  const hasGuidance = showReasoning && (
    (result.next_checks && result.next_checks.length > 0) ||
    result.likely_cause ||
    result.remediation_guidance
  );

  return (
    <div className="space-y-3">
      {inspectorOverride && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
          <Pencil className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-800 font-semibold">Inspector override applied — classification updated</p>
        </div>
      )}

      {result.escalate && !hasOverride && !isManual && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-3 py-3">
          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-800">Senior Review Required</p>
            <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
              {result.escalation_reason || 'Confidence below threshold or critical defect detected.'}
            </p>
          </div>
        </div>
      )}

      {result.needsReview && !hasOverride && !result.escalate && result.confidence > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium">Confidence below 70% — verify classification before saving.</p>
        </div>
      )}

      {isManual && !inspectorOverride && (
        <div className="flex items-start gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-3 py-3">
          <WifiOff className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-orange-800 font-medium">AI unavailable — classify manually using Inspector Override.</p>
        </div>
      )}

      <div className={`rounded-2xl border-2 overflow-hidden ${sev.ring} ring-1`} style={{ borderColor: 'transparent' }}>
        <div className="bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sev.badge}`}>
                {effectiveSeverity}
              </span>
              {!result.escalate || hasOverride ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  Classified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                  <ShieldAlert className="w-3 h-3" />
                  Needs review
                </span>
              )}
            </div>
            {hasGuidance && (
              <button
                onClick={() => setShowGuidance(v => !v)}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showGuidance ? 'Less' : 'Guidance'}
                {showGuidance ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <div className="px-4 pt-3 pb-1">
            <p className="font-bold text-slate-900 text-base leading-tight">{effectiveDefect}</p>
          </div>

          <div className="px-4 pb-3 space-y-2.5">
            <p className="text-sm text-slate-600 leading-relaxed">{effectiveObservation}</p>

            {result.confidence > 0 && <ConfidenceBar value={result.confidence} />}
          </div>
        </div>

        {hasGuidance && showGuidance && (
          <div className="border-t border-slate-100 bg-slate-50 divide-y divide-slate-100">
            {result.likely_cause && (
              <div className="px-4 py-3 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Likely Cause</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{result.likely_cause}</p>
                </div>
              </div>
            )}

            {result.next_checks && result.next_checks.length > 0 && (
              <div className="px-4 py-3 flex items-start gap-2.5">
                <ClipboardList className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Next Checks</p>
                  <ul className="space-y-1">
                    {result.next_checks.map((check, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                        {check}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {result.remediation_guidance && (
              <div className="px-4 py-3 flex items-start gap-2.5">
                <Wrench className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Recommended Action</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{result.remediation_guidance}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!isSaved && (
        <button
          onClick={onOverride}
          className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <Pencil className="w-4 h-4" />
          {hasOverride ? 'Edit Override' : 'Inspector Override'}
        </button>
      )}

      {isSaved ? (
        <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm py-3 bg-emerald-50 rounded-xl border border-emerald-200">
          <CheckCircle className="w-4 h-4" />
          Saved to report
        </div>
      ) : (
        <button
          onClick={onSave}
          disabled={!canSave}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-sm disabled:opacity-40"
        >
          <Save className="w-4 h-4" />
          Save to Report
        </button>
      )}

      {!isSaved && result.confidence > 0 && onReanalyse && (
        <button
          onClick={onReanalyse}
          className="w-full flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs py-2 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Re-analyse
        </button>
      )}
    </div>
  );
}

export function AnalysingState({ status }: { status: string }) {
  const messages: Record<string, string> = {
    queued:    'Queued — waiting for previous analysis…',
    analysing: 'Senior Inspector AI is reviewing…',
    retrying:  'Rate limited — retrying in 3s…',
  };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
        {status === 'queued' ? (
          <Clock className="w-6 h-6 text-slate-400 animate-pulse" />
        ) : (
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        )}
      </div>
      <div>
        <p className="font-semibold text-slate-700 text-sm">{messages[status] ?? 'Analysing…'}</p>
        <p className="text-xs text-slate-400 mt-1">You can keep adding photos while this runs</p>
      </div>
    </div>
  );
}
