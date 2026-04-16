import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
  X,
  Camera,
  Upload,
  Loader2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Flame,
  Eye,
  EyeOff,
  Info,
  Download,
} from 'lucide-react';
import { fetchPins, createPin, deletePin } from '../../services/spatialService';
import type { InspectionAIDrawing, InspectionAIPin } from '../../types';
import { clusterPins } from '../../utils/clusterEngine';
import { HeatmapCanvas, ClusterOverlay, HeatmapLegend } from './HeatmapOverlay';
import { exportDrawingSnapshot } from '../../utils/drawingExporter';

// ─── Severity colours ─────────────────────────
const SEVERITY_COLOUR: Record<string, string> = {
  High: '#dc2626',
  Medium: '#d97706',
  Low: '#16a34a',
};

function getPinColor(severity: string): string {
  return SEVERITY_COLOUR[severity] ?? '#64748b';
}

// ─── Pin marker ───────────────────────────────
function PinMarker({
  pin,
  index,
  selected,
  onSelect,
  onDelete,
}: {
  pin: InspectionAIPin;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const color = getPinColor(pin.severity);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${pin.x_percent}%`,
        top: `${pin.y_percent}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: selected ? 20 : 10,
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className="flex flex-col items-center group"
      >
        <div
          className="relative flex items-center justify-center text-white text-xs font-bold rounded-full shadow-lg transition-transform group-hover:scale-110"
          style={{
            width: selected ? 32 : 26,
            height: selected ? 32 : 26,
            backgroundColor: color,
            border: `2px solid white`,
            boxShadow: selected ? `0 0 0 3px ${color}40, 0 4px 12px rgba(0,0,0,0.3)` : '0 2px 6px rgba(0,0,0,0.25)',
          }}
        >
          {index + 1}
        </div>
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `7px solid ${color}`,
            marginTop: -1,
          }}
        />
      </button>

      {selected && (
        <div
          className="absolute bottom-full left-1/2 mb-1 bg-white rounded-xl shadow-xl border border-slate-200 p-3 min-w-[140px] text-left"
          style={{ transform: 'translateX(-50%)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-xs font-bold rounded-full px-2 py-0.5"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {pin.severity}
            </span>
            <button
              onClick={onDelete}
              className="text-slate-400 hover:text-red-500 transition-colors ml-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {pin.label && (
            <p className="text-xs text-slate-600 truncate max-w-[120px]">{pin.label}</p>
          )}
          {pin.item_id ? (
            <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
              <CheckCircle className="w-3 h-3" />
              Linked
            </p>
          ) : (
            <p className="flex items-center gap-1 text-xs text-amber-600 mt-1">
              <AlertTriangle className="w-3 h-3" />
              No inspection
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pending drop marker (before capture) ────
function DropMarker({ x, y }: { x: number; y: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      <div className="flex flex-col items-center animate-bounce">
        <div
          className="flex items-center justify-center text-white rounded-full shadow-lg"
          style={{
            width: 28, height: 28,
            backgroundColor: '#475569',
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <MapPin className="w-4 h-4" />
        </div>
        <div
          style={{
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '7px solid #475569',
            marginTop: -1,
          }}
        />
      </div>
    </div>
  );
}

// ─── Capture action sheet ─────────────────────
function CaptureSheet({
  onCapture,
  onUpload,
  onSkip,
  onCancel,
}: {
  onCapture: () => void;
  onUpload: () => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-900 text-base">Add Inspection at Pin</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500">Pin placed. Capture a photo to link an inspection finding, or skip to save the pin only.</p>

        <button
          onClick={onCapture}
          className="w-full flex items-center gap-3 bg-slate-900 text-white py-4 px-4 rounded-2xl font-semibold text-sm hover:bg-slate-800 transition-colors active:scale-95"
        >
          <Camera className="w-5 h-5" />
          <div className="text-left">
            <p className="font-bold">Take Photo</p>
            <p className="text-xs text-slate-400">Capture defect with AI analysis</p>
          </div>
        </button>
        <button
          onClick={onUpload}
          className="w-full flex items-center gap-3 border border-slate-200 text-slate-700 py-4 px-4 rounded-2xl font-semibold text-sm hover:bg-slate-50 transition-colors active:scale-95"
        >
          <Upload className="w-5 h-5" />
          <div className="text-left">
            <p className="font-bold">Upload Image</p>
            <p className="text-xs text-slate-400">Select from gallery</p>
          </div>
        </button>
        <button
          onClick={onSkip}
          className="w-full text-center text-slate-500 text-sm py-3 hover:text-slate-800 transition-colors"
        >
          Save pin without photo
        </button>
      </div>
    </div>
  );
}

// ─── View mode toggle ─────────────────────────
type ViewMode = 'pins' | 'heatmap' | 'clusters';

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const options: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'pins',     label: 'Pins',     icon: <MapPin className="w-3.5 h-3.5" /> },
    { value: 'heatmap',  label: 'Heat',     icon: <Flame className="w-3.5 h-3.5" /> },
    { value: 'clusters', label: 'Zones',    icon: <Info className="w-3.5 h-3.5" /> },
  ];
  return (
    <div className="flex rounded-lg border border-slate-700 overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            mode === o.value
              ? 'bg-white text-slate-900'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────
interface DrawingViewerProps {
  drawing: InspectionAIDrawing;
  reportId: string | null;
  onBack: () => void;
  onStartCapture: (pinId: string, useCamera: boolean) => void;
}

export function DrawingViewer({ drawing, reportId, onBack, onStartCapture }: DrawingViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [pins, setPins] = useState<InspectionAIPin[]>([]);
  const [loadingPins, setLoadingPins] = useState(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('pins');
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [showClusterPanel, setShowClusterPanel] = useState(false);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const didPan = useRef(false);

  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [showCaptureSheet, setShowCaptureSheet] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  const clusters = clusterPins(pins);
  const highClusters = clusters.filter((c) => c.dominantSeverity === 'High' && c.pins.length >= 2);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchPins(drawing.id)
      .then(setPins)
      .finally(() => setLoadingPins(false));
  }, [drawing.id]);

  const handleZoom = (direction: 'in' | 'out') => {
    setScale((s) => Math.max(0.5, Math.min(4, s + (direction === 'in' ? 0.3 : -0.3))));
  };

  const handleReset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const getImagePercent = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const img = imgRef.current;
      if (!img) return null;
      const rect = img.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      if (x < 0 || x > 100 || y < 0 || y > 100) return null;
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    didPan.current = false;
    panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.current = true;
    setOffset({ x: panStart.current.ox + dx, y: panStart.current.oy + dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    if (didPan.current) return;
    const coords = getImagePercent(e.clientX, e.clientY);
    if (!coords) { setSelectedPinId(null); return; }
    setPendingPin(coords);
    setShowCaptureSheet(true);
    setSelectedPinId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.5, Math.min(4, s - e.deltaY * 0.001)));
  };

  const savePendingPin = async (): Promise<string | null> => {
    if (!pendingPin) return null;
    setSavingPin(true);
    try {
      const pin = await createPin(drawing.id, pendingPin.x, pendingPin.y);
      setPins((prev) => [...prev, pin]);
      return pin.id;
    } finally {
      setSavingPin(false);
      setPendingPin(null);
    }
  };

  const handleCapture = async (useCamera: boolean) => {
    setShowCaptureSheet(false);
    const pinId = await savePendingPin();
    if (pinId) onStartCapture(pinId, useCamera);
  };

  const handleSkip = async () => {
    setShowCaptureSheet(false);
    await savePendingPin();
  };

  const handleCancelCapture = () => {
    setShowCaptureSheet(false);
    setPendingPin(null);
  };

  const handleDeletePin = async (pinId: string) => {
    await deletePin(pinId);
    setPins((prev) => prev.filter((p) => p.id !== pinId));
    setSelectedPinId(null);
  };

  const highCount = pins.filter((p) => p.severity === 'High').length;
  const medCount = pins.filter((p) => p.severity === 'Medium').length;
  const lowCount = pins.filter((p) => p.severity === 'Low').length;

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      {showCaptureSheet && (
        <CaptureSheet
          onCapture={() => handleCapture(true)}
          onUpload={() => handleCapture(false)}
          onSkip={handleSkip}
          onCancel={handleCancelCapture}
        />
      )}

      {savingPin && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-900 border-b border-slate-800 z-10 flex-shrink-0">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 mx-1">
          <p className="font-semibold text-white text-xs truncate">{drawing.name}</p>
        </div>
        <ViewToggle mode={viewMode} onChange={(m) => { setViewMode(m); setShowClusterPanel(m === 'clusters'); }} />
        <div className="flex items-center gap-1 ml-1">
          <button onClick={() => handleZoom('out')} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleZoom('in')} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleReset} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative cursor-crosshair select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onClick={() => { if (!isPanning) setSelectedPinId(null); }}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div className="relative inline-block" style={{ maxWidth: '100%', maxHeight: '100%' }}>
            {drawing.file_type === 'image' ? (
              <img
                ref={imgRef}
                src={drawing.file_url}
                alt={drawing.name}
                draggable={false}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  setImgSize({ width: el.offsetWidth, height: el.offsetHeight });
                }}
                className="block max-w-full max-h-[70vh] object-contain"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              />
            ) : (
              <div className="w-64 h-80 bg-slate-700 flex items-center justify-center rounded-xl">
                <p className="text-slate-400 text-sm text-center px-6">
                  PDF preview not supported.<br />Pins can still be placed.
                </p>
              </div>
            )}

            {viewMode === 'heatmap' && pins.length > 0 && imgSize.width > 0 && (
              <HeatmapCanvas pins={pins} width={imgSize.width} height={imgSize.height} />
            )}

            {viewMode === 'clusters' && imgSize.width > 0 && (
              <ClusterOverlay clusters={clusters} imgWidth={imgSize.width} imgHeight={imgSize.height} />
            )}

            {(viewMode === 'pins' || viewMode === 'clusters') && !loadingPins && pins.map((pin, i) => (
              <PinMarker
                key={pin.id}
                pin={pin}
                index={i}
                selected={selectedPinId === pin.id}
                onSelect={() => setSelectedPinId(selectedPinId === pin.id ? null : pin.id)}
                onDelete={() => handleDeletePin(pin.id)}
              />
            ))}

            {pendingPin && <DropMarker x={pendingPin.x} y={pendingPin.y} />}
          </div>
        </div>
      </div>

      {viewMode === 'heatmap' && pins.length > 0 && <HeatmapLegend />}

      {showClusterPanel && clusters.length > 0 && (
        <div className="absolute left-0 right-0 bottom-0 z-20 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 max-h-48 overflow-y-auto">
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <p className="text-xs font-bold text-white uppercase tracking-wide">Defect Zones</p>
            <span className="text-xs text-slate-400">{clusters.length} zone{clusters.length !== 1 ? 's' : ''}</span>
          </div>
          {clusters.map((c) => {
            const colour = c.dominantSeverity === 'High' ? 'text-red-400' : c.dominantSeverity === 'Medium' ? 'text-amber-400' : 'text-emerald-400';
            const dot = c.dominantSeverity === 'High' ? 'bg-red-500' : c.dominantSeverity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${colour} truncate`}>{c.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {c.severityCounts.High > 0 && `${c.severityCounts.High} High  `}
                    {c.severityCounts.Medium > 0 && `${c.severityCounts.Medium} Medium  `}
                    {c.severityCounts.Low > 0 && `${c.severityCounts.Low} Low`}
                  </p>
                </div>
                <span className="text-xs font-bold text-white bg-slate-700 px-2 py-0.5 rounded-full flex-shrink-0">
                  {c.pins.length}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {highCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                {highCount}H
              </span>
            )}
            {medCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                {medCount}M
              </span>
            )}
            {lowCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {lowCount}L
              </span>
            )}
            {pins.length === 0 && (
              <span className="text-xs text-slate-500">Tap drawing to place a pin</span>
            )}
            {highClusters.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-400 border border-red-800 px-2 py-0.5 rounded-full">
                <Flame className="w-3 h-3" />
                {highClusters.length} critical zone{highClusters.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{pins.length} pin{pins.length !== 1 ? 's' : ''}</span>
            {pins.length > 0 && (
              <button
                onClick={async () => {
                  setExporting(true);
                  try {
                    await exportDrawingSnapshot(drawing, pins, clusters, 'both');
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={exporting}
                className="flex items-center gap-1 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 border border-slate-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                {exporting ? 'Exporting…' : 'Export'}
              </button>
            )}
          </div>
        </div>

        {!reportId && pins.length > 0 && (
          <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Start an inspection to link pins to findings
          </p>
        )}
      </div>
    </div>
  );
}
