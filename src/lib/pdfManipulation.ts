import { PDFDocument, degrees, PDFPage } from 'pdf-lib';

export interface PageRange {
  start: number;
  end?: number;
}

export interface PDFSource {
  file: File | Blob | ArrayBuffer;
  pageRanges?: PageRange[];
  filename: string;
}

export interface MergeOptions {
  sources: PDFSource[];
  outputFilename: string;
  preserveBookmarks?: boolean;
  preserveMetadata?: boolean;
}

export interface SplitByPagesOptions {
  source: PDFSource;
  splitPoints: number[];
  outputPattern: string;
}

export interface SplitBySizeOptions {
  source: PDFSource;
  maxSizeMB: number;
  preservePages: boolean;
  outputPattern: string;
}

export interface SplitEveryNPagesOptions {
  source: PDFSource;
  pagesPerChunk: number;
  outputPattern: string;
}

export interface RotateOptions {
  source: PDFSource;
  pageRanges: PageRange[];
  degrees: 90 | 180 | 270 | -90 | -180 | -270;
  rotateAllPages?: boolean;
}

export interface ExtractOptions {
  source: PDFSource;
  extractions: ExtractionSpec[];
  deleteExtractedFromSource?: boolean;
}

export interface ExtractionSpec {
  pageRanges: PageRange[];
  outputFilename: string;
  includeBookmarks?: boolean;
}

export interface MixOptions {
  sources: PDFSource[];
  pattern: MixPattern;
  outputFilename: string;
}

export interface MixPattern {
  sequence: number[];
  repeat: boolean;
  handleUneven: 'skip' | 'append' | 'prepend';
}

export interface InsertOptions {
  targetPDF: PDFSource;
  insertionPDF: PDFSource;
  insertionPages: PageRange[];
  insertionPoints: InsertionPoint[];
  mode: 'before' | 'after' | 'replace';
}

export interface InsertionPoint {
  type: 'interval' | 'specific';
  value: number | number[];
}

export interface PDFResult {
  success: boolean;
  data?: Uint8Array;
  metadata?: PDFMetadata;
  error?: Error;
  warnings?: string[];
  processingTime: number;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  pageCount: number;
  fileSize: number;
}

export interface ProgressCallback {
  (progress: ProgressUpdate): void;
}

export interface ProgressUpdate {
  stage: string;
  progress: number;
  currentPage?: number;
  totalPages?: number;
  message?: string;
  canCancel: boolean;
}

async function getBytes(file: File | Blob | ArrayBuffer): Promise<ArrayBuffer> {
  if (file instanceof ArrayBuffer) {
    return file;
  }
  return await file.arrayBuffer();
}

export function parsePageRangeString(rangeStr: string, maxPage?: number): number[] {
  const pages: number[] = [];

  if (rangeStr === 'all') {
    return maxPage ? Array.from({ length: maxPage }, (_, i) => i + 1) : [];
  }

  if (rangeStr === 'even' && maxPage) {
    return Array.from({ length: maxPage }, (_, i) => i + 1).filter(p => p % 2 === 0);
  }

  if (rangeStr === 'odd' && maxPage) {
    return Array.from({ length: maxPage }, (_, i) => i + 1).filter(p => p % 2 === 1);
  }

  const parts = rangeStr.split(',').map(s => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => s.trim());

      if (!start && end) {
        const endNum = parseInt(end);
        for (let i = 1; i <= endNum; i++) {
          pages.push(i);
        }
      } else if (start && !end) {
        const startNum = parseInt(start);
        if (maxPage) {
          for (let i = startNum; i <= maxPage; i++) {
            pages.push(i);
          }
        }
      } else {
        const startNum = parseInt(start);
        const endNum = parseInt(end);
        for (let i = startNum; i <= endNum; i++) {
          pages.push(i);
        }
      }
    } else {
      pages.push(parseInt(part));
    }
  }

  return [...new Set(pages)].sort((a, b) => a - b);
}

function parsePageRanges(ranges: PageRange[], maxPage: number): number[] {
  const pages: number[] = [];

  for (const range of ranges) {
    if (range.end === undefined) {
      for (let i = range.start; i <= maxPage; i++) {
        pages.push(i - 1);
      }
    } else {
      for (let i = range.start; i <= range.end; i++) {
        if (i <= maxPage) {
          pages.push(i - 1);
        }
      }
    }
  }

  return pages;
}

