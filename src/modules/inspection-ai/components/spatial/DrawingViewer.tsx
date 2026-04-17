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
  Info,
  Download,
  Eye,
  ChevronUp,
  ArrowLeft,
  Plus,
  ScanLine,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileText,
  Minus,
  MoveRight,
  Square,
  Type,
  BarChart2,
} from 'lucide-react';
import { fetchPins, createPin, deletePin } from '../../services/spatialService';
import type { InspectionAIDrawing, InspectionAIPin } from '../../types';
import { clusterPins } from '../../utils/clusterEngine';
import { HeatmapCanvas, ClusterOverlay, HeatmapLegend } from './HeatmapOverlay';
import { exportDrawingSnapshot } from '../../utils/drawingExporter';
import { useFileRenderer, getDrawingKind, type RenderMetrics } from '../../utils/fileRenderer';
import { AnnotationLayer, renderAnnotations, COLORS } from './AnnotationLayer';
import type { Annotation, AnnotationKind } from '../../utils/annotationTypes';

const SEVERITY_COLOUR: Record<string, string> = {
  High:   '#dc2626',
  Medium: '#d97706',
  Low:    '#16a34a',
};

function getPinColor(severity: string): string {
  return SEVERITY_COLOUR[severity] ?? '#64748b';
}

