import { useMemo } from 'react';
import { TrendingUp, AlertTriangle, Target, DollarSign, Zap, Info } from 'lucide-react';
import {
  marginColor, marginBgColor, marginLabel, getTargetMargin,
} from '../utils/costingEngine';
import type { CostBreakdown } from '../utils/costingEngine';

export type WinProbability = 'budget' | 'balanced' | 'premium';

interface WinTier {
  id: WinProbability;
  label: string;
  description: string;
  winLikelihood: string;
  multiplier: number;
  color: string;
  activeBorder: string;
  activeBg: string;
}

const WIN_TIERS: WinTier[] = [
  {
    id: 'budget',
    label: 'Budget',
    description: 'Thin margin, highest win rate',
    winLikelihood: '70–85%',
    multiplier: 0.92,
    color: 'text-amber-400',
    activeBorder: 'border-amber-500',
    activeBg: 'bg-amber-900/20',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Target margin, competitive rate',
    winLikelihood: '50–65%',
    multiplier: 1.0,
    color: 'text-sky-400',
    activeBorder: 'border-sky-500',
    activeBg: 'bg-sky-900/20',
  },
  {
    id: 'premium',
    label: 'Premium',
    description: 'Full margin, value-based pricing',
    winLikelihood: '30–45%',
    multiplier: 1.12,
    color: 'text-emerald-400',
    activeBorder: 'border-emerald-500',
    activeBg: 'bg-emerald-900/20',
  },
];

interface Props {
  subtotal: number;
  costBreakdown: CostBreakdown;
  grossMargin: number;
  grossMarginPct: number;
  winProbability: WinProbability;
  onWinProbabilityChange: (v: WinProbability) => void;
  selectedTemplate: string | null;
}