export async function mergePDFs(
  options: MergeOptions,
  onProgress?: ProgressCallback
): Promise<PDFResult> {
  const startTime = performance.now();

  try {
    onProgress?.({
      stage: 'Initializing',
      progress: 0,
      message: 'Creating merged document...',
      canCancel: false,
    });

    const mergedPdf = await PDFDocument.create();
    let totalPagesProcessed = 0;
    let totalPagesExpected = 0;

    for (const source of options.sources) {
      const sourceBytes = await getBytes(source.file);
      const sourcePdf = await PDFDocument.load(sourceBytes);
      const pageCount = source.pageRanges
        ? parsePageRanges(source.pageRanges, sourcePdf.getPageCount()).length
        : sourcePdf.getPageCount();
      totalPagesExpected += pageCount;
    }

    for (let sourceIndex = 0; sourceIndex < options.sources.length; sourceIndex++) {
      const source = options.sources[sourceIndex];

      onProgress?.({
        stage: 'Loading',
        progress: (sourceIndex / options.sources.length) * 30,
        message: `Loading ${source.filename}...`,
        canCancel: true,
      });

      const sourceBytes = await getBytes(source.file);
      const sourcePdf = await PDFDocument.load(sourceBytes);

      const pages = source.pageRanges
        ? parsePageRanges(source.pageRanges, sourcePdf.getPageCount())
        : Array.from({ length: sourcePdf.getPageCount() }, (_, i) => i);

      onProgress?.({
        stage: 'Copying Pages',
        progress: 30 + (sourceIndex / options.sources.length) * 60,
        currentPage: totalPagesProcessed,
        totalPages: totalPagesExpected,
        message: `Copying pages from ${source.filename}...`,
        canCancel: true,
      });

      const copiedPages = await mergedPdf.copyPages(sourcePdf, pages);
      copiedPages.forEach(page => mergedPdf.addPage(page));

      totalPagesProcessed += copiedPages.length;
    }

    if (options.preserveMetadata) {
      mergedPdf.setTitle(options.outputFilename.replace('.pdf', ''));
      mergedPdf.setCreator('InspectPDF - Fire Protection Inspection System');
      mergedPdf.setProducer('InspectPDF v1.0');
      mergedPdf.setCreationDate(new Date());
      mergedPdf.setModificationDate(new Date());
    }

    onProgress?.({
      stage: 'Saving',
      progress: 95,
      message: 'Finalizing document...',
      canCancel: false,
    });

    const mergedBytes = await mergedPdf.save();

    onProgress?.({
      stage: 'Complete',
      progress: 100,
      message: 'Merge completed successfully',
      canCancel: false,
    });

    return {
      success: true,
      data: mergedBytes,
      metadata: {
        pageCount: mergedPdf.getPageCount(),
        fileSize: mergedBytes.length,
        title: options.outputFilename,
        creator: 'InspectPDF',
        producer: 'InspectPDF v1.0',
      },
      processingTime: performance.now() - startTime,
    };

  } catch (error) {
    onProgress?.({
      stage: 'Error',
      progress: 0,
      message: `Error: ${(error as Error).message}`,
      canCancel: false,
    });

    return {
      success: false,
      error: error as Error,
      processingTime: performance.now() - startTime,
    };
  }
}

