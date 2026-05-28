'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check,
  Flag,
  ExternalLink,
  MessageSquarePlus,
  Search,
  X,
  Reply,
  User as UserIcon,
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
  sender_user_id: string | null;
  sender_name: string | null;
  category: string;
}

interface AlertRule {
  rule_id: string;
  metric_name: string;
  condition_type: string;
  threshold_value: number;
  time_window: string;
  delivery_method: string;
}

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  organization_id: string | null;
  organization_name: string | null;
}

const priorityDot: Record<string, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-blue-500',
};

const emptyCompose = {
  recipientIds: [] as string[],
  subject: '',
  body: '',
  priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
};

function NotificationsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Compose dialog state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState(emptyCompose);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [sending, setSending] = useState(false);
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

  const fetchDirectory = useCallback(async () => {
    setDirectoryLoading(true);
    try {
      const data = await api.get<DirectoryUser[]>('/users');
      setDirectory(data);
    } catch {
      toast.error('Failed to load people directory');
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
    if (!isAdmin) fetchRules();
  }, [fetchInbox, fetchRules, isAdmin]);

  useEffect(() => {
    // Mark everything in this inbox as read once the page is open, so the
    // bell badge can clear. Best-effort only.
    api.post('/notifications/unread-count', {}).catch(() => {});
  }, []);

  const openCompose = (prefill?: { recipientId?: string; subject?: string }) => {
    setComposeForm({
      ...emptyCompose,
      recipientIds: prefill?.recipientId ? [prefill.recipientId] : [],
      subject: prefill?.subject ?? '',
    });
    setRecipientSearch('');
    if (directory.length === 0) fetchDirectory();
    setComposeOpen(true);
  };

  const toggleRecipient = (id: string) => {
    setComposeForm((prev) => ({
      ...prev,
      recipientIds: prev.recipientIds.includes(id)
        ? prev.recipientIds.filter((x) => x !== id)
        : [...prev.recipientIds, id],
    }));
  };

  const removeRecipient = (id: string) => {
    setComposeForm((prev) => ({
      ...prev,
      recipientIds: prev.recipientIds.filter((x) => x !== id),
    }));
  };

  const handleSendMessage = async () => {
    if (composeForm.recipientIds.length === 0) {
      toast.error('Pick at least one recipient');
      return;
    }
    if (!composeForm.subject.trim() || !composeForm.body.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSending(true);
    try {
      const res = await api.post<{ delivered: number }>(
        '/notifications/messages',
        {
          recipientIds: composeForm.recipientIds,
          subject: composeForm.subject,
          body: composeForm.body,
          priority: composeForm.priority,
        }
      );
      toast.success(`Message sent to ${res.delivered} recipient${res.delivered === 1 ? '' : 's'}`);
      setComposeOpen(false);
      setComposeForm(emptyCompose);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredDirectory = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.organization_name ?? '').toLowerCase().includes(q)
    );
  }, [directory, recipientSearch]);

  const selectedRecipients = useMemo(
    () => directory.filter((u) => composeForm.recipientIds.includes(u.id)),
    [directory, composeForm.recipientIds]
  );

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'System events triggered by users plus direct messages people send you.'
              : 'Inbox, direct messages, and your custom alert rules.'}
          </p>
        </div>
        <Button onClick={() => openCompose()}>
          <MessageSquarePlus className="w-4 h-4 mr-2" />
          Compose message
        </Button>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList className="bg-neutral-100 dark:bg-neutral-800">
          <TabsTrigger value="inbox">
            <Bell className="w-4 h-4 mr-2" />
            Inbox
          </TabsTrigger>
          {!isAdmin && <TabsTrigger value="rules">Alert rules</TabsTrigger>}
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
              const isMessage = n.category === 'message' && !!n.sender_name;
              return (
                <Card key={n.id} className={`p-4 ${!n.is_read ? 'border-l-4 border-l-neutral-800 dark:border-l-white' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${priorityDot[n.priority] ?? 'bg-neutral-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground truncate">{n.title}</p>
                            {isMessage && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <UserIcon className="w-3 h-3 mr-1" />
                                Message
                              </Badge>
                            )}
                          </div>
                          {isMessage && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              From <span className="font-medium text-foreground">{n.sender_name}</span>
                            </p>
                          )}
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
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{n.message}</p>
                          <div className="flex flex-wrap gap-2">
                            {!n.is_read && (
                              <Button size="sm" variant="outline" onClick={() => handleUpdate(n.id, { isRead: true })}>
                                <Check className="w-3 h-3 mr-1" />
                                Mark read
                              </Button>
                            )}
                            {isMessage && n.sender_user_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCompose({ recipientId: n.sender_user_id!, subject: `Re: ${n.title}` })}
                              >
                                <Reply className="w-3 h-3 mr-1" />
                                Reply
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
                            {n.link_url && !isMessage && (
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

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send a message</DialogTitle>
            <DialogDescription>
              Pick one or more people. They&apos;ll get this message in their inbox and an email saying
              <span className="font-medium text-foreground"> &quot;you have a new message from {user?.name ?? 'someone'}&quot;</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>To</Label>
              {selectedRecipients.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedRecipients.map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-xs"
                    >
                      <UserIcon className="w-3 h-3" />
                      <span className="font-medium text-foreground">{r.name}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(r.id)}
                        className="ml-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        aria-label={`Remove ${r.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search any AIBID user by name, email, or organization…"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                />
              </div>
              <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                {directoryLoading ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading people…</div>
                ) : filteredDirectory.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No matching people.</div>
                ) : (
                  filteredDirectory.map((u) => {
                    const checked = composeForm.recipientIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={`flex cursor-pointer items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 px-3 py-2 text-sm last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900 ${checked ? 'bg-neutral-50 dark:bg-neutral-900' : ''}`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleRecipient(u.id)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-foreground">{u.name}</p>
                            {u.organization_name && (
                              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {u.organization_name}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{u.email} · {u.role}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
              <div>
                <Label>Subject</Label>
                <Input
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  placeholder="What is this about?"
                  maxLength={200}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={composeForm.priority}
                  onValueChange={(v) => setComposeForm({ ...composeForm, priority: v as 'LOW' | 'MEDIUM' | 'HIGH' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                rows={6}
                value={composeForm.body}
                onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                placeholder="Write your message…"
                maxLength={5000}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {composeForm.body.length}/5000 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={sending}>
              {sending ? 'Sending…' : `Send to ${composeForm.recipientIds.length || 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RoleGuard allowedRoles={['analyst', 'admin']}>
      <NotificationsContent />
    </RoleGuard>
  );
}
