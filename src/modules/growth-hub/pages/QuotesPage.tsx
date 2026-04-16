import { useEffect, useState } from 'react';
import {
  Plus, Search, Download, FileText, CheckCircle2, XCircle,
  Clock, Send, X, Trash2, ChevronDown, ChevronUp, DollarSign,
  Eye, AlertCircle
} from 'lucide-react';
import {
  fetchQuotes, createQuote, updateQuoteStatus, deleteQuote
} from '../services/growthHubService';
import { exportQuotePDF } from '../utils/quotePdfExport';
import type { Quote, QuoteLineItem, QuoteStatus } from '../types';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-slate-700 text-slate-300', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-900/50 text-blue-300', icon: Send },
  accepted: { label: 'Accepted', color: 'bg-emerald-900/50 text-emerald-300', icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'bg-red-900/50 text-red-300', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-amber-900/50 text-amber-300', icon: AlertCircle },
  invoiced: { label: 'Invoiced', color: 'bg-purple-900/50 text-purple-300', icon: CheckCircle2 },
};

const CATEGORIES = ['Labour', 'Materials', 'Equipment', 'Travel', 'Subcontract', 'Other'];

interface LineItemRow extends Partial<QuoteLineItem> {
  _key: string;
}

function newItem(): LineItemRow {
  return {
    _key: Math.random().toString(36).slice(2),
    description: '',
    category: 'Labour',
    unit: 'm2',
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

function CreateQuoteModal({
  onSave,
  onClose,
}: {
  onSave: (q: Partial<Quote>, items: Partial<QuoteLineItem>[]) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Quote>>({
    client_name: '',
    client_email: '',
    client_address: '',
    project_name: '',
    site_address: '',
    scope_of_work: '',
    gst_rate: 0.15,
    valid_until: '',
    terms_and_conditions: 'Payment due within 30 days of invoice date. This quote is valid for the period stated above.',
    notes: '',
    status: 'draft',
  });
  const [items, setItems] = useState<LineItemRow[]>([newItem()]);
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof Quote, val: any) => setForm(f => ({ ...f, [key]: val }));

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

  const subtotal = items.reduce((s, i) => s + (i.line_total ?? 0), 0);
  const gstAmount = subtotal * (form.gst_rate ?? 0.15);
  const total = subtotal + gstAmount;

  const handleSave = async () => {
    if (!form.client_name?.trim()) return;
    setSaving(true);
    try {
      const validItems = items.filter(i => i.description?.trim());
      await onSave(form, validItems);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl my-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-white font-semibold text-lg">Create Quotation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Client Details */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Client Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Client / Company Name *</label>
                <input
                  value={form.client_name ?? ''}
                  onChange={e => setField('client_name', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
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

          {/* Project Details */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Project Details</h3>
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
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Line Items</h3>
              <button onClick={addItem} className="flex items-center gap-1.5 text-xs text-[#C8102E] hover:text-red-400">
                <Plus className="w-3.5 h-3.5" />Add Item
              </button>
            </div>
            <div className="rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800 text-slate-400">
                    <th className="text-left px-3 py-2 font-medium">Description</th>
                    <th className="text-left px-3 py-2 font-medium w-28">Category</th>
                    <th className="text-right px-3 py-2 font-medium w-16">Qty</th>
                    <th className="text-left px-3 py-2 font-medium w-16">Unit</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Unit Price</th>
                    <th className="text-right px-3 py-2 font-medium w-20">Markup%</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map(item => (
                    <tr key={item._key} className="bg-slate-900/50">
                      <td className="px-3 py-2">
                        <input
                          value={item.description ?? ''}
                          onChange={e => updateItem(item._key!, 'description', e.target.value)}
                          className="w-full bg-transparent text-white text-xs focus:outline-none placeholder-slate-600"
                          placeholder="Description of work…"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.category ?? 'Labour'}
                          onChange={e => updateItem(item._key!, 'category', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-white text-xs focus:outline-none"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity ?? 1}
                          onChange={e => updateItem(item._key!, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-white text-xs text-right focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={item.unit ?? 'm2'}
                          onChange={e => updateItem(item._key!, 'unit', e.target.value)}
                          className="w-full bg-transparent text-white text-xs focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unit_price ?? 0}
                          onChange={e => updateItem(item._key!, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-white text-xs text-right focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.markup_percent ?? 0}
                          onChange={e => updateItem(item._key!, 'markup_percent', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-white text-xs text-right focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-400 font-medium">
                        ${(item.line_total ?? 0).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => removeItem(item._key!)}
                          className="text-slate-600 hover:text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>GST</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={form.gst_rate}
                      onChange={e => setField('gst_rate', parseFloat(e.target.value))}
                      className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
                    >
                      <option value={0.15}>15%</option>
                      <option value={0.10}>10%</option>
                      <option value={0}>0%</option>
                    </select>
                    <span>${gstAmount.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <div className="flex justify-between text-white font-bold text-base border-t border-slate-700 pt-1.5">
                  <span>Total</span>
                  <span className="text-emerald-400">${total.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Meta */}
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
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <input
                value={form.notes ?? ''}
                onChange={e => setField('notes', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              />
            </div>
            <div className="col-span-2">
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

        <div className="flex justify-end gap-3 p-6 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
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
  );
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchQuotes();
    setQuotes(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.client_name.toLowerCase().includes(search.toLowerCase()) ||
      q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
      (q.project_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async (q: Partial<Quote>, items: Partial<QuoteLineItem>[]) => {
    await createQuote(q, items);
    load();
  };

  const handleStatusChange = async (id: string, status: QuoteStatus) => {
    await updateQuoteStatus(id, status);
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
  };

  const handleDelete = async (q: Quote) => {
    if (!confirm(`Delete quote ${q.quote_number}?`)) return;
    await deleteQuote(q.id);
    setQuotes(prev => prev.filter(x => x.id !== q.id));
  };

  const totalValue = filtered.reduce((s, q) => s + (q.total ?? 0), 0);
  const acceptedValue = filtered.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total ?? 0), 0);

  return (
    <div className="flex-1 bg-[#0B0F14] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Quotes</h1>
            <p className="text-sm text-slate-400 mt-1">
              {filtered.length} quotes · Total ${totalValue.toLocaleString('en-NZ', { minimumFractionDigits: 0 })} · Accepted ${acceptedValue.toLocaleString('en-NZ', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C8102E] hover:bg-[#A60E25] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />New Quote
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search quotes…"
              className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E] w-56"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'draft', 'sent', 'accepted', 'declined', 'expired', 'invoiced'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-[#C8102E] text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Quotes List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C8102E]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No quotes found</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-[#C8102E] text-white text-sm rounded-lg hover:bg-[#A60E25]"
            >
              Create First Quote
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(quote => {
              const cfg = STATUS_CONFIG[quote.status];
              const StatusIcon = cfg.icon;
              const isExpanded = expandedId === quote.id;

              return (
                <div key={quote.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-mono text-slate-500">{quote.quote_number}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-white font-medium truncate">{quote.client_name}</p>
                      {quote.project_name && (
                        <p className="text-xs text-slate-500 truncate">{quote.project_name}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-emerald-400">
                        ${(quote.total ?? 0).toLocaleString('en-NZ', { minimumFractionDigits: 0 })}
                      </p>
                      {quote.valid_until && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 justify-end mt-0.5">
                          <Clock className="w-3 h-3" />
                          Valid to {new Date(quote.valid_until).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => exportQuotePDF(quote)}
                        title="Download PDF"
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <select
                        value={quote.status}
                        onChange={e => handleStatusChange(quote.id, e.target.value as QuoteStatus)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#C8102E]"
                      >
                        {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                          <option key={s} value={s}>{c.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : quote.id)}
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(quote)}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && quote.line_items && quote.line_items.length > 0 && (
                    <div className="border-t border-slate-800 bg-slate-950/50">
                      <div className="p-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Line Items</p>
                        <div className="space-y-1">
                          {quote.line_items.sort((a, b) => a.sort_order - b.sort_order).map(li => (
                            <div key={li.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-800/50 last:border-0">
                              <span className="flex-1 text-slate-300">{li.description}</span>
                              <span className="text-slate-500 w-20">{li.category}</span>
                              <span className="text-slate-400 w-20 text-right">{li.quantity} {li.unit}</span>
                              <span className="text-slate-400 w-24 text-right">${li.unit_price.toFixed(2)}</span>
                              <span className="text-emerald-400 font-medium w-24 text-right">${li.line_total.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-end gap-6 text-xs">
                          <span className="text-slate-400">Subtotal: <span className="text-white">${quote.subtotal.toFixed(2)}</span></span>
                          <span className="text-slate-400">GST: <span className="text-white">${quote.gst_amount.toFixed(2)}</span></span>
                          <span className="text-slate-400">Total: <span className="text-emerald-400 font-bold text-sm">${quote.total.toFixed(2)}</span></span>
                        </div>
                      </div>
                      {quote.scope_of_work && (
                        <div className="px-4 pb-4">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Scope</p>
                          <p className="text-xs text-slate-400">{quote.scope_of_work}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateQuoteModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
