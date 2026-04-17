import { useRef, useState, useCallback } from 'react';
import type { Annotation, AnnotationKind, ArrowAnnotation, RectAnnotation, TextAnnotation } from '../../utils/annotationTypes';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ffffff'];

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number
) {
  const headLen = 14;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function renderAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  w: number,
  h: number,
  currentPage: number
) {
  for (const ann of annotations) {
    if (ann.pageNumber !== currentPage) continue;
    ctx.save();
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (ann.kind === 'arrow') {
      const a = ann as ArrowAnnotation;
      const x1 = (a.x1 / 100) * w;
      const y1 = (a.y1 / 100) * h;
      const x2 = (a.x2 / 100) * w;
      const y2 = (a.y2 / 100) * h;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      drawArrowhead(ctx, x1, y1, x2, y2);
    } else if (ann.kind === 'rect') {
      const r = ann as RectAnnotation;
      const rx = (r.x / 100) * w;
      const ry = (r.y / 100) * h;
      const rw = (r.w / 100) * w;
      const rh = (r.h / 100) * h;
      ctx.strokeRect(rx, ry, rw, rh);
    } else if (ann.kind === 'text') {
      const t = ann as TextAnnotation;
      const tx = (t.x / 100) * w;
      const ty = (t.y / 100) * h;
      const fontSize = Math.max(13, Math.min(18, w / 50));
      ctx.font = `bold ${fontSize}px sans-serif`;
      const tw = ctx.measureText(t.text).width + 10;
      const th = fontSize + 8;
      ctx.fillStyle = `${ann.color}dd`;
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (...args: unknown[]) => void }).roundRect?.(tx - 5, ty - th + 4, tw, th, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'bottom';
      ctx.fillText(t.text, tx, ty + 2);
    }
    ctx.restore();
  }
}

interface AnnotationLayerProps {
  annotations: Annotation[];
  activeKind: AnnotationKind | null;
  activeColor: string;
  currentPage: number;
  containerWidth: number;
  containerHeight: number;
  onAdd: (ann: Annotation) => void;
}

export function AnnotationLayer({
  annotations,
  activeKind,
  activeColor,
  currentPage,
  containerWidth,
  containerHeight,
  onAdd,
}: AnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = useState('');

  const toPercent = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
      };
    },
    []
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderAnnotations(ctx, annotations, canvas.width, canvas.height, currentPage);

    if (drawing && start && preview && activeKind) {
      ctx.save();
      ctx.strokeStyle = activeColor;
      ctx.fillStyle = activeColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.setLineDash([6, 4]);
      const w = canvas.width;
      const h = canvas.height;
      if (activeKind === 'arrow') {
        const x1 = (start.x / 100) * w;
        const y1 = (start.y / 100) * h;
        const x2 = (preview.x / 100) * w;
        const y2 = (preview.y / 100) * h;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        drawArrowhead(ctx, x1, y1, x2, y2);
      } else if (activeKind === 'rect') {
        const rx = (start.x / 100) * w;
        const ry = (start.y / 100) * h;
        const rw = ((preview.x - start.x) / 100) * w;
        const rh = ((preview.y - start.y) / 100) * h;
        ctx.strokeRect(rx, ry, rw, rh);
      }
      ctx.restore();
    }
  }, [annotations, drawing, start, preview, activeKind, activeColor, currentPage]);

  useCallback(() => { redraw(); }, [redraw]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!activeKind) return;
    e.stopPropagation();
    if (activeKind === 'text') {
      const pos = toPercent(e.clientX, e.clientY);
      setTextInput(pos);
      setTextValue('');
      return;
    }
    setDrawing(true);
    setStart(toPercent(e.clientX, e.clientY));
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    setPreview(toPercent(e.clientX, e.clientY));
    redraw();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!drawing || !start) return;
    setDrawing(false);
    const end = toPercent(e.clientX, e.clientY);
    const id = `ann-${Date.now()}`;
    if (activeKind === 'arrow') {
      onAdd({ id, kind: 'arrow', color: activeColor, pageNumber: currentPage, x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    } else if (activeKind === 'rect') {
      onAdd({ id, kind: 'rect', color: activeColor, pageNumber: currentPage, x: start.x, y: start.y, w: end.x - start.x, h: end.y - start.y });
    }
    setStart(null);
    setPreview(null);
  };

  const handleTextSubmit = () => {
    if (!textInput || !textValue.trim()) { setTextInput(null); return; }
    onAdd({ id: `ann-${Date.now()}`, kind: 'text', color: activeColor, pageNumber: currentPage, x: textInput.x, y: textInput.y, text: textValue.trim() });
    setTextInput(null);
    setTextValue('');
  };

  const w = containerWidth;
  const h = containerHeight;

  return (
    <>
      <canvas
        ref={canvasRef}
        width={w}
        height={h}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: activeKind ? 'auto' : 'none',
          cursor: activeKind === 'text' ? 'text' : activeKind ? 'crosshair' : 'none',
          zIndex: 15,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {(() => {
        redraw();
        return null;
      })()}

      {textInput && (
        <div
          style={{
            position: 'absolute',
            left: `${textInput.x}%`,
            top: `${textInput.y}%`,
            zIndex: 40,
            transform: 'translate(0, -100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex items-center gap-0">
            <input
              autoFocus
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') { setTextInput(null); }
              }}
              placeholder="Type note…"
              className="bg-transparent text-white text-xs px-3 py-2 outline-none w-36 placeholder-slate-500"
            />
            <button
              onClick={handleTextSubmit}
              className="px-2 py-2 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTextInput(null)}
              className="px-2 py-2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <XMark className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export { renderAnnotations, COLORS };
export type { AnnotationLayerProps };
