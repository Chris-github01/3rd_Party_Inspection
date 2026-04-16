import type { AIAnalysisResult } from '../types';
import { normaliseDefectType } from '../utils/defectDictionary';
import { getObservationTemplate } from '../utils/observationTemplates';
import { compressImageFile, hashImageFile } from '../utils/imageCompressor';
import { getCachedResult, setCachedResult } from '../utils/analysisCache';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inspection-ai-analyse`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const CONFIDENCE_REVIEW_THRESHOLD = 70;

const RETRY_DELAYS_MS = [2000, 5000, 10000];

export type AIFailureReason = 'rate_limit' | 'ai_unavailable' | 'network_error' | 'configuration_error';

export class AIUnavailableError extends Error {
  public readonly reason: AIFailureReason;
  constructor(reason: AIFailureReason, message: string) {
    super(message);
    this.name = 'AIUnavailableError';
    this.reason = reason;
  }
}

function isSpecialistMode(systemType: string): boolean {
  const lower = systemType.toLowerCase();
  return lower.includes('intumescent') || lower.includes('firestopping');
}

async function callEdgeFunction(
  imageFile: File,
  systemType: string,
  element: string,
  environment: string,
  observedConcern: string,
  isNewInstall: boolean,
  useShortPrompt: boolean
): Promise<AIAnalysisResult> {
  const base64 = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  let response: Response;
  try {
    response = await fetch(EDGE_FUNCTION_URL, {
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
        environment,
        observed_concern: observedConcern,
        is_new_install: isNewInstall,
        short_prompt: useShortPrompt,
      }),
    });
  } catch {
    throw new AIUnavailableError('network_error', 'Network error — check connection and retry.');
  }

  if (response.status === 429) {
    throw new AIUnavailableError('rate_limit', 'AI service is temporarily rate limited. Please wait a moment and retry.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    const reason: AIFailureReason = data?.reason === 'rate_limit'
      ? 'rate_limit'
      : data?.reason === 'configuration_error'
        ? 'configuration_error'
        : 'ai_unavailable';
    const message = data?.error ?? 'AI analysis service is currently unavailable. Classify manually.';
    throw new AIUnavailableError(reason, message);
  }

  if (!data?.defect_type || !data?.severity || !data?.observation) {
    throw new AIUnavailableError('ai_unavailable', 'Unexpected response format from AI service.');
  }

  const confidence = Math.max(0, Math.min(100, Number(data.confidence ?? 0)));

  const geometry = data.geometry && typeof data.geometry === 'object' ? {
    location_on_member: String((data.geometry as Record<string, unknown>).location_on_member ?? ''),
    pattern: String((data.geometry as Record<string, unknown>).pattern ?? ''),
    extent: String((data.geometry as Record<string, unknown>).extent ?? ''),
    likely_mechanism: String((data.geometry as Record<string, unknown>).likely_mechanism ?? ''),
    urgent_action: String((data.geometry as Record<string, unknown>).urgent_action ?? ''),
  } : undefined;

  return {
    defect_type: normaliseDefectType(String(data.defect_type)),
    severity: data.severity,
    observation: data.observation,
    confidence,
    needsReview: confidence < CONFIDENCE_REVIEW_THRESHOLD,
    likely_cause: String(data.likely_cause ?? ''),
    visible_evidence: Array.isArray(data.visible_evidence) ? data.visible_evidence.map(String) : [],
    next_checks: Array.isArray(data.next_checks) ? data.next_checks.map(String) : [],
    escalate: Boolean(data.escalate) || confidence < CONFIDENCE_REVIEW_THRESHOLD,
    escalation_reason: String(data.escalation_reason ?? ''),
    remediation_guidance: String(data.remediation_guidance ?? ''),
    requires_manual_review: Boolean(data.requires_manual_review) || confidence < 50,
    system_type_detected: String(data.system_type_detected ?? ''),
    geometry,
  };
}

export async function analyseImage(
  imageFile: File,
  systemType: string,
  element: string,
  onRetry?: (attemptNumber: number, delayMs: number) => void,
  environment?: string,
  observedConcern?: string,
  isNewInstall?: boolean,
  currentQueueDepth?: number
): Promise<AIAnalysisResult> {
  const env = environment ?? 'Internal';
  const concern = observedConcern ?? 'Unsure';
  const newInstall = isNewInstall ?? false;
  const specialist = isSpecialistMode(systemType);
  const useShortPrompt = !specialist && (currentQueueDepth ?? 0) > 3;

  const { file: compressed, wasCompressed, originalSizeKB, compressedSizeKB } = await compressImageFile(imageFile);
  if (wasCompressed) {
    console.info(`[AI] Image compressed ${originalSizeKB}KB -> ${compressedSizeKB}KB`);
  }

  const hash = await hashImageFile(compressed);
  const cached = getCachedResult(hash);
  if (cached) {
    console.info(`[AI] Cache hit for image hash ${hash}`);
    return cached;
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await callEdgeFunction(compressed, systemType, element, env, concern, newInstall, useShortPrompt);
      setCachedResult(hash, result);
      return result;
    } catch (err) {
      lastError = err;

      if (err instanceof AIUnavailableError && err.reason === 'rate_limit' && attempt < RETRY_DELAYS_MS.length) {
        const delayMs = RETRY_DELAYS_MS[attempt];
        onRetry?.(attempt + 1, delayMs);
        await sleep(delayMs);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

export function makeManualModeResult(): AIAnalysisResult {
  return {
    defect_type: 'Unknown',
    severity: 'Medium',
    observation: getObservationTemplate('Unknown') || '',
    confidence: 0,
    needsReview: true,
    likely_cause: '',
    visible_evidence: [],
    next_checks: [],
    escalate: false,
    escalation_reason: '',
    remediation_guidance: '',
    requires_manual_review: true,
  };
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
