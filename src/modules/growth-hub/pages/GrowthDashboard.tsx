import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, FileText, Target, Users,
  Calendar, ArrowRight, Clock, Phone, Mail, MessageSquare
} from 'lucide-react';
import { fetchDashboardStats } from '../services/growthHubService';
import type { GrowthDashboardStats, LeadStage } from '../types';
import { STAGE_LABELS, STAGE_COLORS } from '../types';
import OfficeComparisonPanel from '../components/OfficeComparisonPanel';
import OfficeProfitabilityDashboard from '../components/OfficeProfitabilityDashboard';
import RouteBundleWidget from '../components/RouteBundleWidget';
import WinLossAnalyticsPanel from '../components/WinLossAnalyticsPanel';

function StatCard({
  icon: Icon, label, value, sub, color = 'text-white'
}: {
  icon: any; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    </div>
  );
}

const ACTIVITY_ICON_MAP: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: MessageSquare,
  follow_up: Clock,
  stage_change: ArrowRight,
};

export default function GrowthDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<GrowthDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0B0F14]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C8102E]" />
      </div>
    );
  }

  const s = stats!;
  const stages: LeadStage[] = ['new', 'contacted', 'qualified', 'quote_sent', 'won', 'lost'];
  const maxStageCount = Math.max(...stages.map(st => s.byStage[st] ?? 0), 1);

  return (
    <div className="flex-1 bg-[#0B0F14] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Growth Hub</h1>
          <p className="text-slate-400 text-sm mt-1">Pipeline overview and sales performance</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={DollarSign}
            label="Pipeline Value"
            value={`$${(s.pipelineValue / 1000).toFixed(0)}k`}
            sub={`${s.activeLeads} active leads`}
            color="text-emerald-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Won Value"
            value={`$${(s.wonValue / 1000).toFixed(0)}k`}
            sub={`${s.leadsWon} jobs won`}
            color="text-blue-400"
          />
          <StatCard
            icon={FileText}
            label="Quotes Sent"
            value={String(s.quotesSent)}
            sub="active & accepted"
            color="text-amber-400"
          />
          <StatCard
            icon={Target}
            label="Conversion Rate"
            value={`${s.conversionRate}%`}
            sub={`${s.leadsWon} won / ${s.leadsWon + s.leadsLost} closed`}
            color="text-[#C8102E]"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Funnel */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Pipeline Stages</h2>
              <button
                onClick={() => navigate('/app/growth/leads')}
                className="text-xs text-[#C8102E] hover:text-red-400 flex items-center gap-1"
              >
                View Kanban <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {stages.map(stage => {
                const count = s.byStage[stage] ?? 0;
                const value = s.byStageValue[stage] ?? 0;
                const pct = Math.round((count / maxStageCount) * 100);
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300 w-24">{STAGE_LABELS[stage]}</span>
                      <span className="text-xs text-slate-500">{count} lead{count !== 1 ? 's' : ''}</span>
                      <span className="text-xs text-slate-400 text-right w-20">
                        {value > 0 ? `$${(value / 1000).toFixed(0)}k` : '—'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${STAGE_COLORS[stage]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Follow-ups */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Follow-ups Due</h2>
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            {s.upcomingFollowUps.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No upcoming follow-ups</p>
              </div>
            ) : (
              <div className="space-y-3">
                {s.upcomingFollowUps.map(lead => {
                  const date = lead.follow_up_date
                    ? new Date(lead.follow_up_date).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short' })
                    : '';
                  const isToday = lead.follow_up_date === new Date().toISOString().split('T')[0];
                  return (
                    <div
                      key={lead.id}
                      onClick={() => navigate('/app/growth/leads')}
                      className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${isToday ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate font-medium">{lead.company_name}</p>
                        <p className="text-xs text-slate-500">{STAGE_LABELS[lead.stage]}</p>
                      </div>
                      <span className={`text-xs font-medium ${isToday ? 'text-red-400' : 'text-slate-400'}`}>
                        {isToday ? 'Today' : date}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Win / Loss Analytics */}
        <div className="mt-6">
          <WinLossAnalyticsPanel />
        </div>

        {/* Office Intelligence */}
        <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <OfficeProfitabilityDashboard />
          <RouteBundleWidget />
        </div>

        <div className="mt-6">
          <OfficeComparisonPanel />
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Recent Activity</h2>
          </div>
          {s.recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No activity logged yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {s.recentActivity.map(act => {
                const Icon = ACTIVITY_ICON_MAP[act.activity_type] ?? MessageSquare;
                const date = new Date(act.created_at).toLocaleDateString('en-NZ', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                });
                return (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300">
                        {act.subject ?? act.activity_type}
                      </p>
                      {act.body && (
                        <p className="text-xs text-slate-500 truncate">{act.body}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 whitespace-nowrap">{date}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
