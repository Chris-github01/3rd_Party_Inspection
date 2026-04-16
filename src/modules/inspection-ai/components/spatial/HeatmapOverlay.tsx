import { useEffect, useRef } from 'react';
import type { InspectionAIPin } from '../../types';
import type { PinCluster } from '../../utils/clusterEngine';

const CLUSTER_COLOURS: Record<string, { fill: string; stroke: string; text: string }> = {
  High:   { fill: 'rgba(220,38,38,0.18)',  stroke: 'rgba(220,38,38,0.7)',  text: '#dc2626' },
  Medium: { fill: 'rgba(217,119,6,0.15)',  stroke: 'rgba(217,119,6,0.65)', text: '#d97706' },
  Low:    { fill: 'rgba(22,163,74,0.13)',  stroke: 'rgba(22,163,74,0.6)',  text: '#16a34a' },
};

// ─── Heatmap canvas ───────────────────────────
export function HeatmapCanvas({
  pins,
  width,
  height,
}: {
  pins: InspectionAIPin[];
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const SEVERITY_WEIGHT: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    const radius = Math.min(width, height) * 0.12;

    for (const pin of pins) {
      const x = (pin.x_percent / 100) * width;
      const y = (pin.y_percent / 100) * height;
      const w = SEVERITY_WEIGHT[pin.severity] ?? 1;
      const r = radius * (0.6 + w * 0.3);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0,   `rgba(255, 60,  0, ${0.28 * w})`);
      grad.addColorStop(0.4, `rgba(255,140,  0, ${0.16 * w})`);
      grad.addColorStop(0.75,`rgba(255,220, 50, ${0.06 * w})`);
      grad.addColorStop(1,   'rgba(255,255,255,0)');

      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [pins, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        mixBlendMode: 'multiply',
      }}
    />
  );
}

// ─── Cluster bubble overlay ───────────────────
export function ClusterOverlay({
  clusters,
  imgWidth,
  imgHeight,
}: {
  clusters: PinCluster[];
  imgWidth: number;
  imgHeight: number;
}) {
  if (imgWidth === 0 || imgHeight === 0) return null;

  return (
    <>
      {clusters.filter((c) => c.pins.length >= 2).map((cluster) => {
        const cx = (cluster.centroid.x / 100) * imgWidth;
        const cy = (cluster.centroid.y / 100) * imgHeight;
        const rx = (cluster.radius / 100) * imgWidth + 16;
        const ry = (cluster.radius / 100) * imgHeight + 16;
        const colours = CLUSTER_COLOURS[cluster.dominantSeverity] ?? CLUSTER_COLOURS.Medium;

        return (
          <div
            key={cluster.id}
            style={{
              position: 'absolute',
              left: cx - rx,
              top: cy - ry,
              width: rx * 2,
              height: ry * 2,
              borderRadius: '50%',
              background: colours.fill,
              border: `2px dashed ${colours.stroke}`,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                marginTop: -20,
                background: 'white',
                border: `1.5px solid ${colours.stroke}`,
                color: colours.text,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              }}
            >
              {cluster.pins.length} findings
            </span>
          </div>
        );
      })}
    </>
  );
}

// ─── Legend ───────────────────────────────────
export function HeatmapLegend() {
  return (
    <div className="absolute bottom-14 right-3 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 px-3 py-2 shadow-md pointer-events-none z-20">
      <p className="text-xs font-bold text-slate-700 mb-1.5">Defect Density</p>
      <div
        className="w-28 h-3 rounded-full mb-1"
        style={{
          background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,220,50,0.7), rgba(255,140,0,0.8), rgba(255,60,0,1))',
        }}
      />
      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}