export async function splitPDFByPages(
  options: SplitByPagesOptions,
  onProgress?: ProgressCallback
): Promise<PDFResult[]> {
  const startTime = performance.now();
  const results: PDFResult[] = [];

  try {
    onProgress?.({
      stage: 'Loading',
      progress: 10,
      message: 'Loading source PDF...',
      canCancel: false,
    });

    const sourceBytes = await getBytes(options.source.file);
    const sourcePdf = await PDFDocument.load(sourceBytes);
    const totalPages = sourcePdf.getPageCount();

    const sortedSplits = [...options.splitPoints].sort((a, b) => a - b);

    const segments: { start: number; end: number }[] = [];
    let currentStart = 0;

    for (const splitPoint of sortedSplits) {
      if (splitPoint > currentStart && splitPoint < totalPages) {
        segments.push({ start: currentStart, end: splitPoint - 1 });
        currentStart = splitPoint;
      }
    }

    segments.push({ start: currentStart, end: totalPages - 1 });

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      onProgress?.({
        stage: 'Splitting',
        progress: 10 + ((i / segments.length) * 80),
        message: `Creating part ${i + 1} of ${segments.length}...`,
        canCancel: true,
      });

      const segmentPdf = await PDFDocument.create();

      const pageIndices = Array.from(
        { length: segment.end - segment.start + 1 },
        (_, j) => segment.start + j
      );

      const copiedPages = await segmentPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach(page => segmentPdf.addPage(page));

      const filename = options.outputPattern
        .replace('{original}', options.source.filename.replace('.pdf', ''))
        .replace('{n}', (i + 1).toString())
        .replace('{start}', (segment.start + 1).toString())
        .replace('{end}', (segment.end + 1).toString());

      segmentPdf.setTitle(filename);
      segmentPdf.setCreator('InspectPDF');
      segmentPdf.setCreationDate(new Date());
      segmentPdf.setModificationDate(new Date());

      const segmentBytes = await segmentPdf.save();

      results.push({
        success: true,
        data: segmentBytes,
        metadata: {
          pageCount: segmentPdf.getPageCount(),
          fileSize: segmentBytes.length,
          title: filename,
        },
        processingTime: 0,
      });
    }

    onProgress?.({
      stage: 'Complete',
      progress: 100,
      message: `Split into ${results.length} parts`,
      canCancel: false,
    });

    const totalTime = performance.now() - startTime;
    results.forEach(r => r.processingTime = totalTime / results.length);

    return results;

  } catch (error) {
    return [{
      success: false,
      error: error as Error,
      processingTime: performance.now() - startTime,
    }];
  }
}

export async function splitPDFEveryNPages(
  options: SplitEveryNPagesOptions,
  onProgress?: ProgressCallback
): Promise<PDFResult[]> {
  const sourceBytes = await getBytes(options.source.file);
  const sourcePdf = await PDFDocument.load(sourceBytes);
  const totalPages = sourcePdf.getPageCount();

  const splitPoints: number[] = [];
  for (let i = options.pagesPerChunk; i < totalPages; i += options.pagesPerChunk) {
    splitPoints.push(i);
  }

  return splitPDFByPages(
    {
      source: options.source,
      splitPoints,
      outputPattern: options.outputPattern,
    },
    onProgress
  );
}

export async function rotatePDF(
  options: RotateOptions,
  onProgress?: ProgressCallback
): Promise<PDFResult> {
  const startTime = performance.now();

  try {
    onProgress?.({
      stage: 'Loading',
      progress: 10,
      message: 'Loading PDF...',
      canCancel: false,
    });

    const sourceBytes = await getBytes(options.source.file);
    const pdfDoc = await PDFDocument.load(sourceBytes);

    const pagesToRotate = options.rotateAllPages
      ? Array.from({ length: pdfDoc.getPageCount() }, (_, i) => i)
      : parsePageRanges(options.pageRanges, pdfDoc.getPageCount());

    onProgress?.({
      stage: 'Rotating',
      progress: 30,
      totalPages: pagesToRotate.length,
      message: `Rotating ${pagesToRotate.length} pages...`,
      canCancel: true,
    });

    for (let i = 0; i < pagesToRotate.length; i++) {
      const pageIndex = pagesToRotate[i];
      const page = pdfDoc.getPage(pageIndex);
      const currentRotation = page.getRotation().angle;
      const newRotation = (currentRotation + options.degrees) % 360;
      page.setRotation(degrees(newRotation));

      if (i % 10 === 0) {
        onProgress?.({
          stage: 'Rotating',
          progress: 30 + ((i / pagesToRotate.length) * 60),
          currentPage: i,
          totalPages: pagesToRotate.length,
          message: `Rotating page ${i + 1} of ${pagesToRotate.length}...`,
          canCancel: true,
        });
      }
    }

    onProgress?.({
      stage: 'Saving',
      progress: 95,
      message: 'Saving rotated PDF...',
      canCancel: false,
    });

    const rotatedBytes = await pdfDoc.save();

    onProgress?.({
      stage: 'Complete',
      progress: 100,
      message: 'Rotation completed',
      canCancel: false,
    });

    return {
      success: true,
      data: rotatedBytes,
      metadata: {
        pageCount: pdfDoc.getPageCount(),
        fileSize: rotatedBytes.length,
      },
      processingTime: performance.now() - startTime,
    };

  } catch (error) {
    return {
      success: false,
      error: error as Error,
      processingTime: performance.now() - startTime,
    };
  }
}

