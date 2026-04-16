import { useState } from 'react';
import {
  MapPin,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  CheckCircle,
  Zap,
} from 'lucide-react';
import type { PinCluster } from '../utils/clusterEngine';
import { clusterSummaryText } from '../utils/clusterEngine';
import {
  generateZoneVariations,
  ZONE_VARIATION_DISCLAIMER,
} from '../utils/zoneVariationEngine';
import type { ZoneVariation, ZoneRisk } from '../utils/zoneVariationEngine';

const RISK_STYLES: Record<ZoneRisk, { badge: string; border: string; bg: string; icon: React.ReactNode }> = {
  Critical: {
    badge: 'bg-red-100 text-red-800 border-red-200',
    border: 'border-red-200',
    bg: 'bg-red-50',
    icon: <Flame className="w-4 h-4 text-red-600" />,
  },
  Elevated: {
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  },
  Monitored: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
  },
};

function ScopeLines({ scope }: { scope: string }) {
  return (
    <ul className="space-y-1.5 mt-2">
      {scope.split('\n').filter(Boolean).map((line, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function ZoneVariationCard({ variation, index }: { variation: ZoneVariation; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const styles = RISK_STYLES[variation.risk];

  return (
    <div className={`rounded-2xl border ${styles.border} overflow-hidden`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className={`w-full flex items-center gap-3 p-4 ${styles.bg} transition-colors text-left`}
      >
        <div className="flex-shrink-0">{styles.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${styles.badge}`}>
              {variation.risk}
            </span>
            <span className="text-xs text-slate-500 font-semibold">{variation.estimatedArea}</span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />
              {variation.pinCount} finding{variation.pinCount !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-900 mt-1 leading-snug">{variation.title}</p>
        </div>
        <div className="flex-shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="p-4 bg-white space-y-4 border-t border-slate-100">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Variation Description</p>
            <p className="text-sm text-slate-700 leading-relaxed">{variation.description}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Proposed Scope of Work</p>
            <ScopeLines scope={variation.scope} />
          </div>

          <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 ${styles.bg} border ${styles.border}`}>
            <Zap className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-slate-800">{variation.actionRequired}</p>
          </div>

          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Info className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed">{variation.spatialNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  clusters: PinCluster[];
}

export function ZoneVariationPanel({ clusters }: Props) {
  const activeClusters = clusters.filter((c) => c.pins.length >= 2);
  const variations = generateZoneVariations(activeClusters);

  const criticalCount = variations.filter((v) => v.risk === 'Critical').length;
  const elevatedCount = variations.filter((v) => v.risk === 'Elevated').length;
  const totalPins = activeClusters.reduce((s, c) => s + c.pins.length, 0);

  if (clusters.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No spatial data available</p>
        <p className="text-xs text-slate-400 mt-1">Place pins on drawings to generate zone-driven variations</p>
      </div>
    );
  }

  if (activeClusters.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No clusters detected</p>
        <p className="text-xs text-slate-400 mt-1">At least 2 pins must be in proximity to form a zone</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="font-bold text-slate-900 text-sm">Zone-Driven Variations</h2>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
          Spatial
        </span>
      </div>

      <div className="bg-slate-900 rounded-2xl p-4 text-white">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Spatial Summary</p>
        <p className="text-sm text-slate-200 leading-relaxed">{clusterSummaryText(activeClusters)}</p>
        <div className="flex gap-3 mt-3">
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-red-300">{criticalCount} Critical</span>
            </div>
          )}
          {elevatedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-amber-300">{elevatedCount} Elevated</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400">{totalPins} pinned findings</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {variations.map((v, i) => (
          <ZoneVariationCard key={v.id} variation={v} index={i} />
        ))}
      </div>

      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 leading-relaxed">{ZONE_VARIATION_DISCLAIMER}</p>
      </div>
    </div>
  );
}
