import { useEffect, useState, useRef } from 'react';
import {
  Plus, Search, Phone, Mail, Calendar, DollarSign,
  MoreVertical, X, ChevronDown, User, Pencil, Trash2,
  Building2, Tag, Clock
} from 'lucide-react';
import {
  fetchLeads, createLead, updateLead, updateLeadStage,
  deleteLead, createActivity, fetchLeadActivities
} from '../services/growthHubService';
import type { Lead, LeadStage, LeadActivity, ActivityType } from '../types';
import { STAGE_LABELS, STAGE_COLORS, STAGE_TEXT_COLORS } from '../types';

const STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'quote_sent', 'won', 'lost'];

const SOURCES = ['manual', 'referral', 'website', 'cold_call', 'linkedin', 'tender', 'other'];

function LeadModal({
  lead,
  onSave,
  onClose,
}: {
  lead?: Lead | null;
  onSave: (data: Partial<Lead>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Lead>>({
    company_name: lead?.company_name ?? '',
    contact_name: lead?.contact_name ?? '',
    contact_email: lead?.contact_email ?? '',
    contact_phone: lead?.contact_phone ?? '',
    job_title: lead?.job_title ?? '',
    source: lead?.source ?? 'manual',
    stage: lead?.stage ?? 'new',
    estimated_value: lead?.estimated_value ?? 0,
    notes: lead?.notes ?? '',
    follow_up_date: lead?.follow_up_date ?? '',
  });

  const set = (key: keyof Lead, val: any) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-semibold">{lead ? 'Edit Lead' : 'New Lead'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Company Name *</label>
            <input
              value={form.company_name ?? ''}
              onChange={e => set('company_name', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              placeholder="Acme Construction Ltd"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Contact Name</label>
              <input
                value={form.contact_name ?? ''}
                onChange={e => set('contact_name', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Job Title</label>
              <input
                value={form.job_title ?? ''}
                onChange={e => set('job_title', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
                placeholder="Project Manager"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={form.contact_email ?? ''}
                onChange={e => set('contact_email', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Phone</label>
              <input
                value={form.contact_phone ?? ''}
                onChange={e => set('contact_phone', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Stage</label>
              <select
                value={form.stage}
                onChange={e => set('stage', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              >
                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Source</label>
              <select
                value={form.source}
                onChange={e => set('source', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              >
                {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Estimated Value ($)</label>
              <input
                type="number"
                value={form.estimated_value ?? 0}
                onChange={e => set('estimated_value', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={form.follow_up_date ?? ''}
                onChange={e => set('follow_up_date', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E] resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.company_name?.trim()}
            className="px-5 py-2 bg-[#C8102E] hover:bg-[#A60E25] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {lead ? 'Save Changes' : 'Create Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityModal({
  leadId,
  orgId,
  onClose,
  onSaved,
}: {
  leadId: string;
  orgId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<ActivityType>('note');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await createActivity({
      lead_id: leadId,
      activity_type: type,
      subject: subject || null,
      body: body || null,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      is_completed: false,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-white font-semibold">Log Activity</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ActivityType)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
            >
              {(['call','email','meeting','note','follow_up'] as ActivityType[]).map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              placeholder="What happened?"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E] resize-none"
            />
          </div>
          {type === 'follow_up' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Scheduled For</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-[#C8102E] hover:bg-[#A60E25] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Log Activity'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  onEdit,
  onDelete,
  onStageChange,
  onLogActivity,
}: {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStageChange: (lead: Lead, stage: LeadStage) => void;
  onLogActivity: (lead: Lead) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];
  const followUpOverdue = lead.follow_up_date && lead.follow_up_date < today;
  const followUpToday = lead.follow_up_date === today;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3.5 hover:border-slate-600 transition-colors group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{lead.company_name}</p>
          {lead.contact_name && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3" />{lead.contact_name}
              {lead.job_title && <span className="text-slate-600">· {lead.job_title}</span>}
            </p>
          )}
        </div>
        <div className="relative ml-2" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-20 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1">
              <button onClick={() => { onEdit(lead); setMenuOpen(false); }}
                className="w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5" />Edit Lead
              </button>
              <button onClick={() => { onLogActivity(lead); setMenuOpen(false); }}
                className="w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />Log Activity
              </button>
              <hr className="border-slate-700 my-1" />
              <button onClick={() => { onDelete(lead); setMenuOpen(false); }}
                className="w-full px-3 py-2 text-xs text-red-400 hover:bg-slate-800 flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" />Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {lead.estimated_value > 0 && (
        <div className="flex items-center gap-1 text-xs text-emerald-400 mb-2">
          <DollarSign className="w-3 h-3" />
          {lead.estimated_value.toLocaleString('en-NZ', { minimumFractionDigits: 0 })}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-2">
        {lead.contact_email && (
          <a href={`mailto:${lead.contact_email}`} className="text-slate-500 hover:text-blue-400 transition-colors">
            <Mail className="w-3.5 h-3.5" />
          </a>
        )}
        {lead.contact_phone && (
          <a href={`tel:${lead.contact_phone}`} className="text-slate-500 hover:text-green-400 transition-colors">
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}
        {lead.follow_up_date && (
          <span className={`flex items-center gap-1 text-xs ${
            followUpOverdue ? 'text-red-400' : followUpToday ? 'text-amber-400' : 'text-slate-500'
          }`}>
            <Clock className="w-3 h-3" />
            {followUpToday ? 'Today' : new Date(lead.follow_up_date).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short' })}
          </span>
        )}
        <div className="ml-auto relative">
          <button
            onClick={() => setStageOpen(!stageOpen)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
          >
            Move <ChevronDown className="w-3 h-3" />
          </button>
          {stageOpen && (
            <div className="absolute right-0 bottom-6 z-20 w-36 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1">
              {STAGES.filter(s => s !== lead.stage).map(s => (
                <button
                  key={s}
                  onClick={() => { onStageChange(lead, s); setStageOpen(false); }}
                  className="w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
                >
                  {STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const MessageSquare = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export default function LeadsKanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [activityLead, setActivityLead] = useState<Lead | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await fetchLeads();
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = leads.filter(l =>
    !search ||
    l.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (l.contact_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (form: Partial<Lead>) => {
    if (editLead) {
      await updateLead(editLead.id, form);
    } else {
      await createLead(form);
    }
    setShowModal(false);
    setEditLead(null);
    load();
  };

  const handleStageChange = async (lead: Lead, stage: LeadStage) => {
    await updateLeadStage(lead.id, stage);
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage } : l));
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Delete lead "${lead.company_name}"?`)) return;
    await deleteLead(lead.id);
    setLeads(prev => prev.filter(l => l.id !== lead.id));
  };

  return (
    <div className="flex-1 bg-[#0B0F14] flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          <p className="text-xs text-slate-500">{leads.length} total leads</p>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E] w-52"
            />
          </div>
          <button
            onClick={() => { setEditLead(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#C8102E] hover:bg-[#A60E25] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C8102E]" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 h-full p-6 min-w-max">
            {STAGES.map(stage => {
              const stageLeads = filtered.filter(l => l.stage === stage);
              const stageValue = stageLeads.reduce((s, l) => s + (l.estimated_value ?? 0), 0);
              return (
                <div key={stage} className="flex flex-col w-72 bg-slate-900/50 rounded-xl border border-slate-800">
                  {/* Column Header */}
                  <div className="px-4 py-3 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${STAGE_COLORS[stage]}`} />
                        <span className={`text-sm font-semibold ${STAGE_TEXT_COLORS[stage]}`}>
                          {STAGE_LABELS[stage]}
                        </span>
                        <span className="text-xs bg-slate-800 text-slate-400 rounded-full px-2 py-0.5">
                          {stageLeads.length}
                        </span>
                      </div>
                      {stageValue > 0 && (
                        <span className="text-xs text-slate-500">
                          ${(stageValue / 1000).toFixed(0)}k
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {stageLeads.length === 0 ? (
                      <div className="text-center py-8 text-slate-700 text-xs">
                        No leads
                      </div>
                    ) : (
                      stageLeads.map(lead => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onEdit={l => { setEditLead(l); setShowModal(true); }}
                          onDelete={handleDelete}
                          onStageChange={handleStageChange}
                          onLogActivity={l => setActivityLead(l)}
                        />
                      ))
                    )}
                  </div>

                  {/* Add button */}
                  <div className="p-3 border-t border-slate-800">
                    <button
                      onClick={() => { setEditLead(null); setShowModal(true); }}
                      className="w-full flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 py-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />Add lead
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <LeadModal
          lead={editLead}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditLead(null); }}
        />
      )}

      {activityLead && (
        <ActivityModal
          leadId={activityLead.id}
          orgId={activityLead.organization_id}
          onClose={() => setActivityLead(null)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
