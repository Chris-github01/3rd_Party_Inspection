import * as pdfjsLib from 'pdfjs-dist';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface ThumbnailCache extends DBSchema {
  thumbnails: {
    key: string;
    value: {
      id: string;
      dataUrl: string;
      timestamp: number;
    };
  };
}

const CACHE_NAME = 'pdf-thumbnails';
const CACHE_VERSION = 1;
const CACHE_EXPIRY_DAYS = 7;

let dbInstance: IDBPDatabase<ThumbnailCache> | null = null;

async function getDB(): Promise<IDBPDatabase<ThumbnailCache>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ThumbnailCache>(CACHE_NAME, CACHE_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('thumbnails')) {
        db.createObjectStore('thumbnails', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

export interface ThumbnailOptions {
  scale?: number;
  width?: number;
  height?: number;
  quality?: number;
}

export async function generatePDFThumbnail(
  pdfBytes: Uint8Array,
  pageNumber: number = 1,
  options: ThumbnailOptions = {}
): Promise<string> {
  const {
    scale = 0.5,
    width,
    height,
    quality = 0.8,
  } = options;

  const cacheKey = `pdf-${pdfBytes.length}-page-${pageNumber}-${scale}`;

  try {
    const db = await getDB();
    const cached = await db.get('thumbnails', cacheKey);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      const maxAge = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      if (age < maxAge) {
        return cached.dataUrl;
      }
    }
  } catch (error) {
    console.warn('Cache read failed:', error);
  }

  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = width || viewport.width;
  canvas.height = height || viewport.height;

  const renderContext = {
    canvas: canvas,
    canvasContext: context,
    viewport: width || height
      ? page.getViewport({
          scale: Math.min(
            (width || viewport.width) / viewport.width,
            (height || viewport.height) / viewport.height
          )
        })
      : viewport,
  };

  await page.render(renderContext).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', quality);

  try {
    const db = await getDB();
    await db.put('thumbnails', {
      id: cacheKey,
      dataUrl,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.warn('Cache write failed:', error);
  }

  return dataUrl;
}

export async function generateMultipleThumbnails(
  pdfBytes: Uint8Array,
  pageNumbers: number[],
  options: ThumbnailOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, string>> {
  const thumbnails = new Map<number, string>();

  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i];
    const thumbnail = await generatePDFThumbnail(pdfBytes, pageNum, options);
    thumbnails.set(pageNum, thumbnail);

    if (onProgress) {
      onProgress(i + 1, pageNumbers.length);
    }
  }

  return thumbnails;
}

export async function clearThumbnailCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('thumbnails');
  } catch (error) {
    console.error('Failed to clear thumbnail cache:', error);
  }
}

export async function cleanExpiredThumbnails(): Promise<void> {
  try {
    const db = await getDB();
    const allThumbnails = await db.getAll('thumbnails');
    const now = Date.now();
    const maxAge = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    for (const thumbnail of allThumbnails) {
      if (now - thumbnail.timestamp > maxAge) {
        await db.delete('thumbnails', thumbnail.id);
      }
    }
  } catch (error) {
    console.error('Failed to clean expired thumbnails:', error);
  }
}
