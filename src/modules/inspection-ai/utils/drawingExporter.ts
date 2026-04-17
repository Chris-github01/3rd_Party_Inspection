import type { InspectionAIDrawing, InspectionAIPin } from '../types';
import type { PinCluster } from './clusterEngine';

const SEVERITY_COLOUR: Record<string, string> = {
  High:   '#dc2626',
  Medium: '#d97706',
  Low:    '#16a34a',
};

const CLUSTER_FILL: Record<string, string> = {
  High:   'rgba(220,38,38,0.18)',
  Medium: 'rgba(217,119,6,0.15)',
  Low:    'rgba(22,163,74,0.13)',
};

const CLUSTER_STROKE: Record<string, string> = {
  High:   'rgba(220,38,38,0.7)',
  Medium: 'rgba(217,119,6,0.65)',
  Low:    'rgba(22,163,74,0.6)',
};

function drawHeatmap(ctx: CanvasRenderingContext2D, pins: InspectionAIPin[], w: number, h: number) {
  const WEIGHT: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
  const r = Math.min(w, h) * 0.1;
  for (const pin of pins) {
    const x = (pin.x_percent / 100) * w;
    const y = (pin.y_percent / 100) * h;
    const weight = WEIGHT[pin.severity] ?? 1;
    const radius = r * (0.6 + weight * 0.3);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0,    `rgba(255,60,0,${0.3 * weight})`);
    grad.addColorStop(0.45, `rgba(255,140,0,${0.16 * weight})`);
    grad.addColorStop(0.8,  `rgba(255,220,50,${0.06 * weight})`);
    grad.addColorStop(1,    'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawClusters(ctx: CanvasRenderingContext2D, clusters: PinCluster[], w: number, h: number) {
  for (const c of clusters.filter((c) => c.pins.length >= 2)) {
    const cx = (c.centroid.x / 100) * w;
    const cy = (c.centroid.y / 100) * h;
    const rx = ((c.radius + 4) / 100) * w + 14;
    const ry = ((c.radius + 4) / 100) * h + 14;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = CLUSTER_FILL[c.dominantSeverity] ?? CLUSTER_FILL.Medium;
    ctx.fill();

    ctx.strokeStyle = CLUSTER_STROKE[c.dominantSeverity] ?? CLUSTER_STROKE.Medium;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    const label = c.label;
    const fontSize = Math.max(10, Math.min(14, w * 0.015));
    ctx.font = `bold ${fontSize}px sans-serif`;
    const tw = ctx.measureText(label).width;
    const bx = cx - tw / 2 - 7;
    const by = cy - ry - 18;
    const bw = tw + 14;
    const bh = fontSize + 8;

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 4);
    ctx.fill();

    ctx.strokeStyle = CLUSTER_STROKE[c.dominantSeverity] ?? CLUSTER_STROKE.Medium;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 4);
    ctx.stroke();

    ctx.fillStyle = SEVERITY_COLOUR[c.dominantSeverity] ?? '#374151';
    ctx.fillText(label, cx - tw / 2, by + bh - 6);
  }
}

