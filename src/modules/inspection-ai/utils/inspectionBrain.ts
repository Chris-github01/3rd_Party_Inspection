import { runRulebook } from './inspectionRulebook';
import { runRulebookV2 } from './inspectionRulebookV2';
import { runInspectionRulebookV3, deriveVisualCuesFromAI } from './inspectionRulebookV3';
import type { AIAnalysisResult, CaptureIntakeContext, Severity } from '../types';
import type { RulebookResult } from './inspectionRulebook';
import type { V2RulebookResult } from './inspectionRulebookV2';
import type { RulebookV3Result } from './inspectionRulebookV3';

export interface BrainResult {
  defect_type: string;
  severity: Severity;
  observation: string;
  confidence: number;
  needsReview: boolean;
  likely_cause: string;
  next_checks: string[];
  escalate: boolean;
  escalation_reason: string;
  remediation_guidance: string;
  rulebook: RulebookResult;
  rulebookV2: V2RulebookResult;
  rulebookV3: RulebookV3Result;
  brainMode: 'ai-only' | 'rules-only' | 'ai-rules-agree' | 'ai-rules-conflict';
  confidenceBoost: number;
}

const SEVERITY_RANK: Record<Severity, number> = { Low: 1, Medium: 2, High: 3 };

function rankSeverity(s: string): number {
  return SEVERITY_RANK[s as Severity] ?? 2;
}

function resolvedSeverity(ai: Severity, rulebookRecommended: Severity | null, modifier: 'upgrade' | 'downgrade' | 'none'): Severity {
  if (!rulebookRecommended && modifier === 'none') return ai;
  const aiRank = rankSeverity(ai);
  if (modifier === 'upgrade' && aiRank < 3) {
    const candidates: Severity[] = ['Low', 'Medium', 'High'];
    return candidates[Math.min(aiRank, 2)] as Severity;
  }
  if (modifier === 'downgrade' && aiRank > 1) {
    const candidates: Severity[] = ['Low', 'Medium', 'High'];
    return candidates[Math.max(aiRank - 2, 0)] as Severity;
  }
  return ai;
}

export function applyInspectionBrain(
  aiResult: AIAnalysisResult,
  ctx: CaptureIntakeContext
): BrainResult {
  const rulebookInput = {
    systemType: ctx.systemType,
    element: ctx.element,
    environment: ctx.environment,
    observedConcern: ctx.observedConcern,
    isNewInstall: ctx.isNewInstall,
    aiDefectType: aiResult.defect_type,
    aiObservation: aiResult.observation,
  };

  const rulebook = runRulebook(rulebookInput);
  const rulebookV2 = runRulebookV2(rulebookInput);

  const visualCues = deriveVisualCuesFromAI(
    ctx.systemType,
    ctx.observedConcern,
    aiResult.defect_type,
    aiResult.observation
  );
  const rulebookV3 = runInspectionRulebookV3({
    systemType: ctx.systemType,
    elementType: ctx.element,
    environment: ctx.environment,
    age: ctx.isNewInstall ? 'New' : 'Unknown',
    observedConcern: ctx.observedConcern,
    aiDefectType: aiResult.defect_type,
    aiSeverity: aiResult.severity,
    visualCues,
  });

  const hasRules = rulebook.triggeredRules.length > 0;

  if (!hasRules) {
    return {
      defect_type: aiResult.defect_type,
      severity: aiResult.severity,
      observation: aiResult.observation,
      confidence: aiResult.confidence,
      needsReview: aiResult.needsReview,
      likely_cause: aiResult.likely_cause ?? '',
      next_checks: aiResult.next_checks ?? [],
      escalate: aiResult.escalate ?? false,
      escalation_reason: aiResult.escalation_reason ?? '',
      remediation_guidance: aiResult.remediation_guidance ?? '',
      rulebook,
      rulebookV2,
      rulebookV3,
      brainMode: 'ai-only',
      confidenceBoost: 0,
    };
  }

  const aiDefect = (aiResult.defect_type ?? '').toLowerCase();
  const ruleDefect = (rulebook.recommendedDefect ?? '').toLowerCase();
  const defectsAgree =
    aiDefect.length > 0 &&
    ruleDefect.length > 0 &&
    (aiDefect.includes(ruleDefect.split(' ')[0]) || ruleDefect.includes(aiDefect.split(' ')[0]));

  const aiSevRank = rankSeverity(aiResult.severity);
  const ruleSevRank = rankSeverity(rulebook.recommendedSeverity ?? aiResult.severity);
  const severitiesAgree = Math.abs(aiSevRank - ruleSevRank) <= 1;

  const aiEscalate = aiResult.escalate ?? false;
  const ruleEscalate = rulebook.escalate;

  const fullAgreement = defectsAgree && severitiesAgree && aiEscalate === ruleEscalate;
  const brainMode = !hasRules ? 'ai-only' : fullAgreement ? 'ai-rules-agree' : 'ai-rules-conflict';

  let confidenceBoost = 0;
  if (fullAgreement) confidenceBoost = 12;
  else if (defectsAgree) confidenceBoost = 6;
  else if (!defectsAgree && severitiesAgree) confidenceBoost = -5;
  else confidenceBoost = -10;

  if (rulebookV2.complianceConcernLevel === 'High' && !fullAgreement) confidenceBoost -= 3;
  if (rulebookV2.likelyIssueType === 'Systemic') confidenceBoost -= 2;
  confidenceBoost += Math.max(-8, Math.min(10, rulebookV3.confidenceModifier));

  const finalConfidence = Math.max(10, Math.min(99, aiResult.confidence + confidenceBoost));

  const finalSeverity: Severity = resolvedSeverity(
    aiResult.severity,
    rulebook.recommendedSeverity,
    rulebook.triggeredRules.some((r) => r.severityModifier === 'upgrade')
      ? 'upgrade'
      : rulebook.triggeredRules.some((r) => r.severityModifier === 'downgrade')
      ? 'downgrade'
      : 'none'
  );

  const finalEscalate = aiEscalate || ruleEscalate || rulebookV2.complianceConcernLevel === 'High' || rulebookV3.escalation;

  const mergedNextChecks = Array.from(
    new Set([...(aiResult.next_checks ?? []), ...rulebook.nextChecks, ...rulebookV3.nextChecks])
  ).slice(0, 6);

  const escalationParts: string[] = [];
  if (aiResult.escalation_reason) escalationParts.push(aiResult.escalation_reason);
  if (ruleEscalate && rulebook.triggeredRules.some((r) => r.escalate)) {
    const escalateRule = rulebook.triggeredRules.find((r) => r.escalate);
    if (escalateRule) escalationParts.push(escalateRule.ruleName);
  }
  if (rulebookV2.complianceConcernLevel === 'High' && rulebookV2.complianceRationale) {
    escalationParts.push('Compliance concern: ' + rulebookV2.likelyIssueType);
  }

  return {
    defect_type: aiResult.defect_type,
    severity: finalSeverity,
    observation: aiResult.observation,
    confidence: finalConfidence,
    needsReview: finalConfidence < 70,
    likely_cause: aiResult.likely_cause || rulebook.likelyCause || '',
    next_checks: mergedNextChecks,
    escalate: finalEscalate,
    escalation_reason: escalationParts.join(' · '),
    remediation_guidance: aiResult.remediation_guidance || rulebook.remediationGuidance || '',
    rulebook,
    rulebookV2,
    rulebookV3,
    brainMode,
    confidenceBoost,
  };
}
