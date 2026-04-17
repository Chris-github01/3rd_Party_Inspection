import { useState, useEffect } from 'react';
import {
  X, Plus, LayoutTemplate, TrendingUp, AlertTriangle,
  Building, Users, Zap, FileText as FileTextIcon,
  MapPin, Shield, Clock, Sparkles, BarChart3,
} from 'lucide-react';
import type { Quote, QuoteLineItem } from '../types';
import {
  INSPECTOR_RATES, DEFAULT_COST_INPUTS, QUOTE_TEMPLATES,
  TRAVEL_ZONES, ACCESS_DIFFICULTIES, SERVICE_TIERS,
  CALLOUT_MINIMUMS,
  calcCostBreakdown, calcMargin, marginColor, marginBgColor,
  getTargetMargin,
  KM_RATE_DEFAULT,
} from '../utils/costingEngine';
import type { CostInputs } from '../utils/costingEngine';
import PricingIntelligencePanel from './PricingIntelligencePanel';
import type { WinProbability } from './PricingIntelligencePanel';
import AIScopeEstimator from './AIScopeEstimator';
import PricingAnalyticsModal from './PricingAnalyticsModal';
import TravelPricingWidget from './TravelPricingWidget';
import type { TravelApplyPayload } from './TravelPricingWidget';
import { supabase } from '../../../lib/supabase';

const CATEGORIES = ['Labour', 'Materials', 'Equipment', 'Travel', 'Subcontract', 'Other'];
const NZ_REGIONS = ['Auckland', 'Wellington', 'Canterbury', 'Waikato', 'Bay of Plenty', 'Otago', "Hawke's Bay", 'Manawatu-Whanganui', 'Northland', 'Other'];

interface LineItemRow extends Partial<QuoteLineItem> {
  _key: string;
}

function newItem(): LineItemRow {
  return {
    _key: Math.random().toString(36).slice(2),
    description: '',
    category: 'Labour',
    unit: 'visit',
    quantity: 1,
    unit_price: 0,
    markup_percent: 0,
    line_total: 0,
  };
}

function calcLineTotal(item: LineItemRow): number {
  const base = (item.quantity ?? 0) * (item.unit_price ?? 0);
  const markup = base * ((item.markup_percent ?? 0) / 100);
  return Math.round((base + markup) * 100) / 100;
}