function drawPins(ctx: CanvasRenderingContext2D, pins: InspectionAIPin[], w: number, h: number) {
  pins.forEach((pin, i) => {
    const x = (pin.x_percent / 100) * w;
    const y = (pin.y_percent / 100) * h;
    const r = 10;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = SEVERITY_COLOUR[pin.severity] ?? '#64748b';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = `bold ${r * 1.1}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x, y);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  });
}

function drawLegend(ctx: CanvasRenderingContext2D, w: number, h: number, clusters: PinCluster[]) {
  const critical = clusters.filter((c) => c.dominantSeverity === 'High' && c.pins.length >= 2).length;
  const elevated = clusters.filter((c) => c.dominantSeverity === 'Medium' && c.pins.length >= 2).length;
  const total = clusters.reduce((s, c) => s + c.pins.length, 0);

  const items: Array<[string, string]> = [];
  if (critical > 0) items.push([`${critical} critical zone${critical !== 1 ? 's' : ''}`, '#dc2626']);
  if (elevated > 0) items.push([`${elevated} elevated zone${elevated !== 1 ? 's' : ''}`, '#d97706']);
  items.push([`${total} findings total`, '#475569']);

  const pad = 12;
  const lineH = 20;
  const boxH = items.length * lineH + pad * 2;
  const boxW = 190;
  const bx = w - boxW - 12;
  const by = h - boxH - 12;

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 8);
  ctx.fill();

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 8);
  ctx.stroke();

  ctx.font = 'bold 11px sans-serif';
  items.forEach(([text, colour], i) => {
    const y = by + pad + i * lineH + 13;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(bx + pad + 5, y - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#374151';
    ctx.font = '11px sans-serif';
    ctx.fillText(text, bx + pad + 15, y);
  });
}

export async function exportDrawingSnapshot(
  drawing: InspectionAIDrawing,
  pins: InspectionAIPin[],
  clusters: PinCluster[],
  mode: 'heatmap' | 'zones' | 'both' = 'both',
  preRenderedCanvas: HTMLCanvasElement | null = null
): Promise<void> {
  let srcCanvas: HTMLCanvasElement;

  if (preRenderedCanvas) {
    srcCanvas = preRenderedCanvas;
  } else {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = drawing.file_url;
    });
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = img.naturalWidth;
    tmpCanvas.height = img.naturalHeight;
    tmpCanvas.getContext('2d')!.drawImage(img, 0, 0);
    srcCanvas = tmpCanvas;
  }

  const MAX = 1400;
  const scale = Math.min(1, MAX / Math.max(srcCanvas.width, srcCanvas.height));
  const w = Math.round(srcCanvas.width * scale);
  const h = Math.round(srcCanvas.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(srcCanvas, 0, 0, w, h);

  if (mode === 'heatmap' || mode === 'both') {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    drawHeatmap(ctx, pins, w, h);
    ctx.restore();
  }

  if (mode === 'zones' || mode === 'both') {
    drawClusters(ctx, clusters, w, h);
  }

  drawPins(ctx, pins, w, h);
  drawLegend(ctx, w, h, clusters);

  const watermark = `Exported — ${drawing.name} — ${new Date().toLocaleDateString('en-NZ')}`;
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(100,116,139,0.7)';
  ctx.fillText(watermark, 12, h - 10);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png', 0.95);
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${drawing.name.replace(/\s+/g, '-')}-zone-analysis.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function generatePinSnapshot(
  drawingUrl: string,
  pin: { x_percent: number; y_percent: number; severity: string; label: string }
): Promise<Blob | null> {
  try {
    let src = drawingUrl;
    try {
      const r = await fetch(drawingUrl);
      if (r.ok) {
        const blob = await r.blob();
        src = URL.createObjectURL(blob);
      }
    } catch {
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });

    const MAX = 800;
    const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);

    const px = (pin.x_percent / 100) * w;
    const py = (pin.y_percent / 100) * h;
    const colour = SEVERITY_COLOUR[pin.severity] ?? '#64748b';
    const r = 14;

    ctx.beginPath();
    ctx.arc(px, py - r, r, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 6, py - r);
    ctx.lineTo(px + 6, py - r);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();

    if (pin.label) {
      ctx.font = `bold ${Math.max(11, Math.min(16, w / 40))}px sans-serif`;
      const textW = ctx.measureText(pin.label).width + 12;
      const textH = 22;
      const tx = Math.max(4, Math.min(w - textW - 4, px - textW / 2));
      const ty = py - r * 2 - textH - 4;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.roundRect(tx, ty, textW, textH, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(pin.label, tx + 6, ty + textH / 2);
    }

    if (src.startsWith('blob:')) URL.revokeObjectURL(src);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88);
    });
  } catch {
    return null;
  }
}
