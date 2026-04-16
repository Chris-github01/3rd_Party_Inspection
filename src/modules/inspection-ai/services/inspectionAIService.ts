import type { AIAnalysisResult } from '../types';
import { normaliseDefectType } from '../utils/defectDictionary';
import { getObservationTemplate } from '../utils/observationTemplates';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inspection-ai-analyse`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const CONFIDENCE_REVIEW_THRESHOLD = 70;

const FALLBACK_RESULT: AIAnalysisResult = {
  defect_type: 'Mechanical Damage',
  severity: 'Medium',
  observation: getObservationTemplate('Mechanical Damage'),
  confidence: 0,
  needsReview: true,
  likely_cause: '',
  next_checks: [],
  escalate: false,
  escalation_reason: '',
  remediation_guidance: '',
};

async function attemptAnalyse(
  imageFile: File,
  systemType: string,
  element: string,
  environment?: string,
  observedConcern?: string,
  isNewInstall?: boolean
): Promise<AIAnalysisResult> {
  const base64 = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
      Apikey: ANON_KEY,
    },
    body: JSON.stringify({
      image_base64: base64,
      mime_type: mimeType,
      system_type: systemType,
      element,
      environment: environment ?? 'Internal',
      observed_concern: observedConcern ?? 'Unsure',
      is_new_install: isNewInstall ?? false,
    }),
  });

  if (response.status === 429) {
    throw Object.assign(new Error('Rate limited'), { isRateLimit: true });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Analysis failed: ${response.status} — ${text}`);
  }

  const data = await response.json();

  if (!data.defect_type || !data.severity || !data.observation) {
    throw new Error('Unexpected response format from AI service.');
  }

  const confidence = Math.max(0, Math.min(100, Number(data.confidence ?? 0)));

  return {
    defect_type: normaliseDefectType(String(data.defect_type)),
    severity: data.severity,
    observation: data.observation,
    confidence,
    needsReview: confidence < CONFIDENCE_REVIEW_THRESHOLD,
    likely_cause: String(data.likely_cause ?? ''),
    next_checks: Array.isArray(data.next_checks) ? data.next_checks.map(String) : [],
    escalate: Boolean(data.escalate) || confidence < CONFIDENCE_REVIEW_THRESHOLD,
    escalation_reason: String(data.escalation_reason ?? ''),
    remediation_guidance: String(data.remediation_guidance ?? ''),
  };
}

export async function analyseImage(
  imageFile: File,
  systemType: string,
  element: string,
  onRetry?: () => void,
  environment?: string,
  observedConcern?: string,
  isNewInstall?: boolean
): Promise<AIAnalysisResult> {
  try {
    return await attemptAnalyse(imageFile, systemType, element, environment, observedConcern, isNewInstall);
  } catch (firstErr) {
    const isRateLimit = (firstErr as { isRateLimit?: boolean }).isRateLimit;

    if (isRateLimit) {
      onRetry?.();
      await sleep(3000);
      try {
        return await attemptAnalyse(imageFile, systemType, element, environment, observedConcern, isNewInstall);
      } catch {
        return { ...FALLBACK_RESULT };
      }
    }

    return { ...FALLBACK_RESULT };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
