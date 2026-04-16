import { useState, useMemo } from 'react';
import {
  FileText,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Merge,
  Download,
  Info,
  CheckCircle,
  MapPin,
  ClipboardList,
  Flame,
} from 'lucide-react';
import type { InspectionAIItem } from '../types';
import { generateCommercialSummary } from '../utils/summaryEngine';
import { buildVariationSummary, buildMergedVariation } from '../utils/variationSummary';
import { VARIATION_DISCLAIMER } from '../utils/variationEngine';
import type { VariationItem } from '../utils/variationEngine';
import { getRiskTailwindClass } from '../utils/riskEngine';
import { getForecastColour } from '../utils/forecastEngine';
import { COST_DISCLAIMER } from '../utils/costEstimator';
import type { PinCluster } from '../utils/clusterEngine';
import { clusterSummaryText } from '../utils/clusterEngine';

interface Props {
  items: InspectionAIItem[];
  projectName: string;
  inspectorName: string;
  date: string;
  mode: 'client' | 'internal';
  onExport: (merged: boolean) => void;
  exporting: boolean;
  spatialClusters?: PinCluster[];
}

function ScopeLines({ scope }: { scope: string }) {
  const lines = scope.split('\n').filter(Boolean);
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function VariationCard({
  variation,
  index,
  mode,
}: {
  variation: VariationItem;
  index: number;
  mode: 'client' | 'internal';
}) {
  const [expanded, setExpanded] = useState(false);
  const riskClass = getRiskTailwindClass(variation.risk_level as never);
  const forecastClass = variation.forecast ? getForecastColour(variation.forecast.urgency) : '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <button
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {variation.is_merged ? 'Combined' : `Item ${index + 1}`}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${riskClass}`}>
                  {variation.risk_level}
                </span>
                {variation.is_merged && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200 flex items-center gap-1">
                    <Merge className="w-3 h-3" />
                    Merged
                  </span>
                )}
              </div>
              <p className="font-bold text-slate-900 text-sm leading-tight">{variation.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{variation.count} occurrence{variation.count !== 1 ? 's' : ''} · {variation.estimated_area}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {mode === 'internal' && variation.cost && (
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-700">{variation.cost.formatted}</p>
                  <p className="text-xs text-slate-400">est. cost</p>
                </div>
              )}
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-sm text-slate-700 leading-relaxed">{variation.description}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Scope of Works
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <ScopeLines scope={variation.scope} />
            </div>
          </div>

          {variation.locations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Locations
              </p>
              <div className="flex flex-wrap gap-1.5">
                {variation.locations.map((loc, i) => (
                  <span key={i} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg">
                    {loc}
                  </span>
                ))}
                {variation.count > variation.locations.length && (
                  <span className="text-xs text-slate-400 px-2 py-1">
                    +{variation.count - variation.locations.length} more
                  </span>
                )}
              </div>
            </div>
          )}

          {mode === 'internal' && variation.forecast && (
            <div className={`rounded-xl border p-3 text-xs font-medium ${forecastClass}`}>
              <span className="font-bold">{variation.forecast.label}: </span>
              {variation.forecast.description}
            </div>
          )}

          {variation.is_merged && variation.merged_from && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-sky-800 mb-1">Merged from:</p>
              <ul className="space-y-0.5">
                {variation.merged_from.map((t, i) => (
                  <li key={i} className="text-xs text-sky-700">· {t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function VariationPanel({ items, projectName, inspectorName, date, mode, onExport, exporting, spatialClusters }: Props) {
  const [useMerged, setUseMerged] = useState(false);

  const summary = useMemo(() => {
    const commercial = generateCommercialSummary(items);
    return buildVariationSummary(commercial.groups);
  }, [items]);

  const mergedVariation = useMemo(() => {
    if (!useMerged || summary.items.length < 2) return null;
    const commercial = generateCommercialSummary(items);
    return buildMergedVariation(commercial.groups);
  }, [useMerged, summary.items.length, items]);

  const displayedItems = useMerged && mergedVariation ? [mergedVariation] : summary.items;

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">No findings to generate variations from</p>
        <p className="text-xs text-slate-400 mt-1">Save findings first</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="font-bold text-slate-900 text-sm">Variation Engine</h2>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
          {mode === 'internal' ? 'Internal' : 'Client'} mode
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{summary.total_groups}</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Variation Items</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-700">{summary.total_area_m2.toFixed(1)} m²</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Area</p>
          </div>
          {mode === 'internal' && (
            <>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center col-span-2">
                <div className="flex items-center justify-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <p className="text-base font-bold text-emerald-800">{summary.total_cost_formatted}</p>
                </div>
                <p className="text-xs text-emerald-600 font-semibold mt-0.5">Total Estimated Cost Exposure</p>
              </div>
            </>
          )}
        </div>

        {spatialClusters && spatialClusters.length > 0 && (
          <div className="mt-3 bg-slate-900 border border-slate-700 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <p className="text-xs font-bold text-white">Spatial Intelligence</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-2">
              {clusterSummaryText(spatialClusters)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {spatialClusters.slice(0, 4).map((c) => {
                const colour =
                  c.dominantSeverity === 'High'
                    ? 'bg-red-900/50 text-red-300 border-red-800'
                    : c.dominantSeverity === 'Medium'
                    ? 'bg-amber-900/50 text-amber-300 border-amber-800'
                    : 'bg-emerald-900/50 text-emerald-300 border-emerald-800';
                return (
                  <span
                    key={c.id}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${colour}`}
                  >
                    {c.pins.length} findings · {c.dominantSeverity}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {summary.has_high_risk && (
          <div className="flex items-center gap-2 mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-red-800">
              High-risk defects identified — recommend prioritising remediation in variation submission.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Output Format
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setUseMerged(false)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
              !useMerged
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            <Layers className="w-4 h-4" />
            Separate Items
            <span className="font-normal text-xs opacity-70">One item per defect group</span>
          </button>
          <button
            onClick={() => setUseMerged(true)}
            disabled={summary.items.length < 2}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              useMerged
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            <Merge className="w-4 h-4" />
            Merged Item
            <span className="font-normal text-xs opacity-70">Combined into one claim</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {displayedItems.map((variation, i) => (
          <VariationCard key={variation.id} variation={variation} index={i} mode={mode} />
        ))}
      </div>

      <button
        onClick={() => onExport(useMerged)}
        disabled={exporting || items.length === 0}
        className="w-full flex items-center justify-center gap-2.5 bg-slate-900 text-white py-4 rounded-2xl font-bold text-base hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
      >
        <Download className="w-5 h-5" />
        {exporting ? 'Generating…' : 'Export Variation Report (PDF)'}
      </button>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs text-amber-900 font-bold">Variation Disclaimer</p>
          <p className="text-xs text-amber-800 leading-relaxed">{VARIATION_DISCLAIMER}</p>
          {mode === 'internal' && (
            <p className="text-xs text-amber-700 leading-relaxed mt-1">{COST_DISCLAIMER}</p>
          )}
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
        <p className="text-xs font-bold text-slate-700">Project Details</p>
        <p className="text-xs text-slate-500">Project: <span className="text-slate-700 font-semibold">{projectName}</span></p>
        <p className="text-xs text-slate-500">Inspector: <span className="text-slate-700 font-semibold">{inspectorName}</span></p>
        <p className="text-xs text-slate-500">Date: <span className="text-slate-700 font-semibold">{date}</span></p>
      </div>
    </div>
  );
}
