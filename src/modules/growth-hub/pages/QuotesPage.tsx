import { useEffect, useState } from 'react';
import {
  Plus, Search, Download, FileText, CheckCircle2, XCircle,
  Clock, Send, X, Trash2, ChevronDown, ChevronUp, AlertCircle,
  TrendingUp, TrendingDown
} from 'lucide-react';
import {
  fetchQuotes, createQuote, updateQuoteStatus, deleteQuote
} from '../services/growthHubService';
import { exportQuotePDF } from '../utils/quotePdfExport';
import QuoteBuilderModal from '../components/QuoteBuilderModal';
import { marginColor, marginBgColor } from '../utils/costingEngine';
import type { Quote, QuoteLineItem, QuoteStatus } from '../types';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; icon: any }> = {
  draft:    { label: 'Draft',    color: 'bg-slate-700 text-slate-300',         icon: FileText },
  sent:     { label: 'Sent',     color: 'bg-blue-900/50 text-blue-300',        icon: Send },
  accepted: { label: 'Accepted', color: 'bg-emerald-900/50 text-emerald-300',  icon: CheckCircle2 },
  declined: { label: 'Declined', color: 'bg-red-900/50 text-red-300',          icon: XCircle },
  expired:  { label: 'Expired',  color: 'bg-amber-900/50 text-amber-300',      icon: AlertCircle },
  invoiced: { label: 'Invoiced', color: 'bg-sky-900/50 text-sky-300',          icon: CheckCircle2 },
};

function fmtCurrency(v: number) {
  return `$${v.toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
  const avgMargin = filtered.filter(q => q.gross_margin_pct != null).length > 0
    ? filtered
        .filter(q => q.gross_margin_pct != null)
        .reduce((s, q) => s + (q.gross_margin_pct ?? 0), 0) /
      filtered.filter(q => q.gross_margin_pct != null).length
    : null;

  return (
    <div className="flex-1 bg-[#0B0F14] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Quotes</h1>
            <p className="text-sm text-slate-400 mt-1">
              {filtered.length} quotes · {fmtCurrency(totalValue)} total · {fmtCurrency(acceptedValue)} accepted
              {avgMargin !== null && (
                <span className={`ml-2 ${marginColor(avgMargin)}`}>· {avgMargin.toFixed(1)}% avg margin</span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C8102E] hover:bg-[#A60E25] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />New Quote
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {(['all', 'sent', 'accepted', 'declined'] as const).map(s => {
            const list = s === 'all' ? quotes : quotes.filter(q => q.status === s);
            const val = list.reduce((sum, q) => sum + (q.total ?? 0), 0);
            const cfg = s === 'all' ? null : STATUS_CONFIG[s];
            return (
              <div
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-colors ${
                  statusFilter === s ? 'border-[#C8102E]' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <p className="text-xs text-slate-500 mb-1">{s === 'all' ? 'All Quotes' : cfg!.label}</p>
                <p className="text-xl font-bold text-white">{list.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">{fmtCurrency(val)}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
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
            <p className="text-slate-400 mb-4">No quotes found</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-[#C8102E] text-white text-sm rounded-lg hover:bg-[#A60E25]"
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
              const hasCost = quote.gross_margin_pct != null;
              const mgPct = quote.gross_margin_pct ?? 0;
              const mgDollar = quote.gross_margin ?? 0;

              return (
                <div key={quote.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4 p-4">

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-slate-500">{quote.quote_number}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        {quote.template_type && (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-xs rounded-full">
                            {quote.template_type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-white font-medium truncate">{quote.client_name}</p>
                      {quote.project_name && (
                        <p className="text-xs text-slate-500 truncate">{quote.project_name}</p>
                      )}
                    </div>

                    {/* Margin badge */}
                    {hasCost && (
                      <div className={`flex-shrink-0 text-center px-3 py-2 rounded-lg border ${marginBgColor(mgPct)}`}>
                        <p className={`text-sm font-bold ${marginColor(mgPct)}`}>{mgPct.toFixed(1)}%</p>
                        <p className="text-xs text-slate-500">margin</p>
                      </div>
                    )}

                    {/* Pricing */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-emerald-400">{fmtCurrency(quote.total ?? 0)}</p>
                      {hasCost && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          cost {fmtCurrency(quote.internal_cost ?? 0)}
                        </p>
                      )}
                      {quote.valid_until && (
                        <p className="text-xs text-slate-600 flex items-center gap-1 justify-end mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(quote.valid_until).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
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

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/50">
                      {/* Line items */}
                      {quote.line_items && quote.line_items.length > 0 && (
                        <div className="p-4">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Line Items</p>
                          <div className="space-y-0 rounded-lg overflow-hidden border border-slate-800">
                            {quote.line_items.sort((a, b) => a.sort_order - b.sort_order).map((li, i) => (
                              <div
                                key={li.id}
                                className={`flex items-center gap-3 text-xs py-2 px-3 ${i % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-900/20'}`}
                              >
                                <span className="flex-1 text-slate-300">{li.description}</span>
                                <span className="text-slate-500 w-20 text-center">{li.category}</span>
                                <span className="text-slate-400 w-20 text-right">{li.quantity} {li.unit}</span>
                                <span className="text-slate-400 w-24 text-right">${li.unit_price.toFixed(2)}</span>
                                <span className="text-emerald-400 font-medium w-24 text-right">${li.line_total.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex justify-end gap-6 text-xs border-t border-slate-800 pt-3">
                            <span className="text-slate-400">Subtotal: <span className="text-white">${quote.subtotal.toFixed(2)}</span></span>
                            <span className="text-slate-400">GST ({Math.round((quote.gst_rate ?? 0.15) * 100)}%): <span className="text-white">${quote.gst_amount.toFixed(2)}</span></span>
                            <span className="text-slate-400 font-medium">Total: <span className="text-emerald-400 font-bold text-sm">${quote.total.toFixed(2)}</span></span>
                          </div>
                        </div>
                      )}

                      {/* Cost summary (internal) */}
                      {hasCost && (
                        <div className="px-4 pb-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Internal Cost Analysis</p>
                          <div className={`rounded-lg border p-3 grid grid-cols-3 gap-4 text-xs ${marginBgColor(mgPct)}`}>
                            <div>
                              <p className="text-slate-400 mb-0.5">Internal Cost</p>
                              <p className="text-white font-semibold">${(quote.internal_cost ?? 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 mb-0.5">Gross Margin $</p>
                              <p className={`font-semibold ${marginColor(mgPct)}`}>${mgDollar.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 mb-0.5">Gross Margin %</p>
                              <p className={`text-lg font-bold ${marginColor(mgPct)}`}>{mgPct.toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Scope */}
                      {quote.scope_of_work && (
                        <div className="px-4 pb-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Scope of Work</p>
                          <p className="text-xs text-slate-400 leading-relaxed">{quote.scope_of_work}</p>
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
        <QuoteBuilderModal
          onSave={async (q, items) => { await handleCreate(q as Partial<Quote>, items); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
