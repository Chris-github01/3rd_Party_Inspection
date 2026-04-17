import { useState, useEffect, useRef, useCallback } from 'react';

export type FileKind = 'pdf' | 'image';

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface RenderMetrics {
  fetchMs: number;
  decodeMs: number;
  renderMs: number;
  totalMs: number;
  fileSizeBytes: number;
  compressedBytes: number | null;
  naturalWidth: number;
  naturalHeight: number;
}

export interface FileRendererState {
  kind: FileKind;
  totalPages: number;
  currentPage: number;
  rendered: RenderedPage | null;
  loading: boolean;
  error: string | null;
  metrics: RenderMetrics | null;
  goToPage: (page: number) => void;
  prevPage: () => void;
  nextPage: () => void;
}

const ACCEPTED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const ACCEPTED_EXTENSIONS = [
  '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif',
];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const COMPRESS_THRESHOLD_BYTES = 8 * 1024 * 1024;
export const MAX_CANVAS_DIMENSION = 4096;

export type FileSizeError = { kind: 'too_large'; sizeMB: number; limitMB: number };

export function getFileKind(file: File): FileKind | null {
  if (file.type === 'application/pdf') return 'pdf';
  if (ACCEPTED_IMAGE_MIME.has(file.type)) return 'image';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'].includes(ext)) return 'image';
  return null;
}

export function getDrawingKind(drawing: { file_type: string; mime_type?: string | null }): FileKind {
  if (drawing.file_type === 'pdf') return 'pdf';
  if (drawing.mime_type === 'application/pdf') return 'pdf';
  return 'image';
}

export function validateFileSize(file: File): FileSizeError | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      kind: 'too_large',
      sizeMB: Math.round(file.size / 1024 / 1024 * 10) / 10,
      limitMB: MAX_FILE_SIZE_BYTES / 1024 / 1024,
    };
  }
  return null;
}

function readOrientation(dataView: DataView): number {
  if (dataView.getUint16(0, false) !== 0xffd8) return 1;
  let offset = 2;
  while (offset < dataView.byteLength) {
    const marker = dataView.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffe1) {
      if (dataView.getUint32(offset + 2, false) !== 0x45786966) return 1;
      const little = dataView.getUint16(offset + 8, false) === 0x4949;
      const ifdOffset = dataView.getUint32(offset + 12, little) + offset + 8;
      const entries = dataView.getUint16(ifdOffset, little);
      for (let i = 0; i < entries; i++) {
        const tag = dataView.getUint16(ifdOffset + 2 + i * 12, little);
        if (tag === 0x0112) {
          return dataView.getUint16(ifdOffset + 2 + i * 12 + 8, little);
        }
      }
    } else if ((marker & 0xff00) !== 0xff00) {
      break;
    } else {
      offset += dataView.getUint16(offset, false);
    }
  }
  return 1;
}

function applyExifRotation(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  orientation: number
): void {
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  if (orientation >= 5) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
    default: break;
  }

  ctx.drawImage(img, 0, 0);
}

async function decodeHeicClientSide(blob: Blob): Promise<Blob> {
  const mod = await import('heic2any');
  const convert = ((mod as { default?: unknown }).default ?? mod) as (opts: {
    blob: Blob;
    toType: string;
    quality: number;
  }) => Promise<Blob | Blob[]>;
  const result = await convert({ blob, toType: 'image/jpeg', quality: 0.88 });
  return Array.isArray(result) ? result[0] : result;
}

