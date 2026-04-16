export type LeadStage = 'new' | 'contacted' | 'qualified' | 'quote_sent' | 'won' | 'lost';
export type LeadSource = 'manual' | 'referral' | 'website' | 'cold_call' | 'linkedin' | 'tender' | 'other';

export interface Lead {
  id: string;
  organization_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  job_title: string | null;
  source: LeadSource;
  stage: LeadStage;
  estimated_value: number;
  notes: string | null;
  assigned_to: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  follow_up_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'follow_up' | 'stage_change';

export interface LeadActivity {
  id: string;
  lead_id: string;
  organization_id: string;
  activity_type: ActivityType;
  subject: string | null;
  body: string | null;
  outcome: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  is_completed: boolean;
  created_by: string | null;
  created_at: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'invoiced';

export interface Quote {
  id: string;
  organization_id: string;
  quote_number: string;
  lead_id: string | null;
  client_id: string | null;
  client_name: string;
  client_email: string | null;
  client_address: string | null;
  project_name: string | null;
  site_address: string | null;
  scope_of_work: string | null;
  status: QuoteStatus;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
  valid_until: string | null;
  terms_and_conditions: string | null;
  notes: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  line_items?: QuoteLineItem[];
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  organization_id: string;
  description: string;
  category: string;
  material_id: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  markup_percent: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export type CampaignType = 'email' | 'follow_up' | 're_engagement' | 'announcement';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  subject: string | null;
  body_template: string | null;
  target_stage: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  lead_id: string;
  organization_id: string;
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
}

export interface GrowthDashboardStats {
  pipelineValue: number;
  wonValue: number;
  quotesSent: number;
  conversionRate: number;
  leadsTotal: number;
  leadsWon: number;
  leadsLost: number;
  activeLeads: number;
  byStage: Record<LeadStage, number>;
  byStageValue: Record<LeadStage, number>;
  recentActivity: LeadActivity[];
  upcomingFollowUps: Lead[];
}

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  quote_sent: 'Quote Sent',
  won: 'Won',
  lost: 'Lost',
};

export const STAGE_COLORS: Record<LeadStage, string> = {
  new: 'bg-slate-600',
  contacted: 'bg-blue-600',
  qualified: 'bg-amber-500',
  quote_sent: 'bg-orange-500',
  won: 'bg-emerald-600',
  lost: 'bg-red-700',
};

export const STAGE_TEXT_COLORS: Record<LeadStage, string> = {
  new: 'text-slate-400',
  contacted: 'text-blue-400',
  qualified: 'text-amber-400',
  quote_sent: 'text-orange-400',
  won: 'text-emerald-400',
  lost: 'text-red-400',
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call: 'Phone',
  email: 'Mail',
  meeting: 'Users',
  note: 'FileText',
  follow_up: 'Clock',
  stage_change: 'ArrowRight',
};
