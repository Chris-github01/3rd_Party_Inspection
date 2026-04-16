import type { InspectionAIPin } from '../types';

export interface PinCluster {
  id: string;
  pins: InspectionAIPin[];
  centroid: { x: number; y: number };
  radius: number;
  dominantSeverity: 'High' | 'Medium' | 'Low';
  severityCounts: { High: number; Medium: number; Low: number };
  label: string;
}

const SEVERITY_WEIGHT: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

function severityScore(s: string): number {
  return SEVERITY_WEIGHT[s] ?? 1;
}

function euclidean(a: InspectionAIPin, b: InspectionAIPin): number {
  const dx = a.x_percent - b.x_percent;
  const dy = a.y_percent - b.y_percent;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clusterPins(
  pins: InspectionAIPin[],
  thresholdPct = 12
): PinCluster[] {
  if (pins.length === 0) return [];

  const assigned = new Set<string>();
  const clusters: PinCluster[] = [];

  for (const pin of pins) {
    if (assigned.has(pin.id)) continue;

    const members: InspectionAIPin[] = [pin];
    assigned.add(pin.id);

    for (const other of pins) {
      if (assigned.has(other.id)) continue;
      if (euclidean(pin, other) <= thresholdPct) {
        members.push(other);
        assigned.add(other.id);
      }
    }

    const cx = members.reduce((s, p) => s + p.x_percent, 0) / members.length;
    const cy = members.reduce((s, p) => s + p.y_percent, 0) / members.length;

    const radius = Math.max(
      ...members.map((p) =>
        Math.sqrt((p.x_percent - cx) ** 2 + (p.y_percent - cy) ** 2)
      ),
      5
    );

    const counts = { High: 0, Medium: 0, Low: 0 };
    for (const m of members) {
      if (m.severity === 'High') counts.High++;
      else if (m.severity === 'Low') counts.Low++;
      else counts.Medium++;
    }

    const dominant = (Object.keys(counts) as Array<'High' | 'Medium' | 'Low'>).reduce(
      (a, b) => (counts[a] >= counts[b] ? a : b)
    );

    const avgScore =
      members.reduce((s, p) => s + severityScore(p.severity), 0) / members.length;

    const intensity = members.length >= 5 ? 'Dense' : members.length >= 3 ? 'Moderate' : 'Minor';
    const severityLabel =
      dominant === 'High' ? 'critical' : dominant === 'Medium' ? 'moderate' : 'minor';

    clusters.push({
      id: `cluster-${clusters.length}`,
      pins: members,
      centroid: { x: cx, y: cy },
      radius: Math.max(radius + 4, 8),
      dominantSeverity: dominant,
      severityCounts: counts,
      label: `${intensity} ${severityLabel} zone — ${members.length} finding${members.length !== 1 ? 's' : ''}`,
    });
  }

  return clusters.sort((a, b) => b.pins.length - a.pins.length);
}

export function buildHeatmapData(
  pins: InspectionAIPin[],
  width: number,
  height: number,
  radius = 60
): ImageData {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;

  for (const pin of pins) {
    const x = (pin.x_percent / 100) * width;
    const y = (pin.y_percent / 100) * height;
    const w = SEVERITY_WEIGHT[pin.severity] ?? 1;
    const r = radius * w;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(255,0,0,${0.25 * w})`);
    grad.addColorStop(0.5, `rgba(255,120,0,${0.12 * w})`);
    grad.addColorStop(1, 'rgba(255,200,0,0)');

    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return ctx.getImageData(0, 0, width, height);
}

export function clusterSummaryText(clusters: PinCluster[]): string {
  const total = clusters.reduce((s, c) => s + c.pins.length, 0);
  const highClusters = clusters.filter((c) => c.dominantSeverity === 'High');
  if (clusters.length === 0) return 'No spatial findings recorded.';
  if (highClusters.length > 0) {
    return `${total} findings across ${clusters.length} zone${clusters.length !== 1 ? 's' : ''}, including ${highClusters.length} critical concentration${highClusters.length !== 1 ? 's' : ''}.`;
  }
  return `${total} findings distributed across ${clusters.length} zone${clusters.length !== 1 ? 's' : ''}.`;
}
