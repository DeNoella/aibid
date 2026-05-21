'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { api } from '@/services/api';
import { formatRelativeTime } from '@/utils/dateFormat';
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import { toast } from 'sonner';
import { Shield, Download, ChevronDown, Ban } from 'lucide-react';

interface AuditEvent {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  module: string;
  details: string;
  ip_address?: string;
  risk_level: string;
  created_at: string;
}

interface AuditUser {
  id: string;
  name: string;
}

interface AlertRule {
  rule_id: string;
  condition_description: string;
  condition_type: string;
  threshold_value?: number;
  time_window_minutes?: number;
}

interface AuditResponse {
  events: AuditEvent[];
  users: AuditUser[];
  rules: AlertRule[];
}

function riskDot(level: string) {
  const l = (level || 'normal').toLowerCase();
  if (l === 'critical' || l === 'high') return 'bg-red-500';
  if (l === 'medium' || l === 'amber') return 'bg-amber-500';
  return 'bg-green-500';
}

async function downloadAuditExport(params: URLSearchParams) {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`/api/admin/audit/export?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'audit-log.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [userId, setUserId] = useState('all');
  const [actionType, setActionType] = useState('all');
  const [riskLevel, setRiskLevel] = useState('all');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [newRule, setNewRule] = useState({ conditionDescription: '', conditionType: 'failed_login', thresholdValue: 5, timeWindowMinutes: 60 });

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (userId !== 'all') params.set('userId', userId);
      if (actionType !== 'all') params.set('actionType', actionType);
      if (riskLevel !== 'all') params.set('riskLevel', riskLevel);
      const qs = params.toString();
      const result = await api.get<AuditResponse>(`/admin/audit${qs ? `?${qs}` : ''}`);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit feed');
    } finally {
      setLoading(false);
    }
  }, [from, to, userId, actionType, riskLevel]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const handleRevoke = async (event: AuditEvent) => {
    try {
      await api.post('/admin/audit', {
        action: 'revoke-session',
        userId: event.user_id,
        userName: event.user_name,
      });
      toast.success('Session revoked');
      fetchAudit();
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (userId !== 'all') params.set('userId', userId);
      if (actionType !== 'all') params.set('actionType', actionType);
      if (riskLevel !== 'all') params.set('riskLevel', riskLevel);
      await downloadAuditExport(params);
      toast.success('Audit log exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const saveRule = async () => {
    try {
      await api.post('/admin/audit', { action: 'save-rule', ...newRule });
      toast.success('Alert rule saved');
      setNewRule({ conditionDescription: '', conditionType: 'failed_login', thresholdValue: 5, timeWindowMinutes: 60 });
      fetchAudit();
    } catch {
      toast.error('Failed to save rule');
    }
  };

  if (loading && !data) return <div className="p-6"><PageLoadingSkeleton rows={6} /></div>;
  if (error && !data) return <div className="p-6"><PageError message={error} onRetry={fetchAudit} /></div>;

  const events = data?.events ?? [];
  const users = data?.users ?? [];
  const rules = data?.rules ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit & Security</h1>
            <p className="text-sm text-muted-foreground">Monitor events and configure alert rules</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <Label className="text-xs">User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Action type</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="data access">Data access</SelectItem>
                <SelectItem value="report download">Report download</SelectItem>
                <SelectItem value="permission change">Permission change</SelectItem>
                <SelectItem value="failed attempt">Failed attempt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Risk</Label>
            <Select value={riskLevel} onValueChange={setRiskLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-3" variant="outline" onClick={fetchAudit}>Apply filters</Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Audit Feed</h3>
        {events.length === 0 ? (
          <EmptyState title="No events" description="No audit events match your filters." />
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const isRed = ['critical', 'high'].includes((event.risk_level || '').toLowerCase());
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                >
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${riskDot(event.risk_level)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{event.action}</span>
                      <span className="text-xs text-muted-foreground">· {event.module}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{event.user_name} — {event.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(event.created_at)}
                      {event.ip_address ? ` · ${event.ip_address}` : ''}
                    </p>
                  </div>
                  {isRed && (
                    <Button variant="destructive" size="sm" onClick={() => handleRevoke(event)}>
                      <Ban className="w-3 h-3 mr-1" />
                      Revoke session
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Collapsible open={rulesOpen} onOpenChange={setRulesOpen}>
        <Card className="p-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <span className="font-semibold text-foreground">Alert Rules</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${rulesOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom rules configured.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {rules.map((rule) => (
                  <li key={rule.rule_id} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                    {rule.condition_description} ({rule.condition_type})
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div><Label>Description</Label><Input value={newRule.conditionDescription} onChange={(e) => setNewRule({ ...newRule, conditionDescription: e.target.value })} /></div>
              <div>
                <Label>Condition type</Label>
                <Select value={newRule.conditionType} onValueChange={(v) => setNewRule({ ...newRule, conditionType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="failed_login">Failed login</SelectItem>
                    <SelectItem value="bulk_download">Bulk download</SelectItem>
                    <SelectItem value="permission_change">Permission change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveRule}>Add rule</Button>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
