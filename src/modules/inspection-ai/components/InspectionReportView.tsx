import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Pencil,
  BarChart2,
  Eye,
  EyeOff,
  TrendingUp,
  Layers,
  DollarSign,
  Info,
  FileText,
  Flame,
} from 'lucide-react';
import { fetchReport, fetchReportItems, fetchAllItemImages } from '../services/storageService';
import type { InspectionAIReport, InspectionAIItem, InspectionAIItemImage, InspectionAIPin } from '../types';
import { generatePDF, generateVariationPDF } from '../utils/pdfGenerator';
import { CONFIDENCE_REVIEW_THRESHOLD } from '../services/inspectionAIService';
import { generateCommercialSummary } from '../utils/summaryEngine';
import { getRiskTailwindClass } from '../utils/riskEngine';
import type { CommercialSummary } from '../utils/summaryEngine';
import { estimateCost, estimateTotalCost, COST_DISCLAIMER } from '../utils/costEstimator';
import { forecastRisk, getForecastColour } from '../utils/forecastEngine';
import { InspectionDashboard } from './InspectionDashboard';
import { VariationPanel } from './VariationPanel';
import { ZoneVariationPanel } from './ZoneVariationPanel';
import { fetchAllPinsForProject } from '../services/spatialService';
import { clusterPins } from '../utils/clusterEngine';

type ReportMode = 'client' | 'internal';

interface Props {
  reportId: string;
  onBack: () => void;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colours: Record<string, string> = {
    High: 'bg-red-100 text-red-800 border-red-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    Low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  const icons: Record<string, React.ReactNode> = {
    High: <AlertTriangle className="w-3.5 h-3.5" />,
    Medium: <Clock className="w-3.5 h-3.5" />,
    Low: <CheckCircle className="w-3.5 h-3.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${colours[severity] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {icons[severity]}
      {severity}
    </span>
  );
}

function ExtentPill({ extent }: { extent: string }) {
  const styles: Record<string, string> = {
    Localised: 'bg-blue-50 text-blue-700 border-blue-200',
    Moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    Widespread: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[extent] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {extent}
    </span>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const needsReview = pct < CONFIDENCE_REVIEW_THRESHOLD;
  const colour = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">AI Confidence</span>
        <div className="flex items-center gap-1.5">
          {needsReview && (
            <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Manual review recommended
            </span>
          )}
          <span className="text-xs font-semibold text-slate-700">{pct}%</span>
        </div>
      </div>
      <div className="bg-slate-200 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LocationTag({ item }: { item: InspectionAIItem }) {
  const parts = [item.location_level, item.location_grid, item.location_description].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="flex items-start gap-1.5 text-xs text-slate-500">
      <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
      <span className="leading-relaxed">{parts.join('  ·  ')}</span>
    </div>
  );
}

