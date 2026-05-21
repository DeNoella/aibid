export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst';
  avatar?: string;
  organizationId?: string;
}

export interface MetricData {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ChartDataPoint {
  name: string;
  value?: number;
  revenue?: number;
  cost?: number;
  profit?: number;
  conversions?: number;
  clicks?: number;
  impressions?: number;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  module: string;
  details: string;
}

export interface VoiceCommand {
  command: string;
  timestamp: Date;
  recognized: boolean;
  action?: string;
}

export interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  timestamp: Date;
  impact: 'high' | 'medium' | 'low';
}

export interface Report {
  id: string;
  title: string;
  type: string;
  generatedAt: Date;
  status: 'ready' | 'generating' | 'scheduled';
  downloadUrl?: string;
}

// CRM Types
export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  lifecycle_stage: 'subscriber' | 'lead' | 'mql' | 'sql' | 'opportunity' | 'customer' | 'evangelist';
  source: string;
  company_id: string;
  company_name?: string;
  notes: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website: string;
  contact_count?: number;
  deal_count?: number;
  total_deal_value?: number;
  created_at: string;
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage_id: string;
  stage_name?: string;
  stage_color?: string;
  contact_id: string;
  contact_name?: string;
  company_id: string;
  company_name?: string;
  owner_id: string;
  owner_name?: string;
  expected_close_date: string;
  actual_close_date: string | null;
  notes: string;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
  probability: number;
  color: string;
  is_won: number;
  is_lost: number;
  deal_count?: number;
  total_value?: number;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'follow_up';
  subject: string;
  description: string;
  contact_id: string;
  deal_id: string;
  user_id: string;
  user_name?: string;
  contact_name?: string;
  deal_title?: string;
  is_completed: number;
  due_date: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  total_impressions?: number;
  total_clicks?: number;
  total_conversions?: number;
  total_revenue?: number;
  created_at: string;
}