export async function extractPages(
  options: ExtractOptions,
  onProgress?: ProgressCallback
): Promise<PDFResult[]> {
  const startTime = performance.now();
  const results: PDFResult[] = [];

  try {
    onProgress?.({
      stage: 'Loading',
      progress: 10,
      message: 'Loading source PDF...',
      canCancel: false,
    });

    const sourceBytes = await getBytes(options.source.file);
    const sourcePdf = await PDFDocument.load(sourceBytes);

    for (let i = 0; i < options.extractions.length; i++) {
      const extraction = options.extractions[i];

      onProgress?.({
        stage: 'Extracting',
        progress: 10 + ((i / options.extractions.length) * 80),
        message: `Extracting ${extraction.outputFilename}...`,
        canCancel: true,
      });

      const extractedPdf = await PDFDocument.create();

      const pageIndices = parsePageRanges(
        extraction.pageRanges,
        sourcePdf.getPageCount()
      );

      const copiedPages = await extractedPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach(page => extractedPdf.addPage(page));

      extractedPdf.setTitle(extraction.outputFilename);
      extractedPdf.setCreator('InspectPDF');
      extractedPdf.setCreationDate(new Date());
      extractedPdf.setModificationDate(new Date());

      const extractedBytes = await extractedPdf.save();

      results.push({
        success: true,
        data: extractedBytes,
        metadata: {
          pageCount: extractedPdf.getPageCount(),
          fileSize: extractedBytes.length,
          title: extraction.outputFilename,
        },
        processingTime: 0,
      });
    }

    onProgress?.({
      stage: 'Complete',
      progress: 100,
      message: `Extracted ${results.length} document(s)`,
      canCancel: false,
    });

    const totalTime = performance.now() - startTime;
    results.forEach(r => r.processingTime = totalTime / results.length);

    return results;

  } catch (error) {
    return [{
      success: false,
      error: error as Error,
      processingTime: performance.now() - startTime,
    }];
  }
}

export async function mixPDFs(
  options: MixOptions,
  onProgress?: ProgressCallback
): Promise<PDFResult> {
  const startTime = performance.now();

  try {
    onProgress?.({
      stage: 'Loading',
      progress: 10,
      message: 'Loading source PDFs...',
      canCancel: false,
    });

    const loadedPDFs: PDFDocument[] = [];
    const currentPages: number[] = [];

    for (const source of options.sources) {
      const bytes = await getBytes(source.file);
      const pdf = await PDFDocument.load(bytes);
      loadedPDFs.push(pdf);
      currentPages.push(0);
    }

    const mixedPdf = await PDFDocument.create();
    let continueProcessing = true;
    let iteration = 0;

    while (continueProcessing) {
      let addedPage = false;

      for (let i = 0; i < options.pattern.sequence.length; i++) {
        const sourceIndex = options.pattern.sequence[i] - 1;

        if (sourceIndex >= loadedPDFs.length) continue;

        const sourcePdf = loadedPDFs[sourceIndex];
        const currentPage = currentPages[sourceIndex];

        if (currentPage < sourcePdf.getPageCount()) {
          const [copiedPage] = await mixedPdf.copyPages(sourcePdf, [currentPage]);
          mixedPdf.addPage(copiedPage);
          currentPages[sourceIndex]++;
          addedPage = true;
        }
      }

      if (!addedPage || !options.pattern.repeat) {
        continueProcessing = false;
      }

      iteration++;

      if (iteration % 10 === 0) {
        const totalPagesCopied = currentPages.reduce((sum, p) => sum + p, 0);
        const totalPages = loadedPDFs.reduce((sum, pdf) => sum + pdf.getPageCount(), 0);

        onProgress?.({
          stage: 'Mixing',
          progress: 10 + ((totalPagesCopied / totalPages) * 80),
          currentPage: totalPagesCopied,
          totalPages,
          message: 'Mixing pages...',
          canCancel: true,
        });
      }
    }

    mixedPdf.setTitle(options.outputFilename);
    mixedPdf.setCreator('InspectPDF');
    mixedPdf.setCreationDate(new Date());
    mixedPdf.setModificationDate(new Date());

    onProgress?.({
      stage: 'Saving',
      progress: 95,
      message: 'Saving mixed PDF...',
      canCancel: false,
    });

    const mixedBytes = await mixedPdf.save();

    onProgress?.({
      stage: 'Complete',
      progress: 100,
      message: 'Mix completed',
      canCancel: false,
    });

    return {
      success: true,
      data: mixedBytes,
      metadata: {
        pageCount: mixedPdf.getPageCount(),
        fileSize: mixedBytes.length,
        title: options.outputFilename,
      },
      processingTime: performance.now() - startTime,
    };

  } catch (error) {
    return {
      success: false,
      error: error as Error,
      processingTime: performance.now() - startTime,
    };
  }
}

