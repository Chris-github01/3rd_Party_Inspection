import { supabase } from '../../../lib/supabase';
import type {
  Lead, LeadStage, LeadActivity, Quote, QuoteLineItem,
  Campaign, GrowthDashboardStats
} from '../types';

async function getOrgId(): Promise<string | null> {
  const { data } = await supabase
    .from('organization_users')
    .select('organization_id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
}

// ─── LEADS ───────────────────────────────────────────────────────────────────

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLead(lead: Partial<Lead>): Promise<Lead> {
  const orgId = await getOrgId();
  if (!orgId) throw new Error('No organization found');
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...lead, organization_id: orgId, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLeadStage(id: string, stage: LeadStage, extra?: Partial<Lead>): Promise<Lead> {
  const updates: Partial<Lead> = { stage, ...extra };
  if (stage === 'won') updates.won_at = new Date().toISOString();
  if (stage === 'lost') updates.lost_at = new Date().toISOString();
  return updateLead(id, updates);
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

// ─── LEAD ACTIVITIES ─────────────────────────────────────────────────────────

export async function fetchLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createActivity(activity: Partial<LeadActivity>): Promise<LeadActivity> {
  const orgId = await getOrgId();
  if (!orgId) throw new Error('No organization found');
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from('lead_activities')
    .insert({ ...activity, organization_id: orgId, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchUpcomingFollowUps(): Promise<LeadActivity[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*, lead:leads(company_name, stage)')
    .eq('activity_type', 'follow_up')
    .eq('is_completed', false)
    .gte('scheduled_at', today)
    .order('scheduled_at', { ascending: true })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

// ─── QUOTES ──────────────────────────────────────────────────────────────────

export async function fetchQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, line_items:quote_line_items(*)')
    .not('organization_id', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(q => ({ ...q, line_items: q.line_items ?? [] }));
}

export async function fetchQuote(id: string): Promise<Quote | null> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, line_items:quote_line_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, line_items: data.line_items ?? [] } : null;
}

export async function generateQuoteNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);
  const seq = String((count ?? 0) + 1).padStart(3, '0');
  return `Q-${year}-${seq}`;
}

export async function createQuote(quote: Partial<Quote>, lineItems: Partial<QuoteLineItem>[]): Promise<Quote> {
  const orgId = await getOrgId();
  if (!orgId) throw new Error('No organization found');
  const user = (await supabase.auth.getUser()).data.user;
  const quoteNumber = await generateQuoteNumber(orgId);

  const subtotal = lineItems.reduce((s, li) => s + (li.line_total ?? 0), 0);
  const gstRate = quote.gst_rate ?? 0.15;
  const gstAmount = subtotal * gstRate;
  const total = subtotal + gstAmount;

  const { data: quoteData, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      ...quote,
      organization_id: orgId,
      created_by: user?.id,
      quote_number: quoteNumber,
      subtotal,
      gst_amount: gstAmount,
      total,
      cost_inputs: quote.cost_inputs ?? null,
      internal_cost: quote.internal_cost ?? null,
      gross_margin: quote.gross_margin ?? null,
      gross_margin_pct: quote.gross_margin_pct ?? null,
      template_type: quote.template_type ?? null,
    })
    .select()
    .single();
  if (quoteError) throw quoteError;

  if (lineItems.length > 0) {
    const items = lineItems.map((li, i) => ({
      ...li,
      quote_id: quoteData.id,
      organization_id: orgId,
      sort_order: i,
    }));
    const { error: liError } = await supabase.from('quote_line_items').insert(items);
    if (liError) throw liError;
  }

  return fetchQuote(quoteData.id) as Promise<Quote>;
}

export async function updateQuoteStatus(id: string, status: Quote['status']): Promise<void> {
  const updates: Partial<Quote> = { status };
  if (status === 'sent') updates.sent_at = new Date().toISOString();
  if (status === 'accepted') updates.accepted_at = new Date().toISOString();
  if (status === 'declined') updates.declined_at = new Date().toISOString();
  const { error } = await supabase.from('quotes').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) throw error;
}

// ─── CAMPAIGNS ───────────────────────────────────────────────────────────────

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCampaign(campaign: Partial<Campaign>): Promise<Campaign> {
  const orgId = await getOrgId();
  if (!orgId) throw new Error('No organization found');
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ ...campaign, organization_id: orgId, created_by: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) throw error;
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<GrowthDashboardStats> {
  const [leadsResult, quotesResult, activitiesResult] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('quotes').select('total, status').not('organization_id', 'is', null),
    supabase
      .from('lead_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const leads: Lead[] = leadsResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const activities: LeadActivity[] = activitiesResult.data ?? [];

  const byStage = {} as Record<string, number>;
  const byStageValue = {} as Record<string, number>;
  const stages = ['new', 'contacted', 'qualified', 'quote_sent', 'won', 'lost'];
  stages.forEach(s => { byStage[s] = 0; byStageValue[s] = 0; });

  leads.forEach(l => {
    byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;
    byStageValue[l.stage] = (byStageValue[l.stage] ?? 0) + (l.estimated_value ?? 0);
  });

  const wonLeads = leads.filter(l => l.stage === 'won');
  const lostLeads = leads.filter(l => l.stage === 'lost');
  const closedCount = wonLeads.length + lostLeads.length;
  const conversionRate = closedCount > 0 ? Math.round((wonLeads.length / closedCount) * 100) : 0;

  const pipelineValue = leads
    .filter(l => !['won', 'lost'].includes(l.stage))
    .reduce((s, l) => s + (l.estimated_value ?? 0), 0);

  const wonValue = wonLeads.reduce((s, l) => s + (l.estimated_value ?? 0), 0);
  const quotesSent = quotes.filter(q => ['sent', 'accepted'].includes(q.status)).length;

  const today = new Date().toISOString().split('T')[0];
  const upcomingFollowUps = leads
    .filter(l => l.follow_up_date && l.follow_up_date >= today && !['won', 'lost'].includes(l.stage))
    .sort((a, b) => (a.follow_up_date ?? '').localeCompare(b.follow_up_date ?? ''))
    .slice(0, 5);

  return {
    pipelineValue,
    wonValue,
    quotesSent,
    conversionRate,
    leadsTotal: leads.length,
    leadsWon: wonLeads.length,
    leadsLost: lostLeads.length,
    activeLeads: leads.filter(l => !['won', 'lost'].includes(l.stage)).length,
    byStage: byStage as Record<LeadStage, number>,
    byStageValue: byStageValue as Record<LeadStage, number>,
    recentActivity: activities,
    upcomingFollowUps,
  };
}
