import { useState } from 'react';
import { Sparkles, X, AlertTriangle, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { CostInputs } from '../utils/costingEngine';
import { DEFAULT_COST_INPUTS } from '../utils/costingEngine';

interface AIResult {
  inspectorType: string;
  labourHours: number;
  reportWritingHours: number;
  travelZone: string;
  accessDifficulty: string;
  serviceTier: string;
  estimatedPenetrations: number | null;
  estimatedMembers: number | null;
  suggestedServiceType: string;
  scopeOfWork: string;
  lineItems: Array<{
    description: string;
    category: string;
    unit: string;
    quantity: number;
    unit_price: number;
  }>;
  assumptions: string[];
  risks: string[];
}

interface LineItemRow {
  _key: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unit_price: number;
  markup_percent: number;
  line_total: number;
}

interface Props {
  onApply: (
    costInputs: Partial<CostInputs>,
    lineItems: LineItemRow[],
    scopeOfWork: string,
    serviceType: string
  ) => void;
  onClose: () => void;
}

export default function AIScopeEstimator({ onApply, onClose }: Props) {
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);

  const handleEstimate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const supabaseUrl = (supabase as any).supabaseUrl as string;

      const res = await fetch(`${supabaseUrl}/functions/v1/quote-scope-estimator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ description, context: context || undefined }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    const costInputs: Partial<CostInputs> = {
      ...DEFAULT_COST_INPUTS,
      inspectorType: result.inspectorType ?? 'senior',
      labourHours: result.labourHours ?? 4,
      reportWritingHours: result.reportWritingHours ?? 2,
      travelZone: result.travelZone ?? 'local',
      accessDifficulty: result.accessDifficulty ?? 'easy',
      serviceTier: result.serviceTier ?? 'standard',
    };

    const lineItems: LineItemRow[] = (result.lineItems ?? []).map((li, i) => {
      const total = (li.quantity ?? 1) * (li.unit_price ?? 0);
      return {
        _key: `ai-${i}-${Math.random().toString(36).slice(2)}`,
        description: li.description,
        category: li.category ?? 'Labour',
        unit: li.unit ?? 'visit',
        quantity: li.quantity ?? 1,
        unit_price: li.unit_price ?? 0,
        markup_percent: 0,
        line_total: total,
      };
    });

    onApply(costInputs, lineItems, result.scopeOfWork ?? '', result.suggestedServiceType ?? '');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-900/50 border border-sky-800 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">AI Scope Estimator</h3>
              <p className="text-xs text-slate-500">Describe the project — AI drafts quote inputs</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Input */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Project Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              placeholder="e.g. 3-level commercial building in Auckland CBD, passive fire protection QA inspection of intumescent coatings on approximately 120 steel members. Scaffold access required. Client needs report within 48 hours."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-600 resize-none"
            />
          </div>

          <div>
            <button
              onClick={() => setShowContext(!showContext)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
            >
              {showContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Additional context (optional)
            </button>
            {showContext && (
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                rows={3}
                placeholder="e.g. Client is Cook Brothers Construction. Site is in Grafton. Similar job last year was $4,200 + GST."
                className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-sky-600 resize-none"
              />
            )}
          </div>

          <button
            onClick={handleEstimate}
            disabled={!description.trim() || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Estimating scope…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Estimate Scope
              </>
            )}
          </button>

          {error && (
            <div className="flex items-start gap-2 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4 border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">AI Estimate</p>
                <span className="text-xs text-sky-400 bg-sky-900/20 border border-sky-800 rounded px-2 py-0.5">
                  {result.suggestedServiceType?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Scope summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Inspector', value: result.inspectorType },
                  { label: 'Site Hours', value: `${result.labourHours} hrs` },
                  { label: 'Report Hours', value: `${result.reportWritingHours} hrs` },
                  { label: 'Travel Zone', value: result.travelZone },
                  { label: 'Access', value: result.accessDifficulty },
                  { label: 'Service Tier', value: result.serviceTier },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-800/60 rounded-lg p-2.5">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className="text-sm font-semibold text-white capitalize">{value}</p>
                  </div>
                ))}
              </div>

              {/* Scope of work */}
              {result.scopeOfWork && (
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Suggested Scope of Work</p>
                  <p className="text-xs text-slate-300 bg-slate-800/40 rounded-lg p-3 leading-relaxed">{result.scopeOfWork}</p>
                </div>
              )}

              {/* Line items preview */}
              {result.lineItems?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Suggested Line Items</p>
                  <div className="rounded-xl border border-slate-700 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800 text-slate-400">
                          <th className="text-left px-3 py-2 font-medium">Description</th>
                          <th className="text-right px-3 py-2 font-medium w-12">Qty</th>
                          <th className="text-right px-3 py-2 font-medium w-24">Unit Price</th>
                          <th className="text-right px-3 py-2 font-medium w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {result.lineItems.map((li, i) => (
                          <tr key={i} className="bg-slate-900/60">
                            <td className="px-3 py-2 text-slate-300">{li.description}</td>
                            <td className="px-3 py-2 text-right text-slate-400">{li.quantity} {li.unit}</td>
                            <td className="px-3 py-2 text-right text-slate-400">${li.unit_price.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-emerald-400 font-semibold">
                              ${(li.quantity * li.unit_price).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Assumptions & risks */}
              <div className="grid grid-cols-2 gap-3">
                {result.assumptions?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">Assumptions</p>
                    <ul className="space-y-1">
                      {result.assumptions.map((a, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-sky-600 mt-0.5">•</span>
                          <span className="text-xs text-slate-400">{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.risks?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">Risks / Notes</p>
                    <ul className="space-y-1">
                      {result.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-amber-400/80">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-600">Review before applying — AI may not capture all site-specific factors.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!result}
              className="px-5 py-2 bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Apply to Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
