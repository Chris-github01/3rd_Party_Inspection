import { useState, useEffect, useRef, useCallback } from 'react';

export type FileKind = 'pdf' | 'image';

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface FileRendererState {
  kind: FileKind;
  totalPages: number;
  currentPage: number;
  rendered: RenderedPage | null;
  loading: boolean;
  error: string | null;
  goToPage: (page: number) => void;
  prevPage: () => void;
  nextPage: () => void;
}

const ACCEPTED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];

export const ACCEPTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];

export function getFileKind(file: File): FileKind | null {
  if (file.type === 'application/pdf') return 'pdf';
  if (ACCEPTED_IMAGE_MIME.has(file.type)) return 'image';
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext && ['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
  return null;
}

export function getDrawingKind(drawing: { file_type: string; mime_type?: string | null }): FileKind {
  if (drawing.file_type === 'pdf') return 'pdf';
  if (drawing.mime_type === 'application/pdf') return 'pdf';
  return 'image';
}

async function renderPdfPage(
  blobUrl: string,
  pageNum: number
): Promise<RenderedPage> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const loadingTask = pdfjsLib.getDocument({ url: blobUrl, disableAutoFetch: true });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNum);

  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  await page.render({ canvasContext: ctx, viewport }).promise;

  return { canvas, width: viewport.width, height: viewport.height };
}

async function getPdfPageCount(blobUrl: string): Promise<number> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const loadingTask = pdfjsLib.getDocument({ url: blobUrl, disableAutoFetch: true });
  const pdfDoc = await loadingTask.promise;
  return pdfDoc.numPages;
}

async function renderImagePage(blobUrl: string): Promise<RenderedPage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve({ canvas, width: img.naturalWidth, height: img.naturalHeight });
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
  const [totalPages, setTotalPages] = useState(fileKind === 'pdf' ? initialPageCount : 1);
  const [currentPage, setCurrentPage] = useState(1);
  const [rendered, setRendered] = useState<RenderedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRendered(null);
    setCurrentPage(1);

    fetch(fileUrl)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch file');
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setBlobUrl(url);
      })
      .catch((e) => {
        if (!cancelled) {
          setBlobUrl(fileUrl);
        }
      });

    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!blobUrl) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (fileKind === 'pdf') {
          const count = await getPdfPageCount(blobUrl);
          if (cancelled) return;
          setTotalPages(count);
          const page = await renderPdfPage(blobUrl, currentPage);
          if (!cancelled) setRendered(page);
        } else {
          const page = await renderImagePage(blobUrl);
          if (!cancelled) {
            setTotalPages(1);
            setRendered(page);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to render file');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [blobUrl, fileKind, currentPage]);

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
    goToPage,
    prevPage,
    nextPage,
  };
}
