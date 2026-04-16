import { supabase } from '../../../lib/supabase';
import { compressImageFile, hashImageFile } from '../utils/imageCompressor';
import type { CaptureIntakeContext } from '../types';

export type JobStatus = 'queued' | 'processing' | 'complete' | 'failed' | 'review_required';

export interface AIJob {
  id: string;
  item_id: string | null;
  report_id: string | null;
  status: JobStatus;
  provider: string | null;
  model: string | null;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface EnqueueResult {
  jobId: string;
  imageHash: string;
  rejected: false;
}

export interface RejectedResult {
  rejected: true;
  reason: string;
}

export async function enqueueAnalysisJob(
  imageFile: File,
  ctx: CaptureIntakeContext,
  itemId?: string,
  reportId?: string,
  organizationId?: string,
  priority = 5
): Promise<EnqueueResult | RejectedResult> {
  const { file: compressed, quality } = await compressImageFile(imageFile);

  if (!quality.usable && quality.reason !== 'quality_check_failed') {
    const reasonMap: Record<string, string> = {
      too_blurry: 'This photo appears too blurry. Please retake with the camera held steady.',
      image_too_small: 'Image resolution is too low. Please use a higher quality photo.',
      not_an_image: 'The selected file is not a supported image format.',
    };
    return { rejected: true, reason: reasonMap[quality.reason] ?? `Image rejected: ${quality.reason}` };
  }

  const imageHash = await hashImageFile(compressed);
  const base64 = await fileToBase64(compressed);

  const { data, error } = await supabase
    .from('inspection_ai_jobs')
    .insert({
      organization_id: organizationId ?? null,
      project_id: null,
      report_id: reportId ?? null,
      item_id: itemId ?? null,
      image_url: '',
      image_base64: base64,
      mime_type: compressed.type || 'image/jpeg',
      context_json: {
        system_type: ctx.systemType,
        element: ctx.element,
        environment: ctx.environment,
        observed_concern: ctx.observedConcern,
        is_new_install: ctx.isNewInstall,
        image_hash: imageHash,
      },
      status: 'queued',
      priority,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to enqueue job: ${error?.message ?? 'unknown error'}`);
  }

  return { jobId: data.id, imageHash, rejected: false };
}

export function subscribeToJob(
  jobId: string,
  onUpdate: (job: AIJob) => void
): () => void {
  const channel = supabase
    .channel(`job:${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'inspection_ai_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        onUpdate(payload.new as AIJob);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchJob(jobId: string): Promise<AIJob | null> {
  const { data } = await supabase
    .from('inspection_ai_jobs')
    .select('id,item_id,report_id,status,provider,model,latency_ms,error_message,created_at,completed_at')
    .eq('id', jobId)
    .maybeSingle();
  return data as AIJob | null;
}

export async function fetchJobResult(jobId: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from('inspection_ai_results')
    .select('raw_json, provider, model, latency_ms, confidence')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? (data.raw_json as Record<string, unknown>) : null;
}

export async function triggerWorkerNow(): Promise<void> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inspection-ai-worker`;
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: '{}',
  }).catch(() => {});
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