async function decodeHeicServerSide(
  originalFile: File,
  onProgress?: (phase: string) => void
): Promise<Blob> {
  onProgress?.('Converting HEIC on server…');
  const supabaseUrl = (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL ?? '';
  const supabaseKey = (import.meta as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY ?? '';
  const url = `${supabaseUrl}/functions/v1/heic-convert`;
  const form = new FormData();
  form.append('file', originalFile, originalFile.name);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${supabaseKey}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(`Server HEIC conversion failed: ${body.error ?? res.statusText}`);
  }
  onProgress?.('Server conversion complete');
  return res.blob();
}

async function decodeHeic(
  blob: Blob,
  originalFile: File,
  onProgress?: (phase: string) => void
): Promise<Blob> {
  onProgress?.('Converting HEIC…');
  try {
    const result = await decodeHeicClientSide(blob);
    onProgress?.('HEIC conversion complete');
    return result;
  } catch (clientErr) {
    console.warn('Client-side HEIC conversion failed, trying server fallback:', clientErr);
    try {
      return await decodeHeicServerSide(originalFile, onProgress);
    } catch (serverErr) {
      throw new Error(
        `HEIC conversion failed on both client and server. Please convert your photo to JPEG or PNG before uploading. (${serverErr instanceof Error ? serverErr.message : 'unknown'})`
      );
    }
  }
}

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  );
}

async function compressImage(blob: Blob, maxDim: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Compression failed'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image decode failed')); };
    img.src = url;
  });
}

export type PrepareProgressCallback = (phase: string) => void;

export type ImageCategory =
  | 'drawing'
  | 'site_photo'
  | 'defect_closeup'
  | 'document_scan'
  | 'screenshot';

export async function prepareFileForUpload(
  file: File,
  onProgress?: PrepareProgressCallback
): Promise<{
  blob: Blob;
  mime: string;
  ext: string;
  originalName: string;
  compressedBytes: number | null;
  imageCategory: ImageCategory | null;
}> {
  const sizeErr = validateFileSize(file);
  if (sizeErr) throw new Error(`File too large (${sizeErr.sizeMB} MB). Limit is ${sizeErr.limitMB} MB.`);

  let blob: Blob = file;
  let mime = file.type || 'application/octet-stream';
  let ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  let compressedBytes: number | null = null;

  const originalName = file.name.replace(/\.[^.]+$/, '');

  if (isHeic(file)) {
    blob = await decodeHeic(file, file, onProgress);
    mime = 'image/jpeg';
    ext = 'jpg';
    compressedBytes = blob.size;
  }

  if (mime !== 'application/pdf' && blob.size > COMPRESS_THRESHOLD_BYTES) {
    onProgress?.('Compressing image…');
    const compressed = await compressImage(blob, MAX_CANVAS_DIMENSION, 0.85);
    compressedBytes = compressed.size;
    blob = compressed;
    mime = 'image/jpeg';
    ext = 'jpg';
    onProgress?.('Compression complete');
  }

  let imageCategory: ImageCategory | null = null;
  if (mime !== 'application/pdf') {
    onProgress?.('Classifying image…');
    try {
      imageCategory = await classifyImage(blob, file.name);
    } catch {
      imageCategory = null;
    }
  }

  return { blob, mime, ext, originalName, compressedBytes, imageCategory };
}

async function renderPdfPage(
  blobUrl: string,
  pageNum: number
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number; naturalWidth: number; naturalHeight: number }> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const loadingTask = pdfjsLib.getDocument({ url: blobUrl, disableAutoFetch: true });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNum);

  const scale = Math.min(2.0, MAX_CANVAS_DIMENSION / Math.max(
    page.getViewport({ scale: 1 }).width,
    page.getViewport({ scale: 1 }).height
  ));

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d')!;

  await page.render({ canvasContext: ctx, viewport }).promise;
  page.cleanup();

  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
    naturalWidth: Math.round(page.getViewport({ scale: 1 }).width),
    naturalHeight: Math.round(page.getViewport({ scale: 1 }).height),
  };
}

async function getPdfPageCount(blobUrl: string): Promise<number> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const loadingTask = pdfjsLib.getDocument({ url: blobUrl, disableAutoFetch: true });
  const pdfDoc = await loadingTask.promise;
  const count = pdfDoc.numPages;
  pdfDoc.destroy();
  return count;
}

