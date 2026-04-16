import { useState, useEffect } from 'react';
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { fetchReport, fetchReportItems } from '../services/storageService';
import type { InspectionAIReport, InspectionAIItem } from '../types';
import { generatePDF } from '../utils/pdfGenerator';
import { CONFIDENCE_REVIEW_THRESHOLD } from '../services/inspectionAIService';

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
      <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FindingCard({ item, idx }: { item: InspectionAIItem; idx: number }) {
  const needsReview = item.confidence < CONFIDENCE_REVIEW_THRESHOLD;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="md:flex">
        {item.image_url && (
          <div className="md:w-2/5 aspect-video md:aspect-auto bg-slate-100 overflow-hidden flex-shrink-0">
            <img src={item.image_url} alt={`Finding ${idx + 1}`} className="w-full h-full object-cover" />
          </div>
        )}
        <div className={`flex-1 p-5 space-y-4 ${!item.image_url ? 'w-full' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Finding {idx + 1}
              </p>
              <h3 className="font-bold text-slate-900 text-base">{item.defect_type}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{item.system_type} · {item.element}</p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <SeverityBadge severity={item.severity} />
              {needsReview && (
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Review
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 divide-y divide-slate-100">
            <div className="pt-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Observation</p>
              <p className="text-sm text-slate-700 leading-relaxed">{item.observation}</p>
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

            <div className="pt-3">
              <ConfidenceMeter value={item.confidence} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InspectionReportView({ reportId, onBack }: Props) {
  const [report, setReport] = useState<InspectionAIReport | null>(null);
  const [items, setItems] = useState<InspectionAIItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [r, i] = await Promise.all([fetchReport(reportId), fetchReportItems(reportId)]);
        setReport(r);
        setItems(i);
      } finally {
        setLoading(false);
      }
    })();
  }, [reportId]);

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await generatePDF(report, items);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50">
        <p className="text-slate-500">Report not found.</p>
      </div>
    );
  }

  const highCount = items.filter((i) => i.severity === 'High').length;
  const medCount = items.filter((i) => i.severity === 'Medium').length;
  const lowCount = items.filter((i) => i.severity === 'Low').length;
  const reviewCount = items.filter((i) => i.confidence < CONFIDENCE_REVIEW_THRESHOLD).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="font-bold text-slate-900 text-lg">Inspection Report</h1>
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

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{report.project_name}</h2>
              <p className="text-slate-500 text-sm mt-0.5">Inspector: {report.inspector_name}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {new Date(report.created_at).toLocaleDateString('en-NZ', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{items.length}</p>
              <p className="text-xs text-slate-500">Finding{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {highCount > 0 && (
                <div className="flex-1 min-w-[60px] bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-700">{highCount}</p>
                  <p className="text-xs text-red-600 font-medium">High</p>
                </div>
              )}
              {medCount > 0 && (
                <div className="flex-1 min-w-[60px] bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">{medCount}</p>
                  <p className="text-xs text-amber-600 font-medium">Medium</p>
                </div>
              )}
              {lowCount > 0 && (
                <div className="flex-1 min-w-[60px] bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-700">{lowCount}</p>
                  <p className="text-xs text-emerald-600 font-medium">Low</p>
                </div>
              )}
              {reviewCount > 0 && (
                <div className="flex-1 min-w-[60px] bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-600">{reviewCount}</p>
                  <p className="text-xs text-amber-600 font-medium">For Review</p>
                </div>
              )}
            </div>
          )}
        </div>

        {items.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p>No findings recorded yet.</p>
          </div>
        )}

        {items.map((item, idx) => (
          <FindingCard key={item.id} item={item} idx={idx} />
        ))}

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Disclaimer:</strong> This assessment is based on visual inspection only and represents the
            observations of the inspector at the time of inspection. Further investigation, testing, or
            specialist assessment may be required to fully characterise the extent or cause of any identified
            conditions. This report does not constitute a compliance certification or fire engineering assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
