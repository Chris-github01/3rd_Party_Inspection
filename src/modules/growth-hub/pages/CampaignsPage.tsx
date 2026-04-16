import { useEffect, useState } from 'react';
import {
  Plus, Search, X, Mail, Zap, RefreshCw, Megaphone,
  Play, Pause, CheckCircle2, Clock, Users, BarChart2,
  Trash2, ChevronDown, ChevronUp, Calendar
} from 'lucide-react';
import {
  fetchCampaigns, createCampaign, updateCampaign, deleteCampaign,
  fetchLeads
} from '../services/growthHubService';
import type { Campaign, CampaignType, CampaignStatus, Lead } from '../types';
import { STAGE_LABELS } from '../types';

const TYPE_CONFIG: Record<CampaignType, { label: string; icon: any; color: string }> = {
  email: { label: 'Email Blast', icon: Mail, color: 'text-blue-400' },
  follow_up: { label: 'Follow-up Sequence', icon: Clock, color: 'text-amber-400' },
  re_engagement: { label: 'Re-engagement', icon: RefreshCw, color: 'text-purple-400' },
  announcement: { label: 'Announcement', icon: Megaphone, color: 'text-emerald-400' },
};

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-slate-700 text-slate-300', icon: Clock },
  active: { label: 'Active', color: 'bg-emerald-900/50 text-emerald-300', icon: Play },
  paused: { label: 'Paused', color: 'bg-amber-900/50 text-amber-300', icon: Pause },
  completed: { label: 'Completed', color: 'bg-blue-900/50 text-blue-300', icon: CheckCircle2 },
};

const STAGES = ['new', 'contacted', 'qualified', 'quote_sent', 'won', 'lost'];