function CommercialSummarySection({
  summary,
  mode,
}: {
  summary: CommercialSummary;
  mode: ReportMode;
}) {
  const totalCost = estimateTotalCost(summary.groups);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-300" />
            <h2 className="text-white font-bold text-base">Commercial Summary</h2>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">
            {summary.total_findings} finding{summary.total_findings !== 1 ? 's' : ''} across {summary.total_groups} defect group{summary.total_groups !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{summary.total_findings}</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Total Findings</p>
          </div>
          <div className={`rounded-xl p-3 text-center border ${summary.high_risk_count > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className={`text-2xl font-bold ${summary.high_risk_count > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {summary.high_risk_count}
            </p>
            <p className={`text-xs font-semibold mt-0.5 ${summary.high_risk_count > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              High Risk Groups
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <p className="text-base font-bold text-blue-800 leading-tight">{summary.total_scope_range}</p>
            <p className="text-xs text-blue-600 font-semibold mt-0.5">Est. Total Scope</p>
          </div>
          {mode === 'internal' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-base font-bold text-emerald-800 leading-tight">{totalCost.formatted}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Est. Cost Exposure</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Grouped Findings
          </p>
          <div className="space-y-2">
            {summary.groups.map((group, i) => {
              const cost = estimateCost(group);
              const forecast = forecastRisk(group);
              return (
                <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{group.defect_type}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getRiskTailwindClass(group.risk_level)}`}>
                          {group.risk_level}
                        </span>
                        {group.is_systemic && mode === 'internal' && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Systemic
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{group.system_type}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-lg font-bold text-slate-900">{group.count}</p>
                      <p className="text-xs text-slate-400">occurrences</p>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 bg-white border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-blue-700">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        <span>Est. area: <strong>{group.estimated_area}</strong></span>
                      </div>
                      {mode === 'internal' && (
                        <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                          <DollarSign className="w-3 h-3 text-emerald-500" />
                          {cost.formatted}
                        </div>
                      )}
                    </div>
                    {mode === 'internal' && (
                      <div className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border ${getForecastColour(forecast.urgency)}`}>
                        <span className="font-bold">{forecast.label}: </span>
                        {forecast.description}
                      </div>
                    )}
                  </div>
                  {mode === 'internal' && group.locations.length > 0 && (
                    <div className="px-4 pb-2.5 bg-white">
                      <p className="text-xs text-slate-400">
                        Locations: {group.locations.join(', ')}{group.count > group.locations.length ? ` +${group.count - group.locations.length} more` : ''}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {mode === 'internal' && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{COST_DISCLAIMER}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LegacySummarySection({ items }: { items: InspectionAIItem[] }) {
  const high = items.filter((i) => i.severity === 'High').length;
  const med = items.filter((i) => i.severity === 'Medium').length;
  const low = items.filter((i) => i.severity === 'Low').length;
  const reviewCount = items.filter((i) => i.confidence < CONFIDENCE_REVIEW_THRESHOLD).length;
  const overrideCount = items.filter((i) => i.defect_type_override || i.severity_override || i.observation_override).length;

  const systemCounts: Record<string, number> = {};
  items.forEach((i) => { systemCounts[i.system_type] = (systemCounts[i.system_type] ?? 0) + 1; });

  const widespread = items.filter((i) => i.extent === 'Widespread').length;
  const moderate = items.filter((i) => i.extent === 'Moderate').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-900 px-5 py-4">
        <h2 className="text-white font-bold text-base">Inspection Summary</h2>
        <p className="text-slate-400 text-xs mt-0.5">{items.length} finding{items.length !== 1 ? 's' : ''} recorded</p>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {high > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{high}</p>
              <p className="text-xs text-red-600 font-semibold mt-0.5">High</p>
            </div>
          )}
          {med > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{med}</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">Medium</p>
            </div>
          )}
          {low > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{low}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Low</p>
            </div>
          )}
          {(high === 0 && med === 0 && low === 0) && (
            <div className="col-span-3 text-center text-sm text-slate-400">No findings yet</div>
          )}
        </div>

        {(widespread > 0 || moderate > 0) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Extent</p>
            <div className="flex gap-2 flex-wrap">
              {widespread > 0 && (
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                  <span className="text-sm font-bold text-red-700">{widespread}</span>
                  <span className="text-xs text-red-600">Widespread</span>
                </div>
              )}
              {moderate > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  <span className="text-sm font-bold text-amber-700">{moderate}</span>
                  <span className="text-xs text-amber-600">Moderate</span>
                </div>
              )}
            </div>
          </div>
        )}

        {Object.keys(systemCounts).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Systems Inspected</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(systemCounts).map(([sys, count]) => (
                <span key={sys} className="text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full font-medium">
                  {sys} ({count})
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 flex-wrap pt-1 border-t border-slate-100">
          {reviewCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
              {reviewCount} requiring manual review
            </div>
          )}
          {overrideCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg">
              <Pencil className="w-3.5 h-3.5" />
              {overrideCount} inspector-overridden
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidenceGallery({ images }: { images: InspectionAIItemImage[] }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  if (images.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Evidence Photos ({images.length})</p>
        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightboxUrl(img.image_url)}
            >
              <img src={img.image_url} alt={img.caption || 'Evidence'} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <span className="text-xl leading-none">×</span>
          </button>
          <img
            src={lightboxUrl}
            alt="Evidence"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function FindingCard({ item, idx, mode, evidenceImages }: { item: InspectionAIItem; idx: number; mode: ReportMode; evidenceImages: InspectionAIItemImage[] }) {
  const needsReview = item.confidence < CONFIDENCE_REVIEW_THRESHOLD;
  const hasOverride = !!(item.defect_type_override || item.severity_override || item.observation_override);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="md:flex">
        <div className={item.image_url ? 'md:w-2/5 flex-shrink-0' : ''}>
          {item.image_url && (
            <div className="aspect-video md:aspect-auto bg-slate-100 overflow-hidden md:min-h-[240px]">
              <img src={item.image_url} alt={`Finding ${idx + 1}`} className="w-full h-full object-cover" />
            </div>
          )}
          {item.annotated_image_url && (
            <div className="border-t border-slate-100 bg-slate-50 px-3 py-2.5 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-slate-500">Drawing location</span>
              <img
                src={item.annotated_image_url}
                alt="Drawing markup"
                className="w-full rounded-lg mt-1 border border-slate-200 object-contain"
                style={{ maxHeight: 140 }}
              />
            </div>
          )}
        </div>
        <div className={`flex-1 p-5 space-y-4 ${!item.image_url && !item.annotated_image_url ? 'w-full' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Finding {idx + 1}</p>
              <h3 className="font-bold text-slate-900 text-base">{item.defect_type}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{item.system_type} · {item.element}</p>
              <LocationTag item={item} />
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <SeverityBadge severity={item.severity} />
              {item.extent && <ExtentPill extent={item.extent} />}
              {hasOverride && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Pencil className="w-3 h-3" />
                  Overridden
                </span>
              )}
              {needsReview && !hasOverride && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Review
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 divide-y divide-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Observation</p>
              <p className="text-sm text-slate-700 leading-relaxed">{item.observation}</p>
              {hasOverride && item.observation_override && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Inspector-edited
                </p>
              )}
            </div>

            <div className="pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Non-Conformance</p>
              <p className="text-sm text-slate-700 leading-relaxed">{item.non_conformance}</p>
            </div>

            <div className="pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Recommendation</p>
              <p className="text-sm text-slate-700 leading-relaxed">{item.recommendation}</p>
            </div>

            <div className="pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Risk</p>
              <p className="text-sm text-slate-700 leading-relaxed">{item.risk}</p>
            </div>

            {evidenceImages.length > 0 && (
              <div className="pt-3">
                <EvidenceGallery images={evidenceImages} />
              </div>
            )}

            {mode === 'internal' && (
              <div className="pt-3">
                <ConfidenceMeter value={item.confidence} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeSwitcher({ mode, onChange }: { mode: ReportMode; onChange: (m: ReportMode) => void }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      <button
        onClick={() => onChange('client')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          mode === 'client'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Eye className="w-3.5 h-3.5" />
        Client
      </button>
      <button
        onClick={() => onChange('internal')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          mode === 'internal'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <EyeOff className="w-3.5 h-3.5" />
        Internal
      </button>
    </div>
  );
}

type ReportTab = 'findings' | 'dashboard' | 'variation' | 'zones';

export function InspectionReportView({ reportId, onBack }: Props) {
  const [report, setReport] = useState<InspectionAIReport | null>(null);
  const [items, setItems] = useState<InspectionAIItem[]>([]);
  const [pins, setPins] = useState<InspectionAIPin[]>([]);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, InspectionAIItemImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [variationExporting, setVariationExporting] = useState(false);
  const [mode, setMode] = useState<ReportMode>('client');
  const [tab, setTab] = useState<ReportTab>('findings');

  useEffect(() => {
    (async () => {
      try {
        const [r, i] = await Promise.all([fetchReport(reportId), fetchReportItems(reportId)]);
        setReport(r);
        setItems(i);

        if (i.length > 0) {
          try {
            const itemIds = i.map((item) => item.id);
            const allEvidence = await fetchAllItemImages(itemIds);
            const map: Record<string, InspectionAIItemImage[]> = {};
            for (const ev of allEvidence) {
              if (!map[ev.item_id]) map[ev.item_id] = [];
              map[ev.item_id].push(ev);
            }
            setEvidenceMap(map);
          } catch {
            // evidence photos are optional
          }
        }

        if (r?.project_id) {
          try {
            const p = await fetchAllPinsForProject(r.project_id);
            setPins(p);
          } catch {
            // pins are optional
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  const clusters = clusterPins(pins);

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await generatePDF(report, items, mode);
    } finally {
      setExporting(false);
    }
  };

  const handleVariationExport = async (merged: boolean) => {
    if (!report) return;
    setVariationExporting(true);
    try {
      await generateVariationPDF(report, items, mode, merged);
    } finally {
      setVariationExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-500">Report not found.</p>
      </div>
    );
  }

  const commercialSummary = items.length > 0 ? generateCommercialSummary(items) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ModeSwitcher mode={mode} onChange={(m) => { setMode(m); if (m === 'client') setTab('findings'); }} />
            <button
              onClick={handleExport}
              disabled={exporting || items.length === 0}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-slate-800 transition-colors active:scale-95"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Generating…' : 'Export PDF'}
            </button>
          </div>
        </div>
        {mode === 'internal' && (
          <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1">
            <button
              onClick={() => setTab('findings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === 'findings' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              Findings
            </button>
            <button
              onClick={() => setTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Intelligence
            </button>
            <button
              onClick={() => setTab('variation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === 'variation' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              Variation
            </button>
            <button
              onClick={() => setTab('zones')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === 'zones' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              <Flame className="w-3.5 h-3.5" />
              Zones
              {clusters.filter((c) => c.dominantSeverity === 'High' && c.pins.length >= 2).length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5" />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{report.project_name}</h2>
              <p className="text-slate-500 text-sm mt-0.5">Inspector: {report.inspector_name}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {new Date(report.created_at).toLocaleDateString('en-NZ', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
            {mode === 'internal' && (
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg flex-shrink-0">
                <EyeOff className="w-3.5 h-3.5" />
                Internal view
              </span>
            )}
          </div>
        </div>

        {mode === 'internal' && tab === 'dashboard' && (
          <InspectionDashboard
            items={items}
            reportId={reportId}
            projectName={report.project_name}
          />
        )}

        {mode === 'internal' && tab === 'variation' && (
          <VariationPanel
            items={items}
            projectName={report.project_name}
            inspectorName={report.inspector_name}
            date={new Date(report.created_at).toLocaleDateString('en-NZ', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
            mode={mode}
            onExport={handleVariationExport}
            exporting={variationExporting}
            spatialClusters={clusters}
          />
        )}

        {mode === 'internal' && tab === 'zones' && (
          <ZoneVariationPanel clusters={clusters} />
        )}

        {tab === 'findings' && (
          <>
            {mode === 'internal' && commercialSummary && (
              <CommercialSummarySection summary={commercialSummary} mode={mode} />
            )}

            {items.length > 0 && <LegacySummarySection items={items} />}

            {items.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p>No findings recorded yet.</p>
              </div>
            )}

            {mode === 'internal' && commercialSummary && commercialSummary.groups.some((g) => g.is_systemic) && (
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-600" />
                  <p className="text-sm font-semibold text-sky-800">Systemic Patterns Detected</p>
                </div>
                <p className="text-xs text-sky-700 leading-relaxed">
                  {commercialSummary.groups.filter((g) => g.is_systemic).map((g) => g.defect_type).join(', ')} appear across 3+ locations, suggesting potential systemic issues. Consider including remediation scope in project variation.
                </p>
              </div>
            )}

            {items.map((item, idx) => (
              <FindingCard key={item.id} item={item} idx={idx} mode={mode} evidenceImages={evidenceMap[item.id] ?? []} />
            ))}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Disclaimer:</strong> This assessment is based on visual inspection only and represents the
                observations of the inspector at the time of inspection. Further investigation, testing, or
                specialist assessment may be required to fully characterise the extent or cause of any identified
                conditions. This report does not constitute a compliance certification or fire engineering assessment.
                Scope estimates are indicative only.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
