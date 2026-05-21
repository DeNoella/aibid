'use client';

import { useCallback, useEffect, useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import { api } from '@/services/api';
import { toast } from 'sonner';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check,
  Flag,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  priority: string;
  title: string;
  message: string;
  link_url: string | null;
  is_read: number;
  needs_follow_up: number;
  created_at: string;
}

interface AlertRule {
  rule_id: string;
  metric_name: string;
  condition_type: string;
  threshold_value: number;
  time_window: string;
  delivery_method: string;
}

const priorityDot: Record<string, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-blue-500',
};

function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ruleForm, setRuleForm] = useState({
    metricName: '',
    conditionType: 'above',
    thresholdValue: '',
    timeWindow: '24h',
    deliveryMethod: 'in_app',
  });

  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Notification[]>('/notifications');
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      setRulesLoading(true);
      const data = await api.get<AlertRule[]>('/notifications?tab=rules');
      setRules(data);
    } catch {
      toast.error('Failed to load alert rules');
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
    fetchRules();
  }, [fetchInbox, fetchRules]);

  const handleUpdate = async (id: string, updates: { isRead?: boolean; isDismissed?: boolean; needsFollowUp?: boolean }) => {
    try {
      await api.patch('/notifications', { id, updates });
      if (updates.isDismissed) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id
              ? {
                  ...n,
                  is_read: updates.isRead !== undefined ? (updates.isRead ? 1 : 0) : n.is_read,
                  needs_follow_up: updates.needsFollowUp !== undefined ? (updates.needsFollowUp ? 1 : 0) : n.needs_follow_up,
                }
              : n
          )
        );
      }
    } catch {
      toast.error('Update failed');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rules.length >= 10) {
      toast.error('Maximum 10 custom rules allowed');
      return;
    }
    if (!ruleForm.metricName || !ruleForm.thresholdValue) {
      toast.error('Fill in required fields');
      return;
    }
    try {
      await api.post('/notifications', {
        action: 'create-rule',
        metricName: ruleForm.metricName,
        conditionType: ruleForm.conditionType,
        thresholdValue: Number(ruleForm.thresholdValue),
        timeWindow: ruleForm.timeWindow,
        deliveryMethod: ruleForm.deliveryMethod,
      });
      toast.success('Alert rule created');
      setRuleForm({ metricName: '', conditionType: 'above', thresholdValue: '', timeWindow: '24h', deliveryMethod: 'in_app' });
      fetchRules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await api.delete(`/notifications?ruleId=${ruleId}`);
      setRules((prev) => prev.filter((r) => r.rule_id !== ruleId));
      toast.success('Rule deleted');
    } catch {
      toast.error('Failed to delete rule');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">Inbox and custom alert rules</p>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList className="bg-neutral-100 dark:bg-neutral-800">
          <TabsTrigger value="inbox">
            <Bell className="w-4 h-4 mr-2" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="rules">Alert rules</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-3 mt-4">
          {loading ? (
            <PageLoadingSkeleton rows={4} />
          ) : error ? (
            <PageError message={error} onRetry={fetchInbox} />
          ) : notifications.length === 0 ? (
            <EmptyState title="Inbox empty" description="You have no active notifications." />
          ) : (
            notifications.map((n) => {
              const isExpanded = expanded[n.id];
              return (
                <Card key={n.id} className={`p-4 ${!n.is_read ? 'border-l-4 border-l-neutral-800 dark:border-l-white' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${priorityDot[n.priority] ?? 'bg-neutral-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(n.created_at).toLocaleString()} · {n.priority}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpanded((prev) => ({ ...prev, [n.id]: !prev[n.id] }))}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm text-muted-foreground">{n.message}</p>
                          <div className="flex flex-wrap gap-2">
                            {!n.is_read && (
                              <Button size="sm" variant="outline" onClick={() => handleUpdate(n.id, { isRead: true })}>
                                <Check className="w-3 h-3 mr-1" />
                                Mark read
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdate(n.id, { needsFollowUp: !n.needs_follow_up })}
                            >
                              <Flag className="w-3 h-3 mr-1" />
                              {n.needs_follow_up ? 'Remove follow-up' : 'Follow up'}
                            </Button>
                            {n.link_url && (
                              <Button size="sm" variant="outline" asChild>
                                <Link href={n.link_url}>
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Open
                                </Link>
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleUpdate(n.id, { isDismissed: true })}>
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4 mt-4">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Create alert rule</h3>
              <Badge variant="outline">{rules.length}/10 rules</Badge>
            </div>
            <form onSubmit={handleCreateRule} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="metric">Metric name</Label>
                <Input
                  id="metric"
                  value={ruleForm.metricName}
                  onChange={(e) => setRuleForm((f) => ({ ...f, metricName: e.target.value }))}
                  placeholder="e.g. revenue_mtd"
                  className="mt-1"
                  disabled={rules.length >= 10}
                />
              </div>
              <div>
                <Label>Condition</Label>
                <Select
                  value={ruleForm.conditionType}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, conditionType: v }))}
                  disabled={rules.length >= 10}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Above threshold</SelectItem>
                    <SelectItem value="below">Below threshold</SelectItem>
                    <SelectItem value="change">Percent change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="threshold">Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={ruleForm.thresholdValue}
                  onChange={(e) => setRuleForm((f) => ({ ...f, thresholdValue: e.target.value }))}
                  className="mt-1"
                  disabled={rules.length >= 10}
                />
              </div>
              <div>
                <Label>Time window</Label>
                <Select
                  value={ruleForm.timeWindow}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, timeWindow: v }))}
                  disabled={rules.length >= 10}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Delivery</Label>
                <Select
                  value={ruleForm.deliveryMethod}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, deliveryMethod: v }))}
                  disabled={rules.length >= 10}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_app">In-app</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={rules.length >= 10} className="w-full">
                  Create rule
                </Button>
              </div>
            </form>
            {rules.length >= 10 && (
              <p className="text-sm text-amber-600 mt-3">Maximum 10 custom rules reached. Delete a rule to add another.</p>
            )}
          </Card>

          {rulesLoading ? (
            <PageLoadingSkeleton rows={2} />
          ) : rules.length === 0 ? (
            <EmptyState title="No alert rules" description="Create rules to get notified when metrics cross thresholds." />
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <Card key={rule.rule_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{rule.metric_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rule.condition_type} {rule.threshold_value} · {rule.time_window} · {rule.delivery_method}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteRule(rule.rule_id)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RoleGuard allowedRoles={['analyst']}>
      <NotificationsContent />
    </RoleGuard>
  );
}