function SectionHeader({ icon: Icon, title, children }: { icon: any; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function NumInput({
  label, value, onChange, prefix = '', suffix = '', step = 1, min = 0,
}: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; step?: number; min?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{prefix}</span>}
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className={`w-full bg-slate-800 border border-slate-700 rounded-lg py-2 text-white text-sm focus:outline-none focus:border-[#C8102E] ${prefix ? 'pl-6' : 'pl-3'} ${suffix ? 'pr-10' : 'pr-3'}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{suffix}</span>}
      </div>
    </div>
  );
}

interface Props {
  onSave: (
    q: Partial<Quote> & {
      cost_inputs: CostInputs;
      internal_cost: number;
      gross_margin: number;
      gross_margin_pct: number;
      template_type?: string;
      win_probability?: string;
      pricing_tier?: string;
      region?: string;
    },
    items: Partial<QuoteLineItem>[]
  ) => Promise<void>;
  onClose: () => void;
}

export default function QuoteBuilderModal({ onSave, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'details' | 'costing' | 'items' | 'intelligence'>('details');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [winProbability, setWinProbability] = useState<WinProbability>('balanced');
  const [region, setRegion] = useState<string>('Auckland');
  const [showAIEstimator, setShowAIEstimator] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [defaultOfficeId, setDefaultOfficeId] = useState<string>('');
  const [defaultOfficeName, setDefaultOfficeName] = useState<string>('');

  useEffect(() => {
    supabase
      .from('offices')
      .select('id, name, address')
      .eq('active', true)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDefaultOfficeId(data.id);
          setDefaultOfficeName(data.name);
          setCostInputs(c => ({ ...c, office_id: data.id } as any));
        }
      });
  }, []);

  const [form, setForm] = useState<Partial<Quote>>({
    client_name: '',
    client_email: '',
    client_address: '',
    project_name: '',
    site_address: '',
    scope_of_work: '',
    gst_rate: 0.15,
    valid_until: '',
    terms_and_conditions: 'Payment is due within 30 days of invoice date. This quotation is valid for the period stated. All work performed to NZS 4512, NZS 4218, and relevant NZBC provisions as applicable.',
    notes: '',
    status: 'draft',
  });

  const [costInputs, setCostInputs] = useState<CostInputs>({ ...DEFAULT_COST_INPUTS });
  const [items, setItems] = useState<LineItemRow[]>([newItem()]);
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof Quote, val: any) => setForm(f => ({ ...f, [key]: val }));
  const setCost = (key: keyof CostInputs, val: any) => setCostInputs(c => ({ ...c, [key]: val }));

  const updateItem = (key: string, field: keyof LineItemRow, val: any) => {
    setItems(prev => prev.map(item => {
      if (item._key !== key) return item;
      const updated = { ...item, [field]: val };
      updated.line_total = calcLineTotal(updated);
      return updated;
    }));
  };

  const removeItem = (key: string) => setItems(prev => prev.filter(i => i._key !== key));
  const addItem = () => setItems(prev => [...prev, newItem()]);

  const applyTemplate = (templateType: string) => {
    const tpl = QUOTE_TEMPLATES.find(t => t.type === templateType);
    if (!tpl) return;
    setSelectedTemplate(templateType);
    setForm(f => ({
      ...f,
      scope_of_work: tpl.scopeOfWork,
      terms_and_conditions: tpl.terms,
      template_type: templateType,
    }));
    setCostInputs(c => ({ ...c, ...tpl.defaultCostInputs }));
    setItems(tpl.defaultLineItems.map(li => ({
      ...li,
      _key: Math.random().toString(36).slice(2),
      line_total: calcLineTotal({ ...li, _key: '' }),
    })));
    setActiveTab('details');
  };

  const handleTravelApply = (opts: TravelApplyPayload) => {
    setCostInputs(c => ({
      ...c,
      travelZone: opts.travelZone,
      travelKm: opts.travelKm,
      travelLabourHours: opts.travelLabourHours,
      travelLabourBillPct: opts.travelLabourBillPct,
      parking: (c.parking ?? 0) + opts.cbdParking,
      accommodation: opts.overnightMode ? Math.max(c.accommodation ?? 0, 180) : (c.accommodation ?? 0),
    }));
  };

  const handleAIApply = (
    aiCostInputs: Partial<CostInputs>,
    aiLineItems: LineItemRow[],
    scopeOfWork: string,
    serviceType: string
  ) => {
    setCostInputs(c => ({ ...c, ...aiCostInputs }));
    setItems(aiLineItems);
    if (scopeOfWork) setField('scope_of_work', scopeOfWork);
    if (serviceType) setSelectedTemplate(serviceType);
    setShowAIEstimator(false);
    setActiveTab('items');
  };

  const subtotal = items.reduce((s, i) => s + (i.line_total ?? 0), 0);
  const gstAmount = subtotal * (form.gst_rate ?? 0.15);
  const total = subtotal + gstAmount;

  const costBreakdown = calcCostBreakdown(costInputs);
  const { grossMargin, grossMarginPct } = calcMargin(subtotal, costBreakdown.totalInternalCost);
  const targetMargin = getTargetMargin(selectedTemplate);
  const mgColor = marginColor(grossMarginPct, targetMargin);
  const mgBg = marginBgColor(grossMarginPct, targetMargin);

  const selectedRate = INSPECTOR_RATES.find(r => r.type === costInputs.inspectorType);

  const handleSave = async () => {
    if (!form.client_name?.trim()) { setActiveTab('details'); return; }
    setSaving(true);
    try {
      const validItems = items.filter(i => i.description?.trim());
      await onSave(
        {
          ...form,
          cost_inputs: costInputs,
          internal_cost: costBreakdown.totalInternalCost,
          gross_margin: grossMargin,
          gross_margin_pct: grossMarginPct,
          template_type: selectedTemplate ?? undefined,
          win_probability: winProbability,
          pricing_tier: winProbability,
          region,
        },
        validItems
      );
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'details' as const, label: 'Client & Project' },
    { id: 'items' as const, label: 'Line Items' },
    { id: 'costing' as const, label: 'Costing Engine' },
    { id: 'intelligence' as const, label: 'Intelligence', highlight: true },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl my-4 flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#C8102E]/10 rounded-lg flex items-center justify-center">
                <FileTextIcon className="w-4 h-4 text-[#C8102E]" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Quote Builder</h2>
                {selectedTemplate && (
                  <p className="text-xs text-slate-500">
                    Template: {QUOTE_TEMPLATES.find(t => t.type === selectedTemplate)?.name}
                    {' '}— target margin {targetMargin}%
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnalytics(true)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
              </button>
              <button
                onClick={() => setShowAIEstimator(true)}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 px-3 py-1.5 rounded-lg border border-sky-800 hover:border-sky-700 bg-sky-900/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Estimate
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Template selector */}
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-2 mb-2">
              <LayoutTemplate className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Templates</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {QUOTE_TEMPLATES.map(tpl => (
                <button
                  key={tpl.type}
                  onClick={() => applyTemplate(tpl.type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    selectedTemplate === tpl.type
                      ? 'bg-[#C8102E]/20 border-[#C8102E] text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {tpl.name}
                </button>
              ))}
              {selectedTemplate && (
                <button onClick={() => setSelectedTemplate(null)} className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-400">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Tab Nav */}
          <div className="flex border-b border-slate-800 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'border-[#C8102E] text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
                {tab.highlight && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '62vh' }}>

            {/* ── CLIENT & PROJECT ── */}
            {activeTab === 'details' && (
              <div className="p-6 space-y-6">
                <div>
                  <SectionHeader icon={Users} title="Client Details" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Client / Company Name *</label>
                      <input
                        value={form.client_name ?? ''}
                        onChange={e => setField('client_name', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                        placeholder="Acme Construction Ltd"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Client Email</label>
                      <input
                        type="email"
                        value={form.client_email ?? ''}
                        onChange={e => setField('client_email', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-400 mb-1">Client Address</label>
                      <input
                        value={form.client_address ?? ''}
                        onChange={e => setField('client_address', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <SectionHeader icon={Building} title="Project Details" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Project Name</label>
                      <input
                        value={form.project_name ?? ''}
                        onChange={e => setField('project_name', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Site Address</label>
                      <input
                        value={form.site_address ?? ''}
                        onChange={e => setField('site_address', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">NZ Region</label>
                      <select
                        value={region}
                        onChange={e => setRegion(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                      >
                        {NZ_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      {defaultOfficeName && (
                        <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                          <Building className="w-3 h-3 text-slate-600" />
                          <span>Origin: <span className="text-slate-300 font-medium">{defaultOfficeName}</span></span>
                        </div>
                      )}
                      <TravelPricingWidget
                        siteAddress={form.site_address ?? ''}
                        onApply={handleTravelApply}
                        defaultOfficeId={defaultOfficeId}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Valid Until</label>
                      <input
                        type="date"
                        value={form.valid_until ?? ''}
                        onChange={e => setField('valid_until', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-400 mb-1">Scope of Work</label>
                      <textarea
                        value={form.scope_of_work ?? ''}
                        onChange={e => setField('scope_of_work', e.target.value)}
                        rows={4}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E] resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Internal Notes</label>
                      <input
                        value={form.notes ?? ''}
                        onChange={e => setField('notes', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                        placeholder="Internal reference, assumptions…"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Terms & Conditions</label>
                      <textarea
                        value={form.terms_and_conditions ?? ''}
                        onChange={e => setField('terms_and_conditions', e.target.value)}
                        rows={2}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E] resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── LINE ITEMS ── */}
            {activeTab === 'items' && (
              <div className="p-6">
                <SectionHeader icon={FileTextIcon} title="Line Items">
                  <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-[#C8102E] hover:text-red-400">
                    <Plus className="w-3.5 h-3.5" />Add Row
                  </button>
                </SectionHeader>

                <div className="rounded-xl border border-slate-700 overflow-hidden mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-slate-400">
                        <th className="text-left px-3 py-2.5 font-medium">Description</th>
                        <th className="text-left px-3 py-2.5 font-medium w-28">Category</th>
                        <th className="text-right px-3 py-2.5 font-medium w-16">Qty</th>
                        <th className="text-left px-3 py-2.5 font-medium w-16">Unit</th>
                        <th className="text-right px-3 py-2.5 font-medium w-24">Unit Price</th>
                        <th className="text-right px-3 py-2.5 font-medium w-20">Markup %</th>
                        <th className="text-right px-3 py-2.5 font-medium w-24">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {items.map(item => (
                        <tr key={item._key} className="bg-slate-900/50 hover:bg-slate-800/30">
                          <td className="px-3 py-2.5">
                            <input
                              value={item.description ?? ''}
                              onChange={e => updateItem(item._key!, 'description', e.target.value)}
                              className="w-full bg-transparent text-white text-xs focus:outline-none placeholder-slate-600"
                              placeholder="Description of service…"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              value={item.category ?? 'Labour'}
                              onChange={e => updateItem(item._key!, 'category', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-white text-xs focus:outline-none"
                            >
                              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              value={item.quantity ?? 1}
                              onChange={e => updateItem(item._key!, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent text-white text-xs text-right focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              value={item.unit ?? 'visit'}
                              onChange={e => updateItem(item._key!, 'unit', e.target.value)}
                              className="w-full bg-transparent text-white text-xs focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-0.5">
                              <span className="text-slate-600">$</span>
                              <input
                                type="number"
                                value={item.unit_price ?? 0}
                                onChange={e => updateItem(item._key!, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-20 bg-transparent text-white text-xs text-right focus:outline-none"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-0.5">
                              <input
                                type="number"
                                value={item.markup_percent ?? 0}
                                onChange={e => updateItem(item._key!, 'markup_percent', parseFloat(e.target.value) || 0)}
                                className="w-12 bg-transparent text-white text-xs text-right focus:outline-none"
                              />
                              <span className="text-slate-600">%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right text-emerald-400 font-semibold">
                            ${(item.line_total ?? 0).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-2.5">
                            <button onClick={() => removeItem(item._key!)} className="text-slate-600 hover:text-red-400">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>Subtotal (excl. GST)</span>
                      <span className="text-white">${subtotal.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>GST</span>
                        <select
                          value={form.gst_rate}
                          onChange={e => setField('gst_rate', parseFloat(e.target.value))}
                          className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                        >
                          <option value={0.15}>15%</option>
                          <option value={0.10}>10%</option>
                          <option value={0}>0%</option>
                        </select>
                      </div>
                      <span className="text-white">${gstAmount.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t border-slate-700 pt-2">
                      <span className="text-white">Total (incl. GST)</span>
                      <span className="text-emerald-400">${total.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── COSTING ENGINE ── */}
            {activeTab === 'costing' && (
              <div className="p-6 space-y-5">

                {/* Compact margin summary */}
                <div className={`rounded-xl border p-4 ${mgBg}`}>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Revenue (excl. GST)</p>
                      <p className="text-lg font-bold text-white">${subtotal.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Internal Cost</p>
                      <p className="text-lg font-bold text-slate-300">${costBreakdown.totalInternalCost.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Gross Margin $</p>
                      <p className={`text-lg font-bold ${mgColor}`}>${grossMargin.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Gross Margin %</p>
                      <p className={`text-2xl font-bold ${mgColor}`}>{grossMarginPct.toFixed(1)}%</p>
                    </div>
                  </div>
                  {costBreakdown.minimumEnforced && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-800 rounded-lg px-3 py-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      Minimum callout floor applied: ${costBreakdown.minimumAmount.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Service tier */}
                <div>
                  <SectionHeader icon={Clock} title="Service Tier" />
                  <div className="grid grid-cols-3 gap-3">
                    {SERVICE_TIERS.map(tier => (
                      <button
                        key={tier.id}
                        onClick={() => setCost('serviceTier', tier.id)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          costInputs.serviceTier === tier.id
                            ? 'border-[#C8102E] bg-[#C8102E]/10'
                            : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-semibold ${costInputs.serviceTier === tier.id ? 'text-white' : 'text-slate-300'}`}>
                            {tier.label}
                          </span>
                          {tier.premiumPct > 0 && (
                            <span className="text-xs text-amber-400 font-medium">+{tier.premiumPct}%</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{tier.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Labour */}
                <div>
                  <SectionHeader icon={Users} title="Labour" />
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Inspector Grade</label>
                      <select
                        value={costInputs.inspectorType}
                        onChange={e => setCost('inspectorType', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                      >
                        {INSPECTOR_RATES.map(r => (
                          <option key={r.type} value={r.type}>
                            {r.label} (sell ${r.hourlyRate}/hr)
                          </option>
                        ))}
                      </select>
                      {selectedRate && (
                        <p className="text-xs text-slate-500 mt-1">Loaded cost: ${selectedRate.loadedCostRate}/hr</p>
                      )}
                    </div>
                    <NumInput label="Site / Inspection Hours" value={costInputs.labourHours} onChange={v => setCost('labourHours', v)} step={0.5} suffix="hrs" />
                    <NumInput label="Report Writing Hours" value={costInputs.reportWritingHours} onChange={v => setCost('reportWritingHours', v)} step={0.5} suffix="hrs" />
                  </div>
                </div>

                {/* Access */}
                <div>
                  <SectionHeader icon={Shield} title="Site Access & Complexity" />
                  <div className="grid grid-cols-1 gap-2">
                    {ACCESS_DIFFICULTIES.map(diff => (
                      <button
                        key={diff.id}
                        onClick={() => setCost('accessDifficulty', diff.id)}
                        className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-left transition-all ${
                          costInputs.accessDifficulty === diff.id
                            ? 'border-[#C8102E] bg-[#C8102E]/10'
                            : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                        }`}
                      >
                        <span className={`text-sm ${costInputs.accessDifficulty === diff.id ? 'text-white' : 'text-slate-400'}`}>
                          {diff.label}
                        </span>
                        {diff.multiplier > 1 && (
                          <span className="text-xs font-semibold text-amber-400">{diff.multiplier}× labour</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Travel */}
                <div>
                  <SectionHeader icon={MapPin} title="Travel Zone & Disbursements" />
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {TRAVEL_ZONES.map(zone => (
                      <button
                        key={zone.id}
                        onClick={() => setCost('travelZone', zone.id)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          costInputs.travelZone === zone.id
                            ? 'border-[#C8102E] bg-[#C8102E]/10'
                            : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                        }`}
                      >
                        <p className={`text-xs font-semibold mb-0.5 ${costInputs.travelZone === zone.id ? 'text-white' : 'text-slate-300'}`}>
                          {zone.label}
                        </p>
                        <p className="text-xs text-slate-500">{zone.description}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          Min callout: ${CALLOUT_MINIMUMS[zone.id]?.toLocaleString()}
                          {zone.baseSurcharge > 0 && ` · +$${zone.baseSurcharge} surcharge`}
                        </p>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <NumInput label="Distance (km return)" value={costInputs.travelKm} onChange={v => setCost('travelKm', v)} suffix="km" />
                    <NumInput label="Km Rate" value={costInputs.kmRate ?? KM_RATE_DEFAULT} onChange={v => setCost('kmRate', v)} prefix="$" step={0.05} />
                    <NumInput label="Parking" value={costInputs.parking} onChange={v => setCost('parking', v)} prefix="$" />
                    <NumInput label="Tolls" value={costInputs.tolls} onChange={v => setCost('tolls', v)} prefix="$" />
                  </div>
                </div>

                {/* Other costs */}
                <div>
                  <SectionHeader icon={Building} title="Other Costs" />
                  <div className="grid grid-cols-3 gap-4">
                    <NumInput label="Callout Fee" value={costInputs.calloutFee} onChange={v => setCost('calloutFee', v)} prefix="$" />
                    <NumInput label="Accommodation" value={costInputs.accommodation} onChange={v => setCost('accommodation', v)} prefix="$" />
                    <NumInput label="Subcontractor Costs" value={costInputs.subcontractorCost} onChange={v => setCost('subcontractorCost', v)} prefix="$" />
                  </div>
                </div>

                {/* Surcharges */}
                <div>
                  <SectionHeader icon={Zap} title="Surcharges & Overhead" />
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Urgent Surcharge</label>
                      <div className="relative">
                        <input
                          type="number" min={0} max={100}
                          value={costInputs.urgentSurchargePercent}
                          onChange={e => setCost('urgentSurchargePercent', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">After-Hours Multiplier</label>
                      <select
                        value={costInputs.afterHoursMultiplier}
                        onChange={e => setCost('afterHoursMultiplier', parseFloat(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                      >
                        <option value={1}>Standard (1.0×)</option>
                        <option value={1.25}>Evening (1.25×)</option>
                        <option value={1.5}>Weekend (1.5×)</option>
                        <option value={2}>Public Holiday (2.0×)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Admin Overhead</label>
                      <div className="relative">
                        <input
                          type="number" min={0} max={50}
                          value={costInputs.adminOverheadPercent}
                          onChange={e => setCost('adminOverheadPercent', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full cost breakdown */}
                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Full Cost Breakdown</p>
                  <div className="space-y-1.5 text-sm">
                    {([
                      ['Callout Fee', costBreakdown.calloutFee],
                      ['Site Labour', costBreakdown.labourCost],
                      ['Report Writing', costBreakdown.reportWritingCost],
                      ['Travel Labour', costBreakdown.travelLabourCost],
                      ['Access Premium', costBreakdown.accessComplexityPremium],
                      ['After-Hours Premium', costBreakdown.afterHoursPremium],
                      ['Travel Zone Surcharge', costBreakdown.travelZoneSurcharge],
                      ['Mileage', costBreakdown.travelCost],
                      ['Parking & Tolls', costBreakdown.parkingTolls],
                      ['Accommodation', costBreakdown.accommodation],
                      ['Subcontractors', costBreakdown.subcontractorCost],
                      ['Service Tier Premium', costBreakdown.serviceTierPremium],
                      ['Urgent Surcharge', costBreakdown.urgentSurcharge],
                      ['Admin Overhead', costBreakdown.adminOverhead],
                    ] as [string, number][]).filter(([, v]) => v > 0).map(([label, value]) => (
                      <div key={label} className="flex justify-between text-slate-400">
                        <span>{label}</span>
                        <span className="text-slate-300">${value.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-white border-t border-slate-700 pt-2 mt-2">
                      <span>Total Internal Cost{costBreakdown.minimumEnforced ? ' (min. enforced)' : ''}</span>
                      <span>${costBreakdown.totalInternalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── INTELLIGENCE ── */}
            {activeTab === 'intelligence' && (
              <div className="p-6">
                <PricingIntelligencePanel
                  subtotal={subtotal}
                  costBreakdown={costBreakdown}
                  grossMargin={grossMargin}
                  grossMarginPct={grossMarginPct}
                  winProbability={winProbability}
                  onWinProbabilityChange={setWinProbability}
                  selectedTemplate={selectedTemplate}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/30">
            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${mgBg}`}>
              <TrendingUp className={`w-4 h-4 ${mgColor}`} />
              <div className="text-xs">
                <span className="text-slate-400">Margin: </span>
                <span className={`font-bold ${mgColor}`}>{grossMarginPct.toFixed(1)}%</span>
                <span className="text-slate-500 ml-2">(${grossMargin.toLocaleString('en-NZ', { minimumFractionDigits: 0 })})</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="text-xs">
                <span className="text-slate-400">Total: </span>
                <span className="text-white font-bold">${total.toLocaleString('en-NZ', { minimumFractionDigits: 0 })}</span>
              </div>
              {grossMarginPct > 0 && grossMarginPct < 25 && (
                <div className="flex items-center gap-1 text-xs text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Low margin
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.client_name?.trim()}
                className="px-6 py-2 bg-[#C8102E] hover:bg-[#A60E25] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Creating…' : 'Create Quote'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAIEstimator && (
        <AIScopeEstimator onApply={handleAIApply} onClose={() => setShowAIEstimator(false)} />
      )}

      {showAnalytics && (
        <PricingAnalyticsModal onClose={() => setShowAnalytics(false)} />
      )}
    </>
  );
}