export async function insertPages(
  options: InsertOptions,
  onProgress?: ProgressCallback
): Promise<PDFResult> {
  const startTime = performance.now();

  try {
    onProgress?.({
      stage: 'Loading',
      progress: 10,
      message: 'Loading PDFs...',
      canCancel: false,
    });

    const targetBytes = await getBytes(options.targetPDF.file);
    const targetPdf = await PDFDocument.load(targetBytes);

    const insertionBytes = await getBytes(options.insertionPDF.file);
    const insertionPdf = await PDFDocument.load(insertionBytes);

    const insertionPageIndices = parsePageRanges(
      options.insertionPages,
      insertionPdf.getPageCount()
    );

    const insertionPointsList: number[] = [];

    for (const point of options.insertionPoints) {
      if (point.type === 'interval') {
        const interval = point.value as number;
        for (let i = interval; i < targetPdf.getPageCount(); i += interval) {
          insertionPointsList.push(i);
        }
      } else if (point.type === 'specific') {
        const points = Array.isArray(point.value) ? point.value : [point.value];
        insertionPointsList.push(...points);
      }
    }

    insertionPointsList.sort((a, b) => a - b);

    const resultPdf = await PDFDocument.create();
    let targetPageIndex = 0;

    for (let i = 0; i <= targetPdf.getPageCount(); i++) {
      if (insertionPointsList.includes(i)) {
        const pagesToInsert = await resultPdf.copyPages(
          insertionPdf,
          insertionPageIndices
        );
        pagesToInsert.forEach(page => resultPdf.addPage(page));
      }

      if (i < targetPdf.getPageCount()) {
        const [targetPage] = await resultPdf.copyPages(targetPdf, [i]);
        resultPdf.addPage(targetPage);
      }

      if (i % 10 === 0) {
        onProgress?.({
          stage: 'Inserting',
          progress: 10 + ((i / targetPdf.getPageCount()) * 80),
          currentPage: i,
          totalPages: targetPdf.getPageCount(),
          message: 'Inserting pages...',
          canCancel: true,
        });
      }
    }

    resultPdf.setCreator('InspectPDF');
    resultPdf.setCreationDate(new Date());
    resultPdf.setModificationDate(new Date());

    onProgress?.({
      stage: 'Saving',
      progress: 95,
      message: 'Saving document...',
      canCancel: false,
    });

    const resultBytes = await resultPdf.save();

    onProgress?.({
      stage: 'Complete',
      progress: 100,
      message: 'Insertion completed',
      canCancel: false,
    });

    return {
      success: true,
      data: resultBytes,
      metadata: {
        pageCount: resultPdf.getPageCount(),
        fileSize: resultBytes.length,
      },
      processingTime: performance.now() - startTime,
    };

  } catch (error) {
    return {
      success: false,
      error: error as Error,
      processingTime: performance.now() - startTime,
    };
  }
}
