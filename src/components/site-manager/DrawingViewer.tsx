import { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
  Plus,
  FileImage,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
}

interface DrawingViewerProps {
  drawing: Drawing;
  projectId: string;
  onClose: () => void;
  onPinAdded: () => void;
}

export function DrawingViewer({ drawing, projectId, onClose, onPinAdded }: DrawingViewerProps) {
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
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    loadPins();
    loadImage();
  }, [drawing.id]);

  const loadImage = async () => {
    try {
      setImageLoading(true);

      // Check if it's a PDF based on file extension
      const isPdfFile = drawing.preview_image_path.toLowerCase().endsWith('.pdf');
      setIsPdf(isPdfFile);

      // Check if it's already a full URL
      if (drawing.preview_image_path.startsWith('http')) {
        setImageUrl(drawing.preview_image_path);
      } else {
        // It's a storage path, generate public URL
        const { data } = supabase.storage
          .from('documents')
          .getPublicUrl(drawing.preview_image_path);
        setImageUrl(data.publicUrl);
      }
    } catch (error) {
      console.error('Error loading image:', error);
    } finally {
      setImageLoading(false);
    }
  };

  const loadPins = async () => {
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
  };

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
    if (addingPin) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!addingPin || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      setNewPinPosition({ x, y });
      setShowAddPin(true);
    }
  };

  const handlePinClick = (pin: Pin, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!addingPin) {
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

  return (
    <div className="relative h-full flex flex-col bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-semibold">
            Drawing {drawing.page_number || 1}
          </h3>
          {drawing.scale_factor && (
            <span className="text-xs text-slate-400">
              Scale: 1:{drawing.scale_factor}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
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
        onClick={handleImageClick}
        style={{ cursor: addingPin ? 'crosshair' : isPanning ? 'grabbing' : 'grab' }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <div className="relative">
            {imageLoading ? (
              <div className="flex items-center justify-center min-w-[400px] min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : isPdf ? (
              <div className="flex items-center justify-center min-w-[600px] min-h-[400px] text-white">
                <div className="text-center max-w-md bg-slate-800 p-8 rounded-lg border border-slate-600">
                  <FileImage className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg mb-2 font-semibold">PDF Drawing Detected</p>
                  <p className="text-sm text-slate-300 mb-4">
                    PDF files cannot be annotated with pins. To use the pin annotation feature, please:
                  </p>
                  <ol className="text-sm text-slate-300 text-left space-y-2 mb-4">
                    <li>1. Convert the PDF to an image (PNG or JPG)</li>
                    <li>2. Re-upload the image file</li>
                  </ol>
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    View PDF
                  </a>
                </div>
              </div>
            ) : imageUrl ? (
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Drawing"
                className="max-w-full max-h-full select-none"
                draggable={false}
                onError={() => console.error('Failed to load image:', imageUrl)}
              />
            ) : (
              <div className="flex items-center justify-center min-w-[400px] min-h-[400px] text-white">
                <div className="text-center">
                  <p className="text-lg mb-2">Failed to load drawing</p>
                  <p className="text-sm text-slate-400">Please try re-uploading the drawing</p>
                </div>
              </div>
            )}

            {pins.map((pin) => (
              <button
                key={pin.id}
                onClick={(e) => handlePinClick(pin, e)}
                className={`absolute w-8 h-8 -ml-4 -mt-8 ${getPinColor(
                  pin.status
                )} rounded-full border-2 border-white shadow-lg hover:scale-125 transition-transform flex items-center justify-center`}
                style={{
                  left: `${pin.x * 100}%`,
                  top: `${pin.y * 100}%`,
                }}
                title={pin.label}
              >
                <MapPin className="w-5 h-5 text-white fill-current" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>{pins.length} pins</span>
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
              : 'Use mouse wheel to zoom, drag to pan'}
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
