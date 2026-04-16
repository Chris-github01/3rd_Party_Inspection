import { useState } from 'react';
import {
  X, Plus, ChevronDown, ChevronUp, Zap, LayoutTemplate,
  TrendingUp, AlertTriangle, Clock, Car, Building, Users,
  Wrench, FileText as FileTextIcon
} from 'lucide-react';
import type { Quote, QuoteLineItem } from '../types';
import {
  INSPECTOR_RATES, DEFAULT_COST_INPUTS, QUOTE_TEMPLATES,
  calcCostBreakdown, calcMargin, marginColor, marginBgColor,
  KM_RATE_DEFAULT,
} from '../utils/costingEngine';
import type { CostInputs } from '../utils/costingEngine';

const CATEGORIES = ['Labour', 'Materials', 'Equipment', 'Travel', 'Subcontract', 'Other'];

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
  label, value, onChange, prefix = '', suffix = '', step = 1, min = 0
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
  onSave: (q: Partial<Quote> & { cost_inputs: CostInputs; internal_cost: number; gross_margin: number; gross_margin_pct: number; template_type?: string }, items: Partial<QuoteLineItem>[]) => Promise<void>;
  onClose: () => void;
}

export default function QuoteBuilderModal({ onSave, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'details' | 'costing' | 'items'>('details');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [costingOpen, setCostingOpen] = useState(true);

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

  // Derived calculations
  const subtotal = items.reduce((s, i) => s + (i.line_total ?? 0), 0);
  const gstAmount = subtotal * (form.gst_rate ?? 0.15);
  const total = subtotal + gstAmount;

  const costBreakdown = calcCostBreakdown(costInputs);
  const { grossMargin, grossMarginPct } = calcMargin(subtotal, costBreakdown.totalInternalCost);

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
        },
        validItems
      );
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'details', label: 'Client & Project' },
    { id: 'items', label: 'Line Items' },
    { id: 'costing', label: 'Costing Engine' },
  ] as const;

  const mgColor = marginColor(grossMarginPct);
  const mgBg = marginBgColor(grossMarginPct);

  return (
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
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template selector */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40">
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
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-400"
              >
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
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-[#C8102E] text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
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
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Scope of Work</label>
                    <textarea
                      value={form.scope_of_work ?? ''}
                      onChange={e => setField('scope_of_work', e.target.value)}
                      rows={4}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={form.valid_until ?? ''}
                    onChange={e => setField('valid_until', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
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
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Terms & Conditions</label>
                  <textarea
                    value={form.terms_and_conditions ?? ''}
                    onChange={e => setField('terms_and_conditions', e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E] resize-none"
                  />
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

              {/* Totals */}
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
            <div className="p-6 space-y-6">
              {/* Margin summary card */}
              <div className={`rounded-xl border p-4 ${mgBg}`}>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Revenue (excl. GST)</p>
                    <p className="text-lg font-bold text-white">${subtotal.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Est. Internal Cost</p>
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
                {grossMarginPct < 25 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Margin below 25% — consider adjusting line item pricing or reducing costs.</span>
                  </div>
                )}
              </div>

              {/* Inspector */}
              <div>
                <SectionHeader icon={Users} title="Labour" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-xs text-slate-500 mb-1">Inspector Grade</label>
                    <select
                      value={costInputs.inspectorType}
                      onChange={e => setCost('inspectorType', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                    >
                      {INSPECTOR_RATES.map(r => (
                        <option key={r.type} value={r.type}>{r.label} (${r.hourlyRate}/hr)</option>
                      ))}
                    </select>
                  </div>
                  <NumInput label="Inspection / Site Hours" value={costInputs.labourHours} onChange={v => setCost('labourHours', v)} step={0.5} suffix="hrs" />
                  <NumInput label="Report Writing Hours" value={costInputs.reportWritingHours} onChange={v => setCost('reportWritingHours', v)} step={0.5} suffix="hrs" />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-4 text-xs text-slate-500 bg-slate-800/50 rounded-lg p-3">
                  <div>Site labour: <span className="text-slate-300">${costBreakdown.labourCost.toFixed(2)}</span></div>
                  <div>Report writing: <span className="text-slate-300">${costBreakdown.reportWritingCost.toFixed(2)}</span></div>
                  {costBreakdown.afterHoursPremium > 0 && (
                    <div>After-hours premium: <span className="text-amber-300">${costBreakdown.afterHoursPremium.toFixed(2)}</span></div>
                  )}
                </div>
              </div>

              {/* Travel */}
              <div>
                <SectionHeader icon={Car} title="Travel & Disbursements" />
                <div className="grid grid-cols-4 gap-4">
                  <NumInput label="Travel (km return)" value={costInputs.travelKm} onChange={v => setCost('travelKm', v)} suffix="km" />
                  <NumInput label="Km Rate" value={costInputs.kmRate ?? KM_RATE_DEFAULT} onChange={v => setCost('kmRate', v)} prefix="$" step={0.01} />
                  <NumInput label="Parking" value={costInputs.parking} onChange={v => setCost('parking', v)} prefix="$" />
                  <NumInput label="Tolls" value={costInputs.tolls} onChange={v => setCost('tolls', v)} prefix="$" />
                </div>
                {(costBreakdown.travelCost + costBreakdown.parkingTolls) > 0 && (
                  <div className="mt-2 text-xs text-slate-500 bg-slate-800/50 rounded-lg p-3 flex gap-6">
                    <span>Travel: <span className="text-slate-300">${costBreakdown.travelCost.toFixed(2)}</span></span>
                    <span>Parking & Tolls: <span className="text-slate-300">${costBreakdown.parkingTolls.toFixed(2)}</span></span>
                  </div>
                )}
              </div>

              {/* Other costs */}
              <div>
                <SectionHeader icon={Building} title="Accommodation & Subcontractors" />
                <div className="grid grid-cols-2 gap-4">
                  <NumInput label="Accommodation" value={costInputs.accommodation} onChange={v => setCost('accommodation', v)} prefix="$" />
                  <NumInput label="Subcontractor Costs" value={costInputs.subcontractorCost} onChange={v => setCost('subcontractorCost', v)} prefix="$" />
                </div>
              </div>

              {/* Surcharges */}
              <div>
                <SectionHeader icon={Zap} title="Surcharges & Multipliers" />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Urgent Turnaround Surcharge</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={costInputs.urgentSurchargePercent}
                        onChange={e => setCost('urgentSurchargePercent', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                    </div>
                    {costBreakdown.urgentSurcharge > 0 && (
                      <p className="text-xs text-amber-400 mt-1">+${costBreakdown.urgentSurcharge.toFixed(2)}</p>
                    )}
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
                    {costBreakdown.afterHoursPremium > 0 && (
                      <p className="text-xs text-amber-400 mt-1">+${costBreakdown.afterHoursPremium.toFixed(2)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Admin Overhead</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={costInputs.adminOverheadPercent}
                        onChange={e => setCost('adminOverheadPercent', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                    </div>
                    {costBreakdown.adminOverhead > 0 && (
                      <p className="text-xs text-slate-500 mt-1">+${costBreakdown.adminOverhead.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Full cost breakdown */}
              <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cost Breakdown</p>
                <div className="space-y-1.5 text-sm">
                  {[
                    ['Site Labour', costBreakdown.labourCost],
                    ['Report Writing', costBreakdown.reportWritingCost],
                    ['After-Hours Premium', costBreakdown.afterHoursPremium],
                    ['Travel (km)', costBreakdown.travelCost],
                    ['Parking & Tolls', costBreakdown.parkingTolls],
                    ['Accommodation', costBreakdown.accommodation],
                    ['Subcontractors', costBreakdown.subcontractorCost],
                    ['Urgent Surcharge', costBreakdown.urgentSurcharge],
                    ['Admin Overhead', costBreakdown.adminOverhead],
                  ].filter(([, v]) => (v as number) > 0).map(([label, value]) => (
                    <div key={label as string} className="flex justify-between text-slate-400">
                      <span>{label as string}</span>
                      <span className="text-slate-300">${(value as number).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-white border-t border-slate-700 pt-2 mt-2">
                    <span>Total Internal Cost</span>
                    <span>${costBreakdown.totalInternalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/30">
          {/* Margin pill */}
          <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${mgBg}`}>
            <TrendingUp className={`w-4 h-4 ${mgColor}`} />
            <div className="text-xs">
              <span className="text-slate-400">Margin: </span>
              <span className={`font-bold ${mgColor}`}>{grossMarginPct.toFixed(1)}%</span>
              <span className="text-slate-500 ml-2">(${grossMargin.toLocaleString('en-NZ', { minimumFractionDigits: 0 })})</span>
            </div>
            <div className="text-xs">
              <span className="text-slate-400">Total: </span>
              <span className="text-white font-bold">${total.toLocaleString('en-NZ', { minimumFractionDigits: 0 })}</span>
            </div>
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
  );
}
