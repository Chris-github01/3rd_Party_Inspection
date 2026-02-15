import { supabase } from './supabase';
import type { ParsingJob, ArtifactPack, PageData } from './parsingTypes';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export async function createParsingJob(
  documentId: string,
  storageBucket: string,
  storagePath: string,
  mimeType: string,
  projectId?: string,
  drawingId?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('parsing_jobs')
    .insert({
      document_id: documentId,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      mime_type: mimeType,
      project_id: projectId || null,
      drawing_id: drawingId || null,
      status: 'queued',
      mode: 'auto',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create parsing job: ${error.message}`);
  }

  return data.id;
}

export async function triggerParsing(jobId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/parse-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ jobId }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trigger parsing: ${error}`);
  }
}

export async function pollParsingJob(
  jobId: string,
  onUpdate: (job: ParsingJob) => void,
  intervalMs: number = 2000,
  maxAttempts: number = 60
): Promise<ParsingJob> {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      attempts++;

      const { data: job, error } = await supabase
        .from('parsing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        reject(new Error(`Failed to poll job: ${error.message}`));
        return;
      }

      onUpdate(job);

      if (job.status === 'completed' || job.status === 'partial_completed') {
        resolve(job);
        return;
      }

      if (job.status === 'failed') {
        reject(new Error(job.error_message || 'Parsing failed'));
        return;
      }

      if (attempts >= maxAttempts) {
        reject(new Error('Polling timeout'));
        return;
      }

      setTimeout(poll, intervalMs);
    };

    poll();
  });
}

export async function clientSidePDFParse(file: File, jobId: string, documentId: string): Promise<ArtifactPack> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages: PageData[] = [];
  const lowConfidencePages: number[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');

    const lines = pageText.split(/[.\n]/).filter((l) => l.trim().length > 0);
    const charCount = pageText.replace(/\s/g, '').length;
    const wordCount = pageText.split(/\s+/).filter((w) => w.length > 0).length;

    let method: 'text' | 'ocr' | 'none' = 'text';
    let confidence = 1.0;

    if (charCount < 50 || wordCount < 10) {
      method = 'none';
      confidence = 0.0;
      lowConfidencePages.push(pageNum);
    } else if (wordCount < 30) {
      confidence = 0.5;
      lowConfidencePages.push(pageNum);
    }

    pages.push({
      page: pageNum,
      method,
      confidence,
      text: pageText,
      lines: lines.map((text, idx) => ({ line: idx + 1, text })),
      errors: [],
    });
  }

  const artifact: ArtifactPack = {
    jobId,
    documentId,
    source: { bucket: 'client-fallback', path: file.name },
    pageCount: pdf.numPages,
    pages,
    lowConfidencePages,
    errors: [],
    createdAt: new Date().toISOString(),
  };

  return artifact;
}

export async function uploadClientArtifact(artifact: ArtifactPack): Promise<string> {
  const artifactPath = `jobs/${artifact.jobId}/artifact-client.json`;

  const { error } = await supabase.storage
    .from('parsing-artifacts')
    .upload(artifactPath, JSON.stringify(artifact, null, 2), {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload client artifact: ${error.message}`);
  }

  return artifactPath;
}

export async function retryParsingJob(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('parsing_jobs')
    .update({
      status: 'queued',
      error_code: null,
      error_message: null,
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to retry job: ${error.message}`);
  }

  await triggerParsing(jobId);
}

export async function getParsingJobsByDocument(documentId: string): Promise<ParsingJob[]> {
  const { data, error } = await supabase
    .from('parsing_jobs')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch parsing jobs: ${error.message}`);
  }

  return data || [];
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function calculateParsingProgress(job: ParsingJob): number {
  if (!job.page_count) return 0;
  if (job.status === 'completed' || job.status === 'partial_completed') return 100;
  if (job.status === 'failed') return 0;

  const textPages = job.text_pages?.length || 0;
  const ocrPages = job.ocr_pages?.length || 0;
  const processedPages = textPages + ocrPages;

  return Math.min(Math.round((processedPages / job.page_count) * 100), 99);
}
