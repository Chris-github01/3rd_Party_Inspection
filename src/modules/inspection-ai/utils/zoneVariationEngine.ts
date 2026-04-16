import type { PinCluster } from './clusterEngine';

export type ZoneRisk = 'Critical' | 'Elevated' | 'Monitored';

export interface ZoneVariation {
  id: string;
  clusterId: string;
  title: string;
  description: string;
  scope: string;
  risk: ZoneRisk;
  estimatedArea: string;
  pinCount: number;
  dominantSeverity: 'High' | 'Medium' | 'Low';
  actionRequired: string;
  spatialNote: string;
}

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

function compassDirection(cx: number, cy: number): string {
  const angle = Math.atan2(cy - 50, cx - 50) * (180 / Math.PI);
  const index = Math.round((angle + 180) / 45) % 8;
  return COMPASS[index] ?? 'central';
}

function estimateArea(cluster: PinCluster): string {
  const r = cluster.radius;
  const baseM2 = Math.PI * (r * 0.3) ** 2;
  const low = Math.max(2, Math.round(baseM2 * 0.8));
  const high = Math.round(baseM2 * 1.4);
  return `${low}–${high} m²`;
}

function buildTitle(cluster: PinCluster, index: number): string {
  const direction = compassDirection(cluster.centroid.x, cluster.centroid.y);
  const intensity = cluster.pins.length >= 5 ? 'High-Density' : cluster.pins.length >= 3 ? 'Concentrated' : 'Localised';
  const sevLabel = cluster.dominantSeverity === 'High' ? 'Critical' : cluster.dominantSeverity === 'Medium' ? 'Moderate' : 'Minor';
  return `Zone ${index + 1} — ${intensity} ${sevLabel} Failure (${direction} section)`;
}

function buildDescription(cluster: PinCluster, direction: string): string {
  const { High: h, Medium: m, Low: l } = cluster.severityCounts;
  const total = cluster.pins.length;
  const breakdown = [
    h > 0 ? `${h} high-severity` : null,
    m > 0 ? `${m} moderate-severity` : null,
    l > 0 ? `${l} low-severity` : null,
  ].filter(Boolean).join(', ');

  if (cluster.dominantSeverity === 'High') {
    return `A concentration of ${total} findings has been identified in the ${direction} section of this drawing, comprising ${breakdown}. The density and severity distribution indicates systemic failure behaviour rather than isolated defects, warranting immediate remediation action.`;
  }
  if (cluster.dominantSeverity === 'Medium') {
    return `${total} findings are concentrated in the ${direction} section (${breakdown}). The spatial clustering suggests a common underlying cause. Targeted inspection and remediation of this zone is recommended before further progression.`;
  }
  return `${total} findings cluster in the ${direction} section (${breakdown}). While individually low severity, the spatial pattern warrants monitoring and documentation for variation purposes.`;
}

function buildScope(cluster: PinCluster, area: string): string {
  const lines: string[] = [];
  if (cluster.severityCounts.High > 0) {
    lines.push(`Remove and reinstate non-conforming material across failure zone (est. ${area})`);
    lines.push(`Full surface preparation and system reapplication to affected area`);
    lines.push(`Post-remediation DFT inspection and sign-off`);
  } else if (cluster.severityCounts.Medium > 0) {
    lines.push(`Targeted surface repair and coating reinstatement (est. ${area})`);
    lines.push(`Document all findings with photographic evidence`);
    lines.push(`Re-inspect within 5 working days`);
  } else {
    lines.push(`Monitor zone for deterioration progression`);
    lines.push(`Document findings and include in next inspection cycle`);
  }
  return lines.join('\n');
}

function buildAction(cluster: PinCluster): string {
  if (cluster.dominantSeverity === 'High') return 'Immediate stop-work and remediation required. Escalate to principal contractor.';
  if (cluster.dominantSeverity === 'Medium') return 'Schedule targeted remediation within 5 working days. Notify project manager.';
  return 'Monitor and record. Include in next inspection cycle.';
}

export function generateZoneVariations(clusters: PinCluster[]): ZoneVariation[] {
  return clusters
    .filter((c) => c.pins.length >= 2)
    .map((cluster, index) => {
      const direction = compassDirection(cluster.centroid.x, cluster.centroid.y);
      const area = estimateArea(cluster);
      const risk: ZoneRisk =
        cluster.dominantSeverity === 'High'
          ? 'Critical'
          : cluster.dominantSeverity === 'Medium'
          ? 'Elevated'
          : 'Monitored';

      return {
        id: `zone-var-${cluster.id}`,
        clusterId: cluster.id,
        title: buildTitle(cluster, index),
        description: buildDescription(cluster, direction),
        scope: buildScope(cluster, area),
        risk,
        estimatedArea: area,
        pinCount: cluster.pins.length,
        dominantSeverity: cluster.dominantSeverity,
        actionRequired: buildAction(cluster),
        spatialNote: `Centroid at ${cluster.centroid.x.toFixed(0)}% / ${cluster.centroid.y.toFixed(0)}% of drawing. Cluster radius ~${cluster.radius.toFixed(0)}% of drawing width.`,
      };
    });
}

export const ZONE_VARIATION_DISCLAIMER =
  'Zone-driven variations are generated from spatial pin clustering and are intended as a structured basis for formal variation submissions. Estimated areas are indicative only and must be verified on site before submission.';