function PinMarker({
  pin, index, selected, onSelect, onDelete, onCapture, onView,
}: {
  pin: InspectionAIPin; index: number; selected: boolean;
  onSelect: () => void; onDelete: () => void; onCapture: () => void; onView: () => void;
}) {
  const color = getPinColor(pin.severity);
  const isHigh = pin.severity === 'High';

  return (
    <div style={{ position: 'absolute', left: `${pin.x_percent}%`, top: `${pin.y_percent}%`, transform: 'translate(-50%, -100%)', zIndex: selected ? 20 : 10 }}>
      <button onClick={(e) => { e.stopPropagation(); onSelect(); }} className="flex flex-col items-center group" style={{ touchAction: 'manipulation' }}>
        {isHigh && !selected && (
          <span className="absolute rounded-full animate-ping" style={{ width: 34, height: 34, backgroundColor: `${color}40`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
        )}
        <div className="relative flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-110" style={{ width: selected ? 36 : 28, height: selected ? 36 : 28, backgroundColor: color, border: '2.5px solid white', borderRadius: '50%', boxShadow: selected ? `0 0 0 3px ${color}50, 0 4px 16px rgba(0,0,0,0.35)` : '0 2px 8px rgba(0,0,0,0.30)', transition: 'all 0.15s ease' }}>
          {index + 1}
        </div>
        <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `8px solid ${color}`, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))', marginTop: -1 }} />
      </button>

      {selected && (
        <div className="absolute bottom-full left-1/2 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-150 overflow-hidden" style={{ transform: 'translateX(-50%)', minWidth: 180, width: 'max-content', maxWidth: 220 }} onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: `${color}10`, borderBottom: `2px solid ${color}20` }}>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>{pin.severity}</span>
              <span className="text-[11px] text-slate-500 font-semibold">Pin #{index + 1}</span>
            </div>
            <button onClick={onDelete} className="w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3 h-3" /></button>
          </div>
          {pin.label && <p className="text-xs text-slate-600 px-3 py-1.5 font-medium truncate border-b border-slate-100">{pin.label}</p>}
          <div className="p-2 flex flex-col gap-1.5">
            {pin.item_id ? (
              <>
                <div className="flex items-center gap-1 px-1 text-[11px] text-emerald-600 font-semibold"><CheckCircle className="w-3 h-3" />Linked to finding</div>
                <button onClick={onView} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"><Eye className="w-3.5 h-3.5" />View Finding</button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 px-1 text-[11px] text-amber-600 font-semibold"><AlertTriangle className="w-3 h-3" />No inspection yet</div>
                <button onClick={onCapture} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"><Camera className="w-3.5 h-3.5" />Capture Now</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DropMarker({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)', zIndex: 30, pointerEvents: 'none' }}>
      <div className="flex flex-col items-center animate-bounce">
        <div className="flex items-center justify-center text-white rounded-full shadow-lg" style={{ width: 30, height: 30, backgroundColor: '#475569', border: '2.5px solid white', boxShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
          <MapPin className="w-4 h-4" />
        </div>
        <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '8px solid #475569', marginTop: -1 }} />
      </div>
    </div>
  );
}

function CaptureSheet({ onCapture, onUpload, onSkip, onCancel }: { onCapture: () => void; onUpload: () => void; onSkip: () => void; onCancel: () => void; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onCancel}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl pb-safe" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Link Finding to Pin</h3>
            <p className="text-xs text-slate-400 mt-0.5">Capture a photo or save pin only</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 space-y-2.5 pb-2">
          <button onClick={onCapture} className="w-full flex items-center gap-4 bg-slate-900 text-white py-4 px-5 rounded-2xl font-semibold text-sm hover:bg-slate-800 transition-colors active:scale-95">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0"><Camera className="w-5 h-5" /></div>
            <div className="text-left"><p className="font-bold text-sm">Take Photo</p><p className="text-xs text-slate-400">Capture defect · AI analysis</p></div>
          </button>
          <button onClick={onUpload} className="w-full flex items-center gap-4 border border-slate-200 bg-slate-50 text-slate-700 py-4 px-5 rounded-2xl font-semibold text-sm hover:bg-slate-100 transition-colors active:scale-95">
            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center flex-shrink-0"><Upload className="w-5 h-5 text-slate-500" /></div>
            <div className="text-left"><p className="font-bold text-sm">Upload Image</p><p className="text-xs text-slate-400">Select from gallery</p></div>
          </button>
        </div>
        <div className="px-5 pt-1">
          <button onClick={onSkip} className="w-full text-center text-slate-400 text-sm py-3 hover:text-slate-700 transition-colors font-medium">Save pin without photo</button>
        </div>
      </div>
    </div>
  );
}

type ViewMode = 'pins' | 'heatmap' | 'clusters';

function SegmentedControl({ mode, onChange, pinCount, hasHigh }: { mode: ViewMode; onChange: (m: ViewMode) => void; pinCount: number; hasHigh: boolean; }) {
  const options: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'pins',     label: 'Pins',  icon: <MapPin className="w-3.5 h-3.5" /> },
    { value: 'heatmap',  label: 'Heat',  icon: <Flame className="w-3.5 h-3.5" /> },
    { value: 'clusters', label: 'Zones', icon: <Layers className="w-3.5 h-3.5" /> },
  ];
  return (
    <div className="flex gap-0.5 bg-slate-800/80 rounded-xl p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}>
          {o.icon}{o.label}
          {o.value === 'pins' && pinCount > 0 && <span className={`text-[9px] font-bold px-1 rounded-full ml-0.5 ${mode === 'pins' ? 'bg-slate-900 text-white' : 'bg-slate-600 text-slate-300'}`}>{pinCount}</span>}
          {o.value === 'clusters' && hasHigh && mode !== 'clusters' && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />}
        </button>
      ))}
    </div>
  );
}

