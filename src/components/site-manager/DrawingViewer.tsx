import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { pdfjsLib } from '../../lib/pdfjs';
import { exportDrawingWithPins } from '../../lib/pdfSingleDrawingExport';
import { AddPinModal } from './AddPinModal';
import { PinDetailModal } from './PinDetailModal';

interface Drawing {
  id: string;
  level_id: string;
  document_id: string;
  page_number: number;
  preview_image_path: string;
  scale_factor: number;
}

interface Pin {
  id: string;
  drawing_id: string;
  project_id: string;
  block_id: string;
  level_id: string;
  member_id: string | null;
  inspection_id: string | null;
  x: number;
  y: number;
  label: string;
  pin_type: 'inspection' | 'member' | 'ncr' | 'note';
  status: 'not_started' | 'in_progress' | 'pass' | 'repair_required';
  created_at: string;
  page_number?: number;
}

interface DrawingViewerProps {
  drawing: Drawing;
  projectId: string;
  projectName?: string;
  blockName?: string;
  levelName?: string;
  onClose: () => void;
  onPinAdded: () => void;
}

export function DrawingViewer({
  drawing,
  projectId,
  projectName,
  blockName,
  levelName,
  onClose,
  onPinAdded
}: DrawingViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [pins, setPins] = useState<Pin[]>([]);
  const [showAddPin, setShowAddPin] = useState(false);
  const [newPinPosition, setNewPinPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [addingPin, setAddingPin] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);
  const [isPdf, setIsPdf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [renderedWidth, setRenderedWidth] = useState(0);
  const [renderedHeight, setRenderedHeight] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [draggingPin, setDraggingPin] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pdfRendered, setPdfRendered] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);
  const pendingPageRef = useRef<number | null>(null);

  const renderPdfPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current) {
      console.log('[DrawingViewer] Cannot render PDF page: no pdfDoc');
      return;
    }

    if (!canvasRef.current) {
      console.log('[DrawingViewer] Canvas not yet in DOM, scheduling retry');
      pendingPageRef.current = pageNum;
      return;
    }

    pendingPageRef.current = null;

    try {
      console.log('[DrawingViewer] Rendering page:', pageNum);
      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const scale = 1.5 * window.devicePixelRatio;
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / window.devicePixelRatio}px`;
      canvas.style.height = `${viewport.height / window.devicePixelRatio}px`;

      setRenderedWidth(viewport.width / window.devicePixelRatio);
      setRenderedHeight(viewport.height / window.devicePixelRatio);

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        background: 'white',
      };

      await page.render(renderContext as any).promise;
      setPdfRendered(true);
      console.log('[DrawingViewer] Page rendered successfully');
    } catch (error) {
      console.error('[DrawingViewer] Error rendering PDF page:', error);
    }
  }, []);

  const triggerPdfRenderWhenReady = useCallback((pageNum: number, retries = 0) => {
    if (!pdfDocRef.current) return;
    if (canvasRef.current) {
      renderPdfPage(pageNum);
    } else if (retries < 20) {
      setTimeout(() => triggerPdfRenderWhenReady(pageNum, retries + 1), 50);
    }
  }, [renderPdfPage]);

  const loadPdf = useCallback(async (url: string) => {
    try {
      console.log('[DrawingViewer] Loading PDF from URL:', url);
      const loadingTask = pdfjsLib.getDocument({
        url,
        withCredentials: false,
        cMapPacked: true,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF load timed out after 30 seconds')), 30000)
      );

      const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
      pdfDocRef.current = pdf;
      setPageCount(pdf.numPages);
      const targetPage = drawing.page_number || 1;
      setCurrentPage(targetPage);
      pendingPageRef.current = targetPage;
      console.log('[DrawingViewer] PDF loaded successfully, pages:', pdf.numPages);
    } catch (error) {
      console.error('[DrawingViewer] Error loading PDF:', error);
      const message = error instanceof Error ? error.message : 'Unknown error loading PDF';
      setLoadError(message);
    }
  }, [drawing.page_number]);

  const loadContent = useCallback(async () => {
    try {
      setImageLoading(true);

      console.log('[DrawingViewer] Loading content:', {
        preview_image_path: drawing.preview_image_path,
        document_id: drawing.document_id,
      });

      const isPdfFile = drawing.preview_image_path.toLowerCase().endsWith('.pdf');
      setIsPdf(isPdfFile);

      let url = '';
      if (drawing.preview_image_path.startsWith('http')) {
        url = drawing.preview_image_path;
      } else {
        let storagePath = drawing.preview_image_path;
        if (storagePath.startsWith('documents/')) {
          storagePath = storagePath.substring('documents/'.length);
        }

        const { data } = supabase.storage
          .from('documents')
          .getPublicUrl(storagePath);
        url = data.publicUrl;
      }

      console.log('[DrawingViewer] Generated URL:', url);
      console.log('[DrawingViewer] Is PDF:', isPdfFile);
      setImageUrl(url);

      if (isPdfFile) {
        await loadPdf(url);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load drawing');
    } finally {
      setImageLoading(false);
    }
  }, [drawing.preview_image_path, loadPdf]);

  const loadPins = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('drawing_pins')
        .select('*')
        .eq('drawing_id', drawing.id)
        .order('created_at');

      if (error) throw error;
      setPins(data || []);
    } catch (error) {
      console.error('Error loading pins:', error);
    }
  }, [drawing.id]);

  useEffect(() => {
    setImageUrl('');
    setIsPdf(false);
    setRenderedWidth(0);
    setRenderedHeight(0);
    setPdfRendered(false);
    setLoadError(null);
    pdfDocRef.current = null;
    pendingPageRef.current = null;
    loadPins();
    loadContent();
  }, [drawing.id]);

  useEffect(() => {
    if (!imageLoading && isPdf && pdfDocRef.current && pendingPageRef.current !== null) {
      const page = pendingPageRef.current;
      triggerPdfRenderWhenReady(page);
    }
  }, [imageLoading, triggerPdfRenderWhenReady]);

  useEffect(() => {
    if (isPdf && pdfDocRef.current && !imageLoading) {
      renderPdfPage(currentPage);
    }
  }, [currentPage]);

  const filteredPins = pins.filter((pin) => {
    if (!isPdf) return true;
    return (pin.page_number || 1) === currentPage;
  });

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (addingPin || draggingPin) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingPin) {
      const targetElement = isPdf ? canvasRef.current : imageRef.current;
      if (!targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      setPins(prevPins =>
        prevPins.map(pin =>
          pin.id === draggingPin ? { ...pin, x, y } : pin
        )
      );
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = async () => {
    if (draggingPin) {
      const draggedPin = pins.find(p => p.id === draggingPin);
      if (draggedPin) {
        try {
          const { error } = await supabase
            .from('drawing_pins')
            .update({
              x: draggedPin.x,
              y: draggedPin.y,
            })
            .eq('id', draggingPin);

          if (error) throw error;
          console.log('[DrawingViewer] Pin position updated successfully');
        } catch (error) {
          console.error('[DrawingViewer] Error updating pin position:', error);
          loadPins();
        }
      }
      setDraggingPin(null);
    }
    setIsPanning(false);
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!addingPin) return;

    const targetElement = isPdf ? canvasRef.current : imageRef.current;
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      setNewPinPosition({ x, y });
      setShowAddPin(true);
    }
  };

  const handlePinMouseDown = (pin: Pin, e: React.MouseEvent) => {
    e.stopPropagation();
    if (addingPin) return;

    setDraggingPin(pin.id);

    const targetElement = isPdf ? canvasRef.current : imageRef.current;
    if (!targetElement) return;

    const rect = targetElement.getBoundingClientRect();
    const pinCenterX = pin.x * rect.width;
    const pinCenterY = pin.y * rect.height;

    setDragOffset({
      x: e.clientX - rect.left - pinCenterX,
      y: e.clientY - rect.top - pinCenterY,
    });
  };

  const handlePinClick = (pin: Pin, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!addingPin && !draggingPin) {
      setSelectedPin(pin);
    }
  };

  const getPinColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-500';
      case 'repair_required':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-orange-500';
      case 'not_started':
        return 'bg-blue-500';
      default:
        return 'bg-slate-500';
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pageCount) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      console.log('[DrawingViewer] Starting PDF export...');

      const blob = await exportDrawingWithPins({
        drawingId: drawing.id,
        storagePath: drawing.preview_image_path,
        pageNumber: isPdf ? currentPage : 1,
        projectName,
        blockName,
        levelName,
        canvasElement: isPdf ? canvasRef.current : null,
        imageElement: !isPdf ? imageRef.current : null,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = [
        projectName,
        blockName,
        levelName,
        `Page-${isPdf ? currentPage : 1}`,
      ]
        .filter(Boolean)
        .join('_')
        .replace(/[^a-z0-9_-]/gi, '_') + '.pdf';
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      console.log('[DrawingViewer] ✅ PDF export complete');
    } catch (error) {
      console.error('[DrawingViewer] ❌ PDF export failed:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative h-full flex flex-col bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-semibold">
            {isPdf && pageCount > 1 ? `Drawing - Page ${currentPage} of ${pageCount}` : `Drawing ${drawing.page_number || 1}`}
          </h3>
          {drawing.scale_factor && (
            <span className="text-xs text-slate-400">
              Scale: 1:{drawing.scale_factor}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPdf && pageCount > 1 && (
            <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1 mr-2">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="p-2 text-white hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-white text-sm">
                {currentPage} / {pageCount}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === pageCount}
                className="p-2 text-white hover:bg-slate-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export drawing with pins to PDF"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>

          <button
            onClick={() => setAddingPin(!addingPin)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              addingPin
                ? 'bg-primary-600 text-white'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            <Plus className="w-4 h-4" />
            {addingPin ? 'Click to Add Pin' : 'Add Pin'}
          </button>

          <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              className="p-2 text-white hover:bg-slate-600 rounded"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-3 text-white text-sm font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 text-white hover:bg-slate-600 rounded"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 text-white hover:bg-slate-600 rounded ml-1"
              title="Reset zoom"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: addingPin ? 'crosshair' : (draggingPin || isPanning) ? 'grabbing' : 'grab' }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <div ref={contentRef} className="relative" onClick={handleContentClick}>
            {imageLoading && !loadError && (
              <div className="flex items-center justify-center min-w-[400px] min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  <p className="text-slate-400 text-sm">Loading drawing...</p>
                </div>
              </div>
            )}

            {loadError && (
              <div className="flex items-center justify-center min-w-[400px] min-h-[400px]">
                <div className="text-center max-w-sm">
                  <p className="text-red-400 text-lg mb-2">Failed to load drawing</p>
                  <p className="text-slate-400 text-sm mb-4">{loadError}</p>
                  <button
                    onClick={() => { setLoadError(null); loadContent(); }}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            <canvas
              ref={canvasRef}
              className="select-none"
              style={{
                display: isPdf ? 'block' : 'none',
                visibility: pdfRendered ? 'visible' : 'hidden',
                minWidth: isPdf ? '1px' : undefined,
                minHeight: isPdf ? '1px' : undefined,
              }}
            />
            {!imageLoading && isPdf && (
              <div className="absolute inset-0 pointer-events-none">
                {filteredPins.map((pin) => (
                  <button
                    key={pin.id}
                    onMouseDown={(e) => handlePinMouseDown(pin, e)}
                    onClick={(e) => handlePinClick(pin, e)}
                    className={`absolute w-8 h-8 -ml-4 -mt-8 ${getPinColor(
                      pin.status
                    )} rounded-full border-2 border-white shadow-lg hover:scale-125 transition-transform flex items-center justify-center pointer-events-auto ${
                      draggingPin === pin.id ? 'scale-125 cursor-grabbing' : 'cursor-grab'
                    }`}
                    style={{
                      left: `${pin.x * 100}%`,
                      top: `${pin.y * 100}%`,
                      transition: draggingPin === pin.id ? 'none' : 'transform 0.2s',
                    }}
                    title={pin.label}
                  >
                    <MapPin className="w-5 h-5 text-white fill-current" />
                  </button>
                ))}
              </div>
            )}

            {!imageLoading && !isPdf && imageUrl && (
              <>
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Drawing"
                  className="max-w-full max-h-full select-none"
                  draggable={false}
                  onError={() => console.error('Failed to load image:', imageUrl)}
                />
                {filteredPins.map((pin) => (
                  <button
                    key={pin.id}
                    onMouseDown={(e) => handlePinMouseDown(pin, e)}
                    onClick={(e) => handlePinClick(pin, e)}
                    className={`absolute w-8 h-8 -ml-4 -mt-8 ${getPinColor(
                      pin.status
                    )} rounded-full border-2 border-white shadow-lg hover:scale-125 transition-transform flex items-center justify-center ${
                      draggingPin === pin.id ? 'scale-125 cursor-grabbing' : 'cursor-grab'
                    }`}
                    style={{
                      left: `${pin.x * 100}%`,
                      top: `${pin.y * 100}%`,
                      transition: draggingPin === pin.id ? 'none' : 'transform 0.2s',
                    }}
                    title={pin.label}
                  >
                    <MapPin className="w-5 h-5 text-white fill-current" />
                  </button>
                ))}
              </>
            )}

            {!imageLoading && !isPdf && !imageUrl && (
              <div className="flex items-center justify-center min-w-[400px] min-h-[400px] text-white">
                <div className="text-center">
                  <p className="text-lg mb-2">Failed to load drawing</p>
                  <p className="text-sm text-slate-400">Please try re-uploading the drawing</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>{filteredPins.length} pins{isPdf && pageCount > 1 ? ' on this page' : ''}</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Pass</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Repair</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Not Started</span>
              </div>
            </div>
          </div>
          <span>
            {addingPin
              ? 'Click on the drawing to place a pin'
              : 'Drag pins to reposition • Use mouse wheel to zoom, drag to pan'}
          </span>
        </div>
      </div>

      {showAddPin && newPinPosition && (
        <AddPinModal
          isOpen={showAddPin}
          drawingId={drawing.id}
          levelId={drawing.level_id}
          projectId={projectId}
          position={newPinPosition}
          pageNumber={isPdf ? currentPage : 1}
          onClose={() => {
            setShowAddPin(false);
            setNewPinPosition(null);
            setAddingPin(false);
          }}
          onSuccess={() => {
            setShowAddPin(false);
            setNewPinPosition(null);
            setAddingPin(false);
            loadPins();
            onPinAdded();
          }}
        />
      )}

      {selectedPin && (
        <PinDetailModal
          isOpen={!!selectedPin}
          pin={selectedPin}
          projectId={projectId}
          onClose={() => setSelectedPin(null)}
          onUpdate={loadPins}
        />
      )}
    </div>
  );
}
