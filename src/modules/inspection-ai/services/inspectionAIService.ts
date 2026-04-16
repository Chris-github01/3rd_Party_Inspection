import type { AIAnalysisResult } from '../types';
import { normaliseDefectType } from '../utils/defectDictionary';
import { getObservationTemplate } from '../utils/observationTemplates';
import { compressImageFile, hashImageFile } from '../utils/imageCompressor';
import { getCachedResult, setCachedResult } from '../utils/analysisCache';
import { supabase } from '../../../lib/supabase';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inspection-ai-analyse`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const CONFIDENCE_REVIEW_THRESHOLD = 70;

const RETRY_DELAYS_MS = [30000, 60000, 90000];

const HIGH_OVERRIDE_RATE_THRESHOLD = 40;
let overrideRateCache: Map<string, number> | null = null;
let overrideRateCacheTs = 0;
const OVERRIDE_CACHE_TTL = 5 * 60 * 1000;

async function getHighOverrideClasses(): Promise<Set<string>> {
  const now = Date.now();
  if (overrideRateCache && now - overrideRateCacheTs < OVERRIDE_CACHE_TTL) {
    const result = new Set<string>();
    overrideRateCache.forEach((rate, cls) => { if (rate >= HIGH_OVERRIDE_RATE_THRESHOLD) result.add(cls); });
    return result;
  }
  try {
    const { data } = await supabase
      .from('inspection_ai_items')
      .select('defect_type, defect_type_override')
      .not('defect_type', 'is', null);
    if (!data) return new Set();
    const counts = new Map<string, { total: number; overrides: number }>();
    for (const row of data) {
      const cls = row.defect_type;
      if (!cls) continue;
      const entry = counts.get(cls) ?? { total: 0, overrides: 0 };
      entry.total++;
      if (row.defect_type_override && row.defect_type_override !== cls) entry.overrides++;
      counts.set(cls, entry);
    }
    overrideRateCache = new Map<string, number>();
    counts.forEach(({ total, overrides }, cls) => {
      if (total >= 5) overrideRateCache!.set(cls, Math.round((overrides / total) * 100));
    });
    overrideRateCacheTs = now;
    const result = new Set<string>();
    overrideRateCache.forEach((rate, cls) => { if (rate >= HIGH_OVERRIDE_RATE_THRESHOLD) result.add(cls); });
    return result;
  } catch {
    return new Set();
  }
}

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
  forceTier2: boolean
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
        force_tier2: forceTier2,
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
    tier_used: data.tier_used === 1 ? 1 : data.tier_used === 2 ? 2 : undefined,
    model_used: data.model_used ? String(data.model_used) : undefined,
  };
}

export interface AnalyseImageResult extends AIAnalysisResult {
  needsT2Escalation?: boolean;
}

export async function analyseImage(
  imageFile: File,
  systemType: string,
  element: string,
  onRetry?: (attemptNumber: number, delayMs: number) => void,
  environment?: string,
  observedConcern?: string,
  isNewInstall?: boolean,
  currentQueueDepth?: number,
  forceTier2Override?: boolean
): Promise<AnalyseImageResult> {
  const env = environment ?? 'Internal';
  const concern = observedConcern ?? 'Unsure';
  const newInstall = isNewInstall ?? false;
  const highOverrideClasses = await getHighOverrideClasses();
  const forceTier2 = forceTier2Override || isSpecialistMode(systemType);

  const { file: compressed, wasCompressed, originalSizeKB, compressedSizeKB, quality } = await compressImageFile(imageFile);
  if (wasCompressed) {
    console.info(`[AI] Image compressed ${originalSizeKB}KB -> ${compressedSizeKB}KB`);
  }
  if (!quality.usable && quality.reason !== 'quality_check_failed') {
    const reasonMap: Record<string, string> = {
      too_blurry: 'This photo appears too blurry to analyse reliably. Please retake with the camera held steady.',
      image_too_small: 'This image is too small. Please use a higher resolution photo.',
      not_an_image: 'The selected file is not an image.',
    };
    throw new Error(reasonMap[quality.reason] ?? `Image rejected: ${quality.reason}`);
  }

  const hash = await hashImageFile(compressed);
  const cached = getCachedResult(hash);
  if (cached) {
    console.info(`[AI] Cache hit for image hash ${hash}`);
    return cached;
  }

  const requestId = `${hash.slice(0, 8)}-${Date.now()}`;
  console.info(`[AI] Request ${requestId} | tier=${forceTier2 ? 2 : 1} | queue=${currentQueueDepth ?? 0}`);

  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await callEdgeFunction(compressed, systemType, element, env, concern, newInstall, forceTier2);

      const shouldEscalate =
        !forceTier2 &&
        result.tier_used === 1 &&
        result.confidence !== undefined &&
        result.confidence >= 85 &&
        result.defect_type &&
        highOverrideClasses.has(result.defect_type);

      if (shouldEscalate) {
        console.info(`[AI] T2 escalation flagged for "${result.defect_type}" (request ${requestId}) — caller must re-enqueue`);
        const flagged: AnalyseImageResult = { ...result, needsT2Escalation: true };
        return flagged;
      }

      setCachedResult(hash, result);
      console.info(`[AI] Request ${requestId} done | tier=${result.tier_used} | confidence=${result.confidence}`);
      return result;
    } catch (err) {
      lastError = err;

      const source =
        err instanceof AIUnavailableError && err.reason === 'rate_limit'
          ? 'rate_limit'
          : err instanceof AIUnavailableError && err.reason === 'network_error'
          ? 'network_error'
          : 'ai_unavailable';

      console.warn(`[AI] Request ${requestId} failed (attempt ${attempt + 1}) | source=${source}`);

      const isRetryable = err instanceof AIUnavailableError &&
        (err.reason === 'rate_limit' || err.reason === 'network_error');
      if (isRetryable && attempt < RETRY_DELAYS_MS.length) {
        const delayMs = RETRY_DELAYS_MS[attempt];
        console.warn(`[AI] Retrying in ${delayMs / 1000}s (attempt ${attempt + 2}/${RETRY_DELAYS_MS.length + 1})`);
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