function AnnotationToolbar({
  activeKind,
  activeColor,
  onKindChange,
  onColorChange,
  onUndo,
  canUndo,
}: {
  activeKind: AnnotationKind | null;
  activeColor: string;
  onKindChange: (k: AnnotationKind | null) => void;
  onColorChange: (c: string) => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const tools: { kind: AnnotationKind; icon: React.ReactNode; label: string }[] = [
    { kind: 'arrow', icon: <MoveRight className="w-3.5 h-3.5" />, label: 'Arrow' },
    { kind: 'rect',  icon: <Square className="w-3.5 h-3.5" />, label: 'Box' },
    { kind: 'text',  icon: <Type className="w-3.5 h-3.5" />, label: 'Note' },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {tools.map((t) => (
        <button
          key={t.kind}
          onClick={() => onKindChange(activeKind === t.kind ? null : t.kind)}
          title={t.label}
          className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all shadow-lg active:scale-95 ${
            activeKind === t.kind
              ? 'bg-white text-slate-900 border-white shadow-md'
              : 'bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20'
          }`}
        >
          {t.icon}
        </button>
      ))}

      <div className="w-10 border-t border-white/10 my-0.5" />

      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onColorChange(c)}
          className="w-10 h-6 rounded-lg transition-transform active:scale-95"
          style={{
            backgroundColor: c,
            outline: activeColor === c ? '2px solid white' : '2px solid transparent',
            outlineOffset: 2,
          }}
        />
      ))}

      <div className="w-10 border-t border-white/10 my-0.5" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo last annotation"
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors shadow-lg disabled:opacity-30 text-xs font-bold"
      >
        ↩
      </button>
    </div>
  );
}

function FloatingZoomControls({ onZoomIn, onZoomOut, onReset }: { onZoomIn: () => void; onZoomOut: () => void; onReset: () => void; }) {
  return (
    <div className="flex flex-col gap-1.5">
      <button onClick={onZoomIn} title="Zoom in (+)" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors shadow-lg active:scale-95"><ZoomIn className="w-4 h-4" /></button>
      <button onClick={onZoomOut} title="Zoom out (-)" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors shadow-lg active:scale-95"><ZoomOut className="w-4 h-4" /></button>
      <div className="w-10 border-t border-white/10 my-0.5" />
      <button onClick={onReset} title="Fit to screen" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors shadow-lg active:scale-95"><Maximize2 className="w-4 h-4" /></button>
    </div>
  );
}

function PageNavigator({ currentPage, totalPages, onPrev, onNext }: { currentPage: number; totalPages: number; onPrev: () => void; onNext: () => void; }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1 bg-slate-800/80 backdrop-blur-sm rounded-xl px-1 py-1 border border-white/10">
      <button onClick={onPrev} disabled={currentPage <= 1} className="w-7 h-7 flex items-center justify-center rounded-lg text-white disabled:opacity-30 hover:bg-white/10 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
      <span className="text-xs font-bold text-white px-1 tabular-nums">{currentPage}/{totalPages}</span>
      <button onClick={onNext} disabled={currentPage >= totalPages} className="w-7 h-7 flex items-center justify-center rounded-lg text-white disabled:opacity-30 hover:bg-white/10 transition-colors"><ChevronRight className="w-4 h-4" /></button>
    </div>
  );
}

function ZonesDrawer({ clusters, onClose }: { clusters: ReturnType<typeof clusterPins>; onClose: () => void; }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-slate-950/98 backdrop-blur-sm border-t border-slate-800 rounded-t-2xl shadow-2xl">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <p className="text-xs font-bold text-white">Defect Zones</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{clusters.length} zone{clusters.length !== 1 ? 's' : ''} detected</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"><ChevronUp className="w-4 h-4" /></button>
      </div>
      <div className="max-h-44 overflow-y-auto pb-3">
        {clusters.length === 0 ? (
          <div className="px-4 py-4 text-center"><p className="text-xs text-slate-500">No clusters detected yet</p><p className="text-[10px] text-slate-600 mt-0.5">Add 2+ nearby pins to form a zone</p></div>
        ) : (
          clusters.map((c) => {
            const isCrit = c.dominantSeverity === 'High';
            const isMed  = c.dominantSeverity === 'Medium';
            const dotClass   = isCrit ? 'bg-red-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500';
            const labelClass = isCrit ? 'text-red-400' : isMed ? 'text-amber-400' : 'text-emerald-400';
            const badgeClass = isCrit ? 'bg-red-900/40 text-red-400 border-red-800' : isMed ? 'bg-amber-900/40 text-amber-400 border-amber-800' : 'bg-emerald-900/40 text-emerald-400 border-emerald-800';
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/60 last:border-0">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotClass}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${labelClass}`}>{c.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{[c.severityCounts.High > 0 && `${c.severityCounts.High} High`, c.severityCounts.Medium > 0 && `${c.severityCounts.Medium} Med`, c.severityCounts.Low > 0 && `${c.severityCounts.Low} Low`].filter(Boolean).join('  ·  ')}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>{c.pins.length} pins</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function HeatmapChip({ critCount, onCycle }: { critCount: number; onCycle: () => void }) {
  if (critCount === 0) return null;
  return (
    <button onClick={onCycle} className="flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-red-500 hover:bg-red-700 transition-colors active:scale-95">
      <Flame className="w-3.5 h-3.5" />{critCount} critical hotspot{critCount !== 1 ? 's' : ''}
    </button>
  );
}

function MetricsPanel({ metrics, onClose }: { metrics: RenderMetrics; onClose: () => void }) {
  const rows: [string, string][] = [
    ['Fetch', `${metrics.fetchMs.toFixed(0)} ms`],
    ['Decode', `${metrics.decodeMs.toFixed(0)} ms`],
    ['Render', `${metrics.renderMs.toFixed(0)} ms`],
    ['Total', `${metrics.totalMs.toFixed(0)} ms`],
    ['Resolution', `${metrics.naturalWidth} × ${metrics.naturalHeight}`],
    ['File size', `${(metrics.fileSizeBytes / 1024).toFixed(0)} KB`],
    ...(metrics.compressedBytes !== null ? [['Compressed', `${(metrics.compressedBytes / 1024).toFixed(0)} KB`] as [string, string]] : []),
  ];
  return (
    <div className="absolute top-14 right-3 z-30 bg-slate-950/95 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-3 min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Render Metrics</p>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 py-0.5">
          <span className="text-[10px] text-slate-500">{k}</span>
          <span className="text-[10px] font-bold text-slate-300 tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  );
}

function BottomActionBar({
  selectedPin, selectedPinIndex, pinCount, reportId, exporting,
  onAddPin, onCapture, onView, onDeleteSelected, onExport,
}: {
  selectedPin: InspectionAIPin | null; selectedPinIndex: number;
  pinCount: number; reportId: string | null; exporting: boolean;
  onAddPin: () => void; onCapture: () => void; onView: () => void;
  onDeleteSelected: () => void; onExport: () => void;
}) {
  if (selectedPin) {
    const color = getPinColor(selectedPin.severity);
    return (
      <div className="bg-slate-950/98 backdrop-blur-sm border-t border-slate-800 px-4 pt-3 flex-shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: color }}>{selectedPinIndex + 1}</div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-white">Pin #{selectedPinIndex + 1}</span>
            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${color}25`, color }}>{selectedPin.severity}</span>
          </div>
          <button onClick={onDeleteSelected} className="w-7 h-7 flex items-center justify-center rounded-full bg-red-950/60 border border-red-800 text-red-400 hover:bg-red-900 transition-colors" title="Delete pin (Del)"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCapture} className="flex items-center justify-center gap-1.5 bg-red-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 transition-colors active:scale-95"><Camera className="w-3.5 h-3.5" />{selectedPin.item_id ? 'Re-capture' : 'Capture'}</button>
          {selectedPin.item_id ? (
            <button onClick={onView} className="flex items-center justify-center gap-1.5 bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors active:scale-95"><Eye className="w-3.5 h-3.5" />View Finding</button>
          ) : (
            <button onClick={onDeleteSelected} className="flex items-center justify-center gap-1.5 bg-slate-800 text-slate-400 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors active:scale-95"><Trash2 className="w-3.5 h-3.5" />Remove Pin</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/98 backdrop-blur-sm border-t border-slate-800 px-4 pt-3 flex-shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {pinCount === 0 ? (
            <p className="text-xs text-slate-400"><ScanLine className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />Tap drawing to place a pin</p>
          ) : (
            <p className="text-xs text-slate-400">{pinCount} pin{pinCount !== 1 ? 's' : ''} · tap to select</p>
          )}
          {!reportId && pinCount > 0 && (
            <p className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3 flex-shrink-0" />Start inspection to link findings</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pinCount > 0 && (
            <button onClick={onExport} disabled={exporting} className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}Export
            </button>
          )}
          <button onClick={onAddPin} className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-xl transition-colors active:scale-95"><Plus className="w-3.5 h-3.5" />Add Pin</button>
        </div>
      </div>
    </div>
  );
}

function ViewerSkeleton() {
  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="flex items-center gap-2 px-3 py-3 bg-slate-950 border-b border-slate-800/60 flex-shrink-0">
        <div className="w-8 h-8 bg-slate-800 rounded-xl animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-slate-800 rounded w-40 animate-pulse" />
          <div className="h-2.5 bg-slate-800 rounded w-20 animate-pulse" />
        </div>
        <div className="w-28 h-8 bg-slate-800 rounded-xl animate-pulse" />
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        <div className="w-64 h-80 bg-slate-800 rounded-2xl animate-pulse flex flex-col items-center justify-center gap-3 border border-slate-700">
          <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
          <div className="h-3 bg-slate-700 rounded w-32 animate-pulse" />
          <div className="h-2.5 bg-slate-700 rounded w-24 animate-pulse" />
        </div>
      </div>
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-800 rounded animate-pulse" />
          <div className="w-20 h-7 bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

interface DrawingViewerProps {
  drawing: InspectionAIDrawing;
  reportId: string | null;
  onBack: () => void;
  onStartCapture: (pinId: string, useCamera: boolean) => void;
}

export function DrawingViewer({ drawing, reportId, onBack, onStartCapture }: DrawingViewerProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const canvasContRef  = useRef<HTMLDivElement>(null);

  const fileKind = getDrawingKind(drawing);

  const { rendered, loading: fileLoading, error: fileError, totalPages, currentPage, prevPage, nextPage, metrics } =
    useFileRenderer(drawing.file_url, fileKind, drawing.page_count ?? 1);

  const [pinsPerPage, setPinsPerPage]   = useState<Map<number, InspectionAIPin[]>>(new Map());
  const [loadingPins, setLoadingPins]   = useState(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [viewMode, setViewMode]         = useState<ViewMode>('pins');
  const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0 });
  const [showZoneDrawer, setShowZoneDrawer] = useState(false);
  const [showMetrics, setShowMetrics]   = useState(false);

  const [scale, setScale]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const didPan   = useRef(false);

  const [pendingPin, setPendingPin]     = useState<{ x: number; y: number } | null>(null);
  const [showCapSheet, setShowCapSheet] = useState(false);
  const [savingPin, setSavingPin]       = useState(false);
  const [exporting, setExporting]       = useState(false);

  const [annotations, setAnnotations]     = useState<Annotation[]>([]);
  const [activeAnnotKind, setActiveAnnotKind] = useState<AnnotationKind | null>(null);
  const [annotColor, setAnnotColor]       = useState(COLORS[0]);

  const [lastTouchDist, setLastTouchDist] = useState<number | null>(null);

  const pins = pinsPerPage.get(currentPage) ?? [];
  const clusters     = clusterPins(pins);
  const highClusters = clusters.filter((c) => c.dominantSeverity === 'High' && c.pins.length >= 2);
  const highCount    = pins.filter((p) => p.severity === 'High').length;
  const medCount     = pins.filter((p) => p.severity === 'Medium').length;
  const lowCount     = pins.filter((p) => p.severity === 'Low').length;
  const selectedPin  = pins.find((p) => p.id === selectedPinId) ?? null;
  const selectedIdx  = selectedPin ? pins.indexOf(selectedPin) : -1;

  useEffect(() => {
    fetchPins(drawing.id)
      .then((fetched) => {
        const map = new Map<number, InspectionAIPin[]>();
        for (const pin of fetched) {
          const pg = (pin as InspectionAIPin & { page_number?: number }).page_number ?? 1;
          if (!map.has(pg)) map.set(pg, []);
          map.get(pg)!.push(pin);
        }
        setPinsPerPage(map);
      })
      .finally(() => setLoadingPins(false));
  }, [drawing.id]);

  useEffect(() => {
    if (rendered) setRenderedSize({ width: rendered.width, height: rendered.height });
  }, [rendered]);

  useEffect(() => {
    setSelectedPinId(null);
    setPendingPin(null);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [currentPage]);

  const handleZoom = useCallback((direction: 'in' | 'out') =>
    setScale((s) => Math.max(0.3, Math.min(6, s + (direction === 'in' ? 0.3 : -0.3)))), []);

  const handleReset = useCallback(() => { setScale(1); setOffset({ x: 0, y: 0 }); }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '+' || e.key === '=') { e.preventDefault(); handleZoom('in'); }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); handleZoom('out'); }
      if (e.key === ' ') { e.preventDefault(); setSpaceHeld(true); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPinId) {
        e.preventDefault();
        handleDeletePin(selectedPinId);
      }
      if (e.key === 'Escape') { setSelectedPinId(null); setActiveAnnotKind(null); }
      if (e.key === 'ArrowLeft' && totalPages > 1) { e.preventDefault(); prevPage(); }
      if (e.key === 'ArrowRight' && totalPages > 1) { e.preventDefault(); nextPage(); }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === ' ') setSpaceHeld(false); };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [selectedPinId, totalPages, prevPage, nextPage, handleZoom]);

  const getPercent = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const el = canvasContRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return null;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (activeAnnotKind) return;
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
    if (activeAnnotKind) return;
    const coords = getPercent(e.clientX, e.clientY);
    if (!coords) { setSelectedPinId(null); return; }
    setPendingPin(coords);
    setShowCapSheet(true);
    setSelectedPinId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.3, Math.min(6, s - e.deltaY * 0.001)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setLastTouchDist(Math.hypot(dx, dy));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist - lastTouchDist;
      setScale((s) => Math.max(0.3, Math.min(6, s + delta * 0.01)));
      setLastTouchDist(dist);
    }
  };

  const handleTouchEnd = () => setLastTouchDist(null);

  const savePendingPin = async (): Promise<string | null> => {
    if (!pendingPin) return null;
    setSavingPin(true);
    try {
      const pin = await createPin(drawing.id, pendingPin.x, pendingPin.y);
      const pg = currentPage;
      setPinsPerPage((prev) => { const next = new Map(prev); next.set(pg, [...(next.get(pg) ?? []), pin]); return next; });
      return pin.id;
    } finally { setSavingPin(false); setPendingPin(null); }
  };

  const handleCapture = async (useCamera: boolean) => {
    setShowCapSheet(false);
    const pinId = await savePendingPin();
    if (pinId) onStartCapture(pinId, useCamera);
  };

  const handleDeletePin = async (pinId: string) => {
    await deletePin(pinId);
    setPinsPerPage((prev) => { const next = new Map(prev); for (const [pg, pgPins] of next.entries()) next.set(pg, pgPins.filter((p) => p.id !== pinId)); return next; });
    setSelectedPinId(null);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (rendered?.canvas) {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = rendered.canvas.width;
        exportCanvas.height = rendered.canvas.height;
        const ctx = exportCanvas.getContext('2d')!;
        ctx.drawImage(rendered.canvas, 0, 0);
        if (annotations.length > 0) {
          renderAnnotations(ctx, annotations, exportCanvas.width, exportCanvas.height, currentPage);
        }
        await exportDrawingSnapshot(drawing, pins, clusters, 'both', exportCanvas);
      } else {
        await exportDrawingSnapshot(drawing, pins, clusters, 'both', null);
      }
    } finally { setExporting(false); }
  };

  const cursorStyle = activeAnnotKind
    ? (activeAnnotKind === 'text' ? 'text' : 'crosshair')
    : spaceHeld || isPanning
    ? 'grabbing'
    : 'crosshair';

  if (fileLoading && !rendered) return <ViewerSkeleton />;

  return (
    <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {showCapSheet && (
        <CaptureSheet
          onCapture={() => { setShowCapSheet(false); savePendingPin().then((id) => id && onStartCapture(id, true)); }}
          onUpload={() => { setShowCapSheet(false); savePendingPin().then((id) => id && onStartCapture(id, false)); }}
          onSkip={() => { setShowCapSheet(false); savePendingPin(); }}
          onCancel={() => { setShowCapSheet(false); setPendingPin(null); }}
        />
      )}

      {savingPin && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl px-6 py-4 flex items-center gap-3 shadow-2xl"><Loader2 className="w-5 h-5 text-slate-600 animate-spin" /><span className="text-sm font-semibold text-slate-700">Placing pin…</span></div>
        </div>
      )}

      {showMetrics && metrics && <MetricsPanel metrics={metrics} onClose={() => setShowMetrics(false)} />}

      <div className="flex items-center gap-2 px-3 py-3 bg-slate-950 border-b border-slate-800/60 z-10 flex-shrink-0">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"><ArrowLeft className="w-4 h-4" /></button>

        <div className="flex-1 min-w-0 mx-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white text-sm truncate leading-tight">{drawing.name}</p>
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md flex-shrink-0">
              {fileKind === 'pdf' ? <><FileText className="w-2.5 h-2.5" />PDF</> : <><Info className="w-2.5 h-2.5" />IMG</>}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {highCount > 0 && <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{highCount}H</span>}
            {medCount  > 0 && <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />{medCount}M</span>}
            {lowCount  > 0 && <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{lowCount}L</span>}
            {pins.length === 0 && !loadingPins && <span className="text-[10px] text-slate-600">No pins yet</span>}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {metrics && (
            <button onClick={() => setShowMetrics((v) => !v)} title="Performance metrics" className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showMetrics ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          )}
          <SegmentedControl mode={viewMode} onChange={(m) => { setViewMode(m); setShowZoneDrawer(m === 'clusters'); }} pinCount={pins.length} hasHigh={highClusters.length > 0} />
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full overflow-hidden relative select-none"
          style={{ cursor: cursorStyle }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => { if (!isPanning && !activeAnnotKind) setSelectedPinId(null); }}
        >
          <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: 'center center', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', willChange: 'transform' }}>
            <div className="relative inline-block" style={{ maxWidth: '100%', maxHeight: '100%' }}>
              {fileLoading && (
                <div className="w-72 h-96 bg-slate-800 flex items-center justify-center rounded-2xl border border-slate-700">
                  <div className="text-center px-6"><Loader2 className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-spin" /><p className="text-slate-400 text-sm font-medium">Loading drawing preview…</p></div>
                </div>
              )}

              {fileError && !fileLoading && (
                <div className="w-72 h-64 bg-slate-800 flex items-center justify-center rounded-2xl border border-slate-700">
                  <div className="text-center px-6"><AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" /><p className="text-slate-300 text-sm font-medium">Preview unavailable</p><p className="text-slate-500 text-xs mt-1">Pins can still be placed</p></div>
                </div>
              )}

              {rendered && !fileLoading && (
                <div
                  ref={canvasContRef}
                  className="relative"
                  style={{ display: 'inline-block', maxWidth: '100%', maxHeight: '65vh', lineHeight: 0 }}
                >
                  <img
                    src={rendered.canvas.toDataURL('image/png')}
                    alt={drawing.name}
                    draggable={false}
                    onLoad={(e) => { const el = e.currentTarget; setRenderedSize({ width: el.offsetWidth, height: el.offsetHeight }); }}
                    className="block rounded-lg shadow-2xl"
                    style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }}
                  />

                  {viewMode === 'heatmap' && pins.length > 0 && renderedSize.width > 0 && (
                    <HeatmapCanvas pins={pins} width={renderedSize.width} height={renderedSize.height} />
                  )}

                  {viewMode === 'clusters' && renderedSize.width > 0 && (
                    <ClusterOverlay clusters={clusters} imgWidth={renderedSize.width} imgHeight={renderedSize.height} />
                  )}

                  {(viewMode === 'pins' || viewMode === 'clusters') && !loadingPins && pins.map((pin, i) => (
                    <PinMarker key={pin.id} pin={pin} index={i} selected={selectedPinId === pin.id}
                      onSelect={() => setSelectedPinId(selectedPinId === pin.id ? null : pin.id)}
                      onDelete={() => handleDeletePin(pin.id)}
                      onCapture={() => onStartCapture(pin.id, true)}
                      onView={() => {}}
                    />
                  ))}

                  {pendingPin && <DropMarker x={pendingPin.x} y={pendingPin.y} />}

                  {renderedSize.width > 0 && (
                    <AnnotationLayer
                      annotations={annotations}
                      activeKind={activeAnnotKind}
                      activeColor={annotColor}
                      currentPage={currentPage}
                      containerWidth={renderedSize.width}
                      containerHeight={renderedSize.height}
                      onAdd={(ann) => setAnnotations((prev) => [...prev, ann])}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute left-3 bottom-5 z-10 flex flex-col items-center gap-1">
          <AnnotationToolbar
            activeKind={activeAnnotKind}
            activeColor={annotColor}
            onKindChange={setActiveAnnotKind}
            onColorChange={setAnnotColor}
            onUndo={() => setAnnotations((prev) => prev.slice(0, -1))}
            canUndo={annotations.filter((a) => a.pageNumber === currentPage).length > 0}
          />
        </div>

        <div className="absolute right-3 bottom-5 z-10 flex flex-col items-center gap-1">
          <FloatingZoomControls onZoomIn={() => handleZoom('in')} onZoomOut={() => handleZoom('out')} onReset={handleReset} />
        </div>

        {totalPages > 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
            <PageNavigator currentPage={currentPage} totalPages={totalPages} onPrev={prevPage} onNext={nextPage} />
          </div>
        )}

        {viewMode === 'heatmap' && pins.length > 0 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10" style={{ marginTop: totalPages > 1 ? 40 : 0 }}>
            <HeatmapChip critCount={highClusters.length} onCycle={() => {}} />
          </div>
        )}

        {viewMode === 'heatmap' && pins.length > 0 && (
          <div className="absolute bottom-4 left-16 z-10"><HeatmapLegend /></div>
        )}

        {showZoneDrawer && <ZonesDrawer clusters={clusters} onClose={() => setShowZoneDrawer(false)} />}

        {activeAnnotKind && (
          <div className="absolute top-3 right-16 z-10 flex items-center gap-1.5 bg-slate-800/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
            {activeAnnotKind === 'arrow' && <MoveRight className="w-3.5 h-3.5" />}
            {activeAnnotKind === 'rect'  && <Square className="w-3.5 h-3.5" />}
            {activeAnnotKind === 'text'  && <Type className="w-3.5 h-3.5" />}
            <span className="capitalize">{activeAnnotKind} tool active</span>
            <button onClick={() => setActiveAnnotKind(null)} className="ml-1 text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
          </div>
        )}

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-slate-900/70 backdrop-blur-sm text-slate-400 text-[10px] px-3 py-1 rounded-full border border-white/5 pointer-events-none select-none hidden sm:flex">
          <span><kbd className="font-mono bg-slate-800 px-1 rounded text-[9px]">+</kbd> zoom</span>
          <span className="text-slate-600">·</span>
          <span><kbd className="font-mono bg-slate-800 px-1 rounded text-[9px]">-</kbd> zoom</span>
          <span className="text-slate-600">·</span>
          <span><kbd className="font-mono bg-slate-800 px-1 rounded text-[9px]">Del</kbd> remove pin</span>
          {totalPages > 1 && <><span className="text-slate-600">·</span><span><kbd className="font-mono bg-slate-800 px-1 rounded text-[9px]">←→</kbd> pages</span></>}
        </div>
      </div>

      <BottomActionBar
        selectedPin={selectedPin} selectedPinIndex={selectedIdx}
        pinCount={pins.length} reportId={reportId} exporting={exporting}
        onAddPin={() => { setPendingPin({ x: 50, y: 50 }); setShowCapSheet(true); setSelectedPinId(null); }}
        onCapture={() => selectedPin && onStartCapture(selectedPin.id, true)}
        onView={() => {}}
        onDeleteSelected={() => selectedPin && handleDeletePin(selectedPin.id)}
        onExport={handleExport}
      />
    </div>
  );
}
