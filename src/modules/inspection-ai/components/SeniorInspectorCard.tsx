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
  BookOpen,
  TrendingUp,
  EyeOff,
  Layers,
  FlaskConical,
  GraduationCap,
  Brain,
  MapPin,
  Eye,
  Flame,
  Zap,
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
    result.remediation_guidance ||
    (visibleEvidence.length > 0) ||
    (geometry && (geometry.location_on_member || geometry.pattern || geometry.extent))
  );
  const geometry = result.geometry;
  const visibleEvidence = result.visible_evidence ?? [];
  const requiresManualReview = result.requires_manual_review;
  const brainMode = result._brainMode;
  const confidenceBoost = result._confidenceBoost ?? 0;
  const triggeredRules = result._triggeredRules ?? [];
  const hiddenRisks = result._hiddenRisks ?? [];
  const complianceConcernLevel = result._complianceConcernLevel;
  const likelyIssueType = result._likelyIssueType;
  const standardsNotes = result._standardsNotes ?? [];
  const manufacturerLogicNotes = result._manufacturerLogicNotes ?? [];
  const intumescentSystemNotes = result._intumescentSystemNotes ?? [];
  const complianceRationale = result._complianceRationale;
  const v3FamilyHint = result._v3FamilyHint as string | undefined;
  const v3FamilyConfidence = result._v3FamilyConfidence as 'low' | 'medium' | 'high' | undefined;
  const v3ReviewTriggers = result._v3ReviewTriggers as string[] | undefined;
  const v3ManufacturerLogicNotes = result._v3ManufacturerLogicNotes as string[] | undefined;
  const v4SuggestedDefect = result._v4SuggestedDefectType as string | undefined;
  const v4MatchCount = result._v4MatchCount as number | undefined;
  const v4CoachingNote = result._v4CoachingNote as string | undefined;
  const v4ConfidenceShift = result._v4ConfidenceShift as number | undefined;
  const hasV4Signal = !!v4MatchCount && v4MatchCount >= 2;
  const [showRules, setShowRules] = useState(false);
  const [showStandards, setShowStandards] = useState(false);
  const [showFamilyDetail, setShowFamilyDetail] = useState(false);

  return (
    <div className="space-y-3">
      {inspectorOverride && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
          <Pencil className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-800 font-semibold">Inspector override applied — classification updated</p>
        </div>
      )}

      {requiresManualReview && !hasOverride && !isManual && result.confidence > 0 && result.confidence < 50 && (
        <div className="flex items-start gap-3 bg-slate-900 border border-slate-700 rounded-xl px-3 py-3">
          <AlertTriangle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Low confidence — inspector verification required</p>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              AI cannot classify with sufficient certainty from this image. Override with your assessment.
            </p>
          </div>
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
              {result.system_type_detected?.toLowerCase().includes('intumescent') && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                  <Flame className="w-2.5 h-2.5" />
                  Intumescent mode
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

            {brainMode && brainMode !== 'ai-only' && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {brainMode === 'ai-rules-agree' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3" />
                    AI + Rulebook agree
                    {confidenceBoost > 0 && <span className="text-emerald-500">+{confidenceBoost}%</span>}
                  </span>
                )}
                {brainMode === 'ai-rules-conflict' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" />
                    AI + Rulebook differ — verify
                  </span>
                )}
                {triggeredRules.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRules((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full transition-colors"
                  >
                    <BookOpen className="w-3 h-3" />
                    {triggeredRules.length} rule{triggeredRules.length !== 1 ? 's' : ''} matched
                    {showRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>
            )}

            {showRules && triggeredRules.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100 mt-1">
                {triggeredRules.map((rule) => (
                  <div key={rule.ruleId} className="px-3 py-2 flex items-start gap-2">
                    <span className="text-[10px] font-bold text-slate-400 font-mono mt-0.5 flex-shrink-0">{String(rule.ruleId)}</span>
                    <span className="text-xs text-slate-700">{String(rule.ruleName)}</span>
                  </div>
                ))}
              </div>
            )}

            {(complianceConcernLevel || likelyIssueType) && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {complianceConcernLevel && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    complianceConcernLevel === 'High'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : complianceConcernLevel === 'Moderate'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {complianceConcernLevel === 'High' && <ShieldAlert className="w-3 h-3" />}
                    {complianceConcernLevel === 'Moderate' && <AlertTriangle className="w-3 h-3" />}
                    {complianceConcernLevel === 'Low' && <ShieldCheck className="w-3 h-3" />}
                    {complianceConcernLevel} concern
                  </span>
                )}
                {likelyIssueType && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    likelyIssueType === 'Systemic'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : likelyIssueType === 'Workmanship'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : likelyIssueType === 'Verification'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {likelyIssueType}
                  </span>
                )}
                {(standardsNotes.length > 0 || manufacturerLogicNotes.length > 0 || intumescentSystemNotes.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setShowStandards((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full transition-colors"
                  >
                    <BookOpen className="w-3 h-3" />
                    Standards
                    {showStandards ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>
            )}

            {showStandards && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100 mt-1">
                {complianceRationale && (
                  <div className="px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Assessment</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{complianceRationale}</p>
                  </div>
                )}
                {standardsNotes.length > 0 && (
                  <div className="px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Standards Reference</p>
                    <ul className="space-y-1.5">
                      {standardsNotes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {manufacturerLogicNotes.length > 0 && (
                  <div className="px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Product Logic</p>
                    <ul className="space-y-1.5">
                      {manufacturerLogicNotes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {intumescentSystemNotes.length > 0 && (
                  <div className="px-3 py-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Intumescent System Notes</p>
                    <ul className="space-y-1.5">
                      {intumescentSystemNotes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-1.5" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {hasV4Signal && (
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <Brain className="w-3.5 h-3.5 text-slate-400" />
                  Brain v4 — Learning Signal
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                  Based on {v4MatchCount} past correction{v4MatchCount !== 1 ? 's' : ''}
                </span>
                {v4ConfidenceShift && v4ConfidenceShift > 0 && (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full">
                    +{v4ConfidenceShift}% confidence
                  </span>
                )}
              </div>
              {v4SuggestedDefect && v4SuggestedDefect !== effectiveDefect && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Common override pattern: senior inspectors often classify this as <strong>{v4SuggestedDefect}</strong>.
                  </p>
                </div>
              )}
              {v4CoachingNote && (
                <p className="text-[11px] text-slate-500 leading-relaxed px-0.5">{v4CoachingNote}</p>
              )}
            </div>
          </div>
        )}

        {v3FamilyHint && (
          <div className="border-t border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Product Family Behaviour
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                <FlaskConical className="w-3 h-3 text-slate-500" />
                {v3FamilyHint === 'waterborne_thinfilm' && 'Waterborne Thin-Film'}
                {v3FamilyHint === 'solventborne_thinfilm' && 'Solventborne Thin-Film'}
                {v3FamilyHint === 'hybrid_fasttrack' && 'Hybrid Fast-Track'}
                {v3FamilyHint === 'epoxy_highdurability' && 'Epoxy / High-Durability'}
              </span>
              {v3FamilyConfidence && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  v3FamilyConfidence === 'high' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : v3FamilyConfidence === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  {v3FamilyConfidence} confidence
                </span>
              )}
              {(v3ReviewTriggers?.length || v3ManufacturerLogicNotes?.length) && (
                <button
                  type="button"
                  onClick={() => setShowFamilyDetail((v) => !v)}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  {showFamilyDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {showFamilyDetail && (
              <div className="mt-2.5 space-y-2">
                {v3ManufacturerLogicNotes && v3ManufacturerLogicNotes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">System Behaviour Notes</p>
                    <ul className="space-y-1.5">
                      {v3ManufacturerLogicNotes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0 mt-1.5" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {v3ReviewTriggers && v3ReviewTriggers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Verification Required</p>
                    <div className="flex flex-wrap gap-1.5">
                      {v3ReviewTriggers.map((t, i) => (
                        <span key={i} className="text-[10px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                          {t.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {hasGuidance && showGuidance && (
          <div className="border-t border-slate-100 bg-slate-50 divide-y divide-slate-100">
            {visibleEvidence.length > 0 && (
              <div className="px-4 py-3 flex items-start gap-2.5">
                <Eye className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Visual Evidence</p>
                  <div className="flex flex-wrap gap-1.5">
                    {visibleEvidence.map((item, i) => (
                      <span key={i} className="inline-block text-[11px] font-medium bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {geometry && (geometry.location_on_member || geometry.pattern || geometry.extent) && (
              <div className="px-4 py-3 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Defect Location & Pattern</p>
                  <div className="space-y-1.5">
                    {geometry.location_on_member && (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-16 flex-shrink-0 pt-0.5">Location</span>
                        <span className="text-xs text-slate-700 leading-relaxed">{geometry.location_on_member}</span>
                      </div>
                    )}
                    {geometry.pattern && (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-16 flex-shrink-0 pt-0.5">Pattern</span>
                        <span className="text-xs text-slate-700 leading-relaxed">{geometry.pattern}</span>
                      </div>
                    )}
                    {geometry.extent && (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-16 flex-shrink-0 pt-0.5">Extent</span>
                        <span className="text-xs text-slate-700 leading-relaxed">{geometry.extent}</span>
                      </div>
                    )}
                    {geometry.likely_mechanism && (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide w-16 flex-shrink-0 pt-0.5">Mechanism</span>
                        <span className="text-xs text-slate-700 leading-relaxed">{geometry.likely_mechanism}</span>
                      </div>
                    )}
                    {geometry.urgent_action && (
                      <div className="flex items-start gap-2 mt-1 pt-1.5 border-t border-slate-200">
                        <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-semibold text-amber-800 leading-relaxed">{geometry.urgent_action}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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

            {hiddenRisks.length > 0 && (
              <div className="px-4 py-3 flex items-start gap-2.5">
                <EyeOff className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Hidden Risks</p>
                  <ul className="space-y-1">
                    {hiddenRisks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-red-700 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                        {risk}
                      </li>
                    ))}
                  </ul>
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