async function renderImagePage(
  blobUrl: string,
  originalBlob: Blob
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number; naturalWidth: number; naturalHeight: number }> {
  let orientation = 1;
  try {
    const arrayBuf = await originalBlob.slice(0, 65536).arrayBuffer();
    orientation = readOrientation(new DataView(arrayBuf));
  } catch {
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;

      const scale = Math.min(1, MAX_CANVAS_DIMENSION / Math.max(nw, nh));
      const sw = Math.round(nw * scale);
      const sh = Math.round(nh * scale);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sw;
      tempCanvas.height = sh;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.drawImage(img, 0, 0, sw, sh);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      const scaledImg = new Image();
      scaledImg.onload = () => {
        applyExifRotation(ctx, canvas, scaledImg, orientation);
        resolve({ canvas, width: canvas.width, height: canvas.height, naturalWidth: nw, naturalHeight: nh });
      };
      scaledImg.onerror = reject;
      scaledImg.src = tempCanvas.toDataURL('image/png');
    };
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = blobUrl;
  });
}

export function useFileRenderer(
  fileUrl: string,
  fileKind: FileKind,
  initialPageCount = 1
): FileRendererState {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobRef, setBlobRef] = useState<Blob | null>(null);
  const [totalPages, setTotalPages] = useState(fileKind === 'pdf' ? initialPageCount : 1);
  const [currentPage, setCurrentPage] = useState(1);
  const [rendered, setRendered] = useState<RenderedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<RenderMetrics | null>(null);

  const urlRef = useRef<string | null>(null);
  const prevCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();

    setLoading(true);
    setError(null);
    setRendered(null);
    setCurrentPage(1);
    setMetrics(null);

    fetch(fileUrl)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch file');
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setBlobRef(blob);
        setBlobUrl(url);
        const fetchMs = performance.now() - t0;
        setMetrics((m) => ({ ...(m ?? {} as RenderMetrics), fetchMs, fileSizeBytes: blob.size }));
      })
      .catch((e) => {
        if (!cancelled) {
          setBlobUrl(fileUrl);
          setBlobRef(null);
        }
      });

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      if (prevCanvasRef.current) {
        prevCanvasRef.current.width = 0;
        prevCanvasRef.current.height = 0;
        prevCanvasRef.current = null;
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!blobUrl) return;
    let cancelled = false;
    const t1 = performance.now();

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (fileKind === 'pdf') {
          const count = await getPdfPageCount(blobUrl);
          if (cancelled) return;
          setTotalPages(count);
          const t2 = performance.now();
          const result = await renderPdfPage(blobUrl, currentPage);
          if (cancelled) return;
          const renderMs = performance.now() - t2;
          const decodeMs = t2 - t1;
          if (prevCanvasRef.current) {
            prevCanvasRef.current.width = 0;
            prevCanvasRef.current.height = 0;
          }
          prevCanvasRef.current = result.canvas;
          setRendered({ canvas: result.canvas, width: result.width, height: result.height });
          setMetrics((m) => ({
            ...(m ?? {} as RenderMetrics),
            decodeMs,
            renderMs,
            totalMs: performance.now() - t1,
            naturalWidth: result.naturalWidth,
            naturalHeight: result.naturalHeight,
            compressedBytes: null,
          }));
        } else {
          const t2 = performance.now();
          const result = await renderImagePage(blobUrl, blobRef ?? new Blob());
          if (cancelled) return;
          const renderMs = performance.now() - t2;
          if (prevCanvasRef.current) {
            prevCanvasRef.current.width = 0;
            prevCanvasRef.current.height = 0;
          }
          prevCanvasRef.current = result.canvas;
          setTotalPages(1);
          setRendered({ canvas: result.canvas, width: result.width, height: result.height });
          setMetrics((m) => ({
            ...(m ?? {} as RenderMetrics),
            decodeMs: t2 - t1,
            renderMs,
            totalMs: performance.now() - t1,
            naturalWidth: result.naturalWidth,
            naturalHeight: result.naturalHeight,
            compressedBytes: null,
          }));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to render file');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [blobUrl, blobRef, fileKind, currentPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);
  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);

  return {
    kind: fileKind,
    totalPages,
    currentPage,
    rendered,
    loading,
    error,
    metrics,
    goToPage,
    prevPage,
    nextPage,
  };
}

// ─── Image Classification ─────────────────────────────────────────────────────

interface ImageDimensions {
  width: number;
  height: number;
}

function getImageDimensions(blob: Blob): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image for classification'));
    };
    img.src = url;
  });
}