function fmt(v: number) {
  return v.toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PricingIntelligencePanel({
  subtotal,
  costBreakdown,
  grossMargin,
  grossMarginPct,
  winProbability,
  onWinProbabilityChange,
  selectedTemplate,
}: Props) {
  const targetMargin = getTargetMargin(selectedTemplate);
  const internalCost = costBreakdown.totalInternalCost;

  const recommendedSellPrice = useMemo(() => {
    if (internalCost <= 0) return 0;
    return Math.ceil(internalCost / (1 - targetMargin / 100) / 10) * 10;
  }, [internalCost, targetMargin]);

  const budgetSellPrice = useMemo(() => Math.ceil(recommendedSellPrice * 0.92 / 10) * 10, [recommendedSellPrice]);
  const premiumSellPrice = useMemo(() => Math.ceil(recommendedSellPrice * 1.12 / 10) * 10, [recommendedSellPrice]);

  const recommendedMargin = internalCost > 0
    ? ((recommendedSellPrice - internalCost) / recommendedSellPrice) * 100
    : 0;

  const pricingGap = subtotal > 0 ? subtotal - recommendedSellPrice : 0;
  const pricingGapPct = subtotal > 0 ? ((subtotal - recommendedSellPrice) / recommendedSellPrice) * 100 : 0;

  const mgColor = marginColor(grossMarginPct, targetMargin);
  const mgBg = marginBgColor(grossMarginPct, targetMargin);
  const mgLabel = marginLabel(grossMarginPct, targetMargin);

  const activeTier = WIN_TIERS.find(t => t.id === winProbability) ?? WIN_TIERS[1];

  return (
    <div className="space-y-4">

      {/* Margin status card */}
      <div className={`rounded-xl border p-4 ${mgBg}`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400 mb-1">Your Quote</p>
            <p className="text-lg font-bold text-white">${fmt(subtotal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Internal Cost</p>
            <p className="text-lg font-bold text-slate-300">${fmt(internalCost)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Gross Margin $</p>
            <p className={`text-lg font-bold ${mgColor}`}>${fmt(grossMargin)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Gross Margin %</p>
            <p className={`text-2xl font-bold ${mgColor}`}>{grossMarginPct.toFixed(1)}%</p>
          </div>
        </div>

        {/* Margin status bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-medium ${mgColor}`}>{mgLabel}</span>
            <span className="text-xs text-slate-500">Target: {targetMargin}%+</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                grossMarginPct >= targetMargin
                  ? 'bg-emerald-500'
                  : grossMarginPct >= targetMargin * 0.7
                  ? 'bg-amber-500'
                  : grossMarginPct >= targetMargin * 0.4
                  ? 'bg-orange-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, (grossMarginPct / (targetMargin * 1.5)) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>0%</span>
            <span className="text-slate-500">{targetMargin}% target</span>
            <span>{(targetMargin * 1.5).toFixed(0)}%</span>
          </div>
        </div>

        {/* Guardrail warnings */}
        {grossMarginPct < 25 && grossMarginPct > 0 && (
          <div className="mt-3 flex items-start gap-2 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">
              Margin below 25% — this quote does not cover overhead and risk. Consider raising line item prices or reducing scope.
            </p>
          </div>
        )}
        {grossMarginPct >= 25 && grossMarginPct < targetMargin && (
          <div className="mt-3 flex items-start gap-2 bg-amber-900/30 border border-amber-800 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">
              Margin below target for this service type ({targetMargin}%). You can win at this rate but it leaves little buffer.
            </p>
          </div>
        )}
      </div>

      {/* Recommended sell price */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Recommended Sell Price</h3>
          <div className="group relative ml-1">
            <Info className="w-3.5 h-3.5 text-slate-600 cursor-help" />
            <div className="absolute bottom-5 left-0 w-64 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 hidden group-hover:block z-10 shadow-xl">
              Calculated as: Internal Cost ÷ (1 − Target Margin%). Rounds up to nearest $10.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Budget Price', value: budgetSellPrice, margin: internalCost > 0 ? ((budgetSellPrice - internalCost) / budgetSellPrice) * 100 : 0, color: 'text-amber-400', border: 'border-amber-700/50' },
            { label: `Target (${targetMargin}%)`, value: recommendedSellPrice, margin: recommendedMargin, color: 'text-sky-400', border: 'border-sky-700/50', highlight: true },
            { label: 'Premium Price', value: premiumSellPrice, margin: internalCost > 0 ? ((premiumSellPrice - internalCost) / premiumSellPrice) * 100 : 0, color: 'text-emerald-400', border: 'border-emerald-700/50' },
          ].map(p => (
            <div key={p.label} className={`rounded-lg border ${p.border} ${p.highlight ? 'bg-sky-900/10' : 'bg-slate-900/50'} p-3 text-center`}>
              <p className="text-xs text-slate-500 mb-1">{p.label}</p>
              <p className={`text-lg font-bold ${p.color}`}>${fmt(p.value)}</p>
              <p className="text-xs text-slate-600 mt-0.5">{p.margin.toFixed(1)}% margin</p>
            </div>
          ))}
        </div>

        {subtotal > 0 && internalCost > 0 && (
          <div className={`mt-3 flex items-center justify-between text-xs px-3 py-2 rounded-lg ${
            pricingGap >= 0 ? 'bg-emerald-900/20 border border-emerald-800/50' : 'bg-red-900/20 border border-red-800/50'
          }`}>
            <span className="text-slate-400">vs. your current quote</span>
            <span className={`font-semibold ${pricingGap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {pricingGap >= 0 ? '+' : ''}{fmt(pricingGap)} ({pricingGapPct >= 0 ? '+' : ''}{pricingGapPct.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      {/* Win probability / pricing tier */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Positioning Strategy</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {WIN_TIERS.map(tier => (
            <button
              key={tier.id}
              onClick={() => onWinProbabilityChange(tier.id)}
              className={`rounded-xl border p-3 text-left transition-all ${
                winProbability === tier.id
                  ? `${tier.activeBorder} ${tier.activeBg}`
                  : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${winProbability === tier.id ? tier.color : 'text-slate-400'}`}>
                {tier.label}
              </p>
              <p className="text-xs text-slate-500 mb-2">{tier.description}</p>
              <div className={`text-xs font-medium ${winProbability === tier.id ? tier.color : 'text-slate-600'}`}>
                Win rate: {tier.winLikelihood}
              </div>
            </button>
          ))}
        </div>
        <div className={`mt-3 flex items-center gap-2 text-xs ${activeTier.color} bg-slate-900/50 rounded-lg px-3 py-2`}>
          <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <span className="font-medium">{activeTier.label} positioning</span>
            {' '}— this indicates a {activeTier.multiplier < 1 ? 'lower' : activeTier.multiplier > 1 ? 'higher' : 'market'}-than-target sell price.
            Expected win likelihood: <span className="font-semibold">{activeTier.winLikelihood}</span>.
          </span>
        </div>
      </div>

      {/* Profit leaks checklist */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Profit Leak Check</h3>
        </div>
        <div className="space-y-2">
          {[
            { check: costBreakdown.reportWritingCost > 0, label: 'Report writing time is costed', warn: 'Report writing not included in cost model' },
            { check: costBreakdown.travelCost > 0 || costBreakdown.travelZoneSurcharge > 0, label: 'Travel cost captured', warn: 'No travel cost entered — check site location' },
            { check: costBreakdown.adminOverhead > 0, label: 'Admin overhead applied', warn: 'No admin overhead — leaves no buffer for back-office time' },
            { check: grossMarginPct >= 25, label: 'Minimum 25% margin met', warn: 'Below minimum — raise prices before sending' },
            { check: grossMarginPct >= targetMargin, label: `Service target margin (${targetMargin}%) met`, warn: `Below ${targetMargin}% target for this service type` },
          ].map(({ check, label, warn }) => (
            <div key={label} className="flex items-start gap-2.5">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                check ? 'bg-emerald-900/50 border border-emerald-700' : 'bg-red-900/40 border border-red-700'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${check ? 'bg-emerald-400' : 'bg-red-400'}`} />
              </div>
              <p className={`text-xs ${check ? 'text-slate-400' : 'text-red-300'}`}>
                {check ? label : warn}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