function CreateCampaignModal({
  leads,
  onSave,
  onClose,
}: {
  leads: Lead[];
  onSave: (c: Partial<Campaign>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Campaign>>({
    name: '',
    description: '',
    campaign_type: 'email',
    status: 'draft',
    subject: '',
    body_template: '',
    target_stage: '',
    scheduled_at: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof Campaign, val: any) => setForm(f => ({ ...f, [key]: val }));

  const targetLeads = form.target_stage
    ? leads.filter(l => l.stage === form.target_stage)
    : leads;

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        total_recipients: targetLeads.length,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const typeInfo = TYPE_CONFIG[form.campaign_type ?? 'email'];
  const TypeIcon = typeInfo.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-white font-semibold text-lg">New Campaign</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Campaign Type selector */}
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">Campaign Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TYPE_CONFIG) as [CampaignType, typeof TYPE_CONFIG[CampaignType]][]).map(([type, cfg]) => {
                const Icon = cfg.icon;
                const active = form.campaign_type === type;
                return (
                  <button
                    key={type}
                    onClick={() => set('campaign_type', type)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      active
                        ? 'border-[#C8102E] bg-[#C8102E]/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-[#C8102E]' : cfg.color}`} />
                    <span className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-300'}`}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Campaign Name *</label>
            <input
              value={form.name ?? ''}
              onChange={e => set('name', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              placeholder="e.g. Q2 Follow-up Sequence"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <input
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              placeholder="Brief description of campaign goal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Stage</label>
              <select
                value={form.target_stage ?? ''}
                onChange={e => set('target_stage', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              >
                <option value="">All Leads ({leads.length})</option>
                {STAGES.map(s => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s as keyof typeof STAGE_LABELS]} ({leads.filter(l => l.stage === s).length})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-600 mt-1">{targetLeads.length} leads will be targeted</p>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Scheduled Date</label>
              <input
                type="datetime-local"
                value={form.scheduled_at ?? ''}
                onChange={e => set('scheduled_at', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Email Subject</label>
            <input
              value={form.subject ?? ''}
              onChange={e => set('subject', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E]"
              placeholder="e.g. Following up on your fire protection requirements"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Message Template</label>
            <textarea
              value={form.body_template ?? ''}
              onChange={e => set('body_template', e.target.value)}
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C8102E] resize-none font-mono"
              placeholder="Hi {{contact_name}},&#10;&#10;I wanted to follow up regarding…&#10;&#10;Kind regards,&#10;{{sender_name}}"
            />
            <p className="text-xs text-slate-600 mt-1">Use {'{{contact_name}}'}, {'{{company_name}}'}, {'{{sender_name}}'} as placeholders</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name?.trim()}
            className="px-6 py-2 bg-[#C8102E] hover:bg-[#A60E25] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [c, l] = await Promise.all([fetchCampaigns(), fetchLeads()]);
    setCampaigns(c);
    setLeads(l);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = campaigns.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (c: Partial<Campaign>) => {
    await createCampaign(c);
    load();
  };

  const handleStatusToggle = async (campaign: Campaign) => {
    const nextStatus: CampaignStatus =
      campaign.status === 'draft' ? 'active' :
      campaign.status === 'active' ? 'paused' :
      campaign.status === 'paused' ? 'active' : campaign.status;
    const updated = await updateCampaign(campaign.id, { status: nextStatus });
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? updated : c));
  };

  const handleDelete = async (c: Campaign) => {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    await deleteCampaign(c.id);
    setCampaigns(prev => prev.filter(x => x.id !== c.id));
  };

  const totalRecipients = campaigns.reduce((s, c) => s + (c.total_recipients ?? 0), 0);
  const totalSent = campaigns.reduce((s, c) => s + (c.total_sent ?? 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="flex-1 bg-[#0B0F14] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaigns</h1>
            <p className="text-sm text-slate-400 mt-1">
              {activeCampaigns} active · {totalRecipients} total recipients · {totalSent} sent
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C8102E] hover:bg-[#A60E25] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />New Campaign
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {(['draft', 'active', 'paused', 'completed'] as CampaignStatus[]).map(s => {
            const count = campaigns.filter(c => c.status === s).length;
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <div key={s} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-400 capitalize">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="mb-5">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
            />
          </div>
        </div>

        {/* Campaign list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C8102E]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Mail className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">No campaigns yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-[#C8102E] text-white text-sm rounded-lg hover:bg-[#A60E25]"
            >
              Create First Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(campaign => {
              const cfg = STATUS_CONFIG[campaign.status];
              const typeCfg = TYPE_CONFIG[campaign.campaign_type];
              const StatusIcon = cfg.icon;
              const TypeIcon = typeCfg.icon;
              const isExpanded = expandedId === campaign.id;
              const openRate = campaign.total_sent > 0
                ? Math.round((campaign.total_opened / campaign.total_sent) * 100)
                : 0;
              const clickRate = campaign.total_sent > 0
                ? Math.round((campaign.total_clicked / campaign.total_sent) * 100)
                : 0;

              return (
                <div key={campaign.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-4 p-4">
                    <div className={`w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className={`w-5 h-5 ${typeCfg.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white font-medium">{campaign.name}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {typeCfg.label}
                        {campaign.target_stage && ` · ${STAGE_LABELS[campaign.target_stage as keyof typeof STAGE_LABELS] ?? campaign.target_stage} leads`}
                        {campaign.description && ` · ${campaign.description}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 text-xs flex-shrink-0">
                      <div className="text-center">
                        <p className="text-white font-medium">{campaign.total_recipients}</p>
                        <p className="text-slate-500">Recipients</p>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-medium">{campaign.total_sent}</p>
                        <p className="text-slate-500">Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-emerald-400 font-medium">{openRate}%</p>
                        <p className="text-slate-500">Open rate</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {campaign.scheduled_at && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(campaign.scheduled_at).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                      {campaign.status !== 'completed' && (
                        <button
                          onClick={() => handleStatusToggle(campaign)}
                          className={`p-2 rounded-lg transition-colors ${
                            campaign.status === 'active'
                              ? 'text-amber-400 hover:bg-amber-900/20'
                              : 'text-emerald-400 hover:bg-emerald-900/20'
                          }`}
                          title={campaign.status === 'active' ? 'Pause' : 'Activate'}
                        >
                          {campaign.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(campaign)}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/50 p-5">
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        {[
                          { label: 'Recipients', value: campaign.total_recipients, color: 'text-white' },
                          { label: 'Sent', value: campaign.total_sent, color: 'text-blue-400' },
                          { label: `Opened (${openRate}%)`, value: campaign.total_opened, color: 'text-emerald-400' },
                          { label: `Clicked (${clickRate}%)`, value: campaign.total_clicked, color: 'text-amber-400' },
                        ].map(stat => (
                          <div key={stat.label} className="bg-slate-900 rounded-lg p-3 text-center">
                            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                          </div>
                        ))}
                      </div>

                      {campaign.subject && (
                        <div className="mb-3">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Subject</p>
                          <p className="text-sm text-slate-300 bg-slate-900 rounded-lg px-3 py-2">{campaign.subject}</p>
                        </div>
                      )}

                      {campaign.body_template && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Message Template</p>
                          <pre className="text-xs text-slate-400 bg-slate-900 rounded-lg px-3 py-3 whitespace-pre-wrap font-mono leading-relaxed">
                            {campaign.body_template}
                          </pre>
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
        <CreateCampaignModal
          leads={leads}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