function sampleEdgeUniformity(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const edgePixels: number[] = [];
  const step = Math.max(1, Math.floor(Math.min(w, h) / 20));

  for (let x = 0; x < w; x += step) {
    const top = ctx.getImageData(x, 0, 1, 1).data;
    const bot = ctx.getImageData(x, h - 1, 1, 1).data;
    edgePixels.push(top[0], top[1], top[2], bot[0], bot[1], bot[2]);
  }
  for (let y = 0; y < h; y += step) {
    const left = ctx.getImageData(0, y, 1, 1).data;
    const right = ctx.getImageData(w - 1, y, 1, 1).data;
    edgePixels.push(left[0], left[1], left[2], right[0], right[1], right[2]);
  }

  if (edgePixels.length === 0) return 0;
  const mean = edgePixels.reduce((a, b) => a + b, 0) / edgePixels.length;
  const variance = edgePixels.reduce((a, b) => a + (b - mean) ** 2, 0) / edgePixels.length;
  return Math.sqrt(variance);
}

function sampleColorSpread(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const step = Math.max(4, Math.floor(Math.min(w, h) / 30));
  const rVals: number[] = [];
  const gVals: number[] = [];
  const bVals: number[] = [];

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const px = ctx.getImageData(x, y, 1, 1).data;
      rVals.push(px[0]);
      gVals.push(px[1]);
      bVals.push(px[2]);
    }
  }

  const spread = (vals: number[]) => {
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    return mx - mn;
  };

  return (spread(rVals) + spread(gVals) + spread(bVals)) / 3;
}

export async function classifyImage(
  blob: Blob,
  filename = ''
): Promise<ImageCategory> {
  const { width: nw, height: nh } = await getImageDimensions(blob);
  const aspect = nw / nh;

  const THUMB = 128;
  const scale = THUMB / Math.max(nw, nh);
  const tw = Math.round(nw * scale);
  const th = Math.round(nh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d')!;

  const url = URL.createObjectURL(blob);
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, tw, th); URL.revokeObjectURL(url); resolve(); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });

  const edgeStdDev = sampleEdgeUniformity(ctx, tw, th);
  const colorSpread = sampleColorSpread(ctx, tw, th);

  const lowerName = filename.toLowerCase();
  const hasScreenshotHint = /screen|screenshot|capture|scr_/.test(lowerName);
  const hasDefectHint = /defect|crack|corrosion|rust|damage|close|macro|detail/.test(lowerName);
  const hasDrawingHint = /plan|drawing|dwg|floor|layout|schematic|blueprint|elevation/.test(lowerName);
  const hasDocHint = /scan|doc|form|certificate|report|letter/.test(lowerName);

  const isLandscape = aspect > 1.15;
  const isPortrait = aspect < 0.87;
  const isSquarish = !isLandscape && !isPortrait;

  const isScreenAspect = (
    (aspect >= 1.7 && aspect <= 1.8) ||
    (aspect >= 1.3 && aspect <= 1.37) ||
    (1 / aspect >= 1.7 && 1 / aspect <= 1.8)
  );

  const hasUniformEdges = edgeStdDev < 18;
  const hasLowColorSpread = colorSpread < 60;
  const hasHighColorSpread = colorSpread > 140;
  const isHighRes = nw >= 2000 && nh >= 2000;

  if (hasScreenshotHint || (isScreenAspect && hasUniformEdges && hasLowColorSpread)) {
    return 'screenshot';
  }

  if (hasDocHint || (isPortrait && hasUniformEdges && hasLowColorSpread && !hasHighColorSpread)) {
    return 'document_scan';
  }

  if (hasDrawingHint || (hasLowColorSpread && isLandscape && hasUniformEdges)) {
    return 'drawing';
  }

  if (hasDefectHint || (isSquarish && hasHighColorSpread && !isHighRes)) {
    return 'defect_closeup';
  }

  if (isHighRes && isLandscape && !hasLowColorSpread) {
    return 'site_photo';
  }

  if (isHighRes && isPortrait) {
    return 'defect_closeup';
  }

  return 'site_photo';
}
