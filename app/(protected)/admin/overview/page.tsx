'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { api } from '@/services/api';
import { formatRelativeTime } from '@/utils/dateFormat';
import { PageLoadingSkeleton, PageError } from '@/components/shared/PageStates';
import { toast } from 'sonner';
import {
  Users,
  Activity,
  Brain,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Server,
  Plus,
  Pencil,
  Trash2,
  ClipboardCheck,
  Sparkles,
  UserPlus,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';

interface ServiceHealth {
  id: string;
  service_name: string;
  status: string;
  response_time_ms: number;
}

interface AuditAlert {
  id: string;
  user_name: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
  risk_level?: string;
}

interface RecentActivity {
  id: string;
  user_name: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
}

interface AdminOverview {
  uptimePct: number;
  totalUsers: number;
  totalUsersAll: number;
  newUsersToday: number;
  activeUsers: number;
  openTasks: number;
  aiStatus: string;
  aiStatusColor: string;
  services: ServiceHealth[];
  criticalAlerts: AuditAlert[];
  recentActivity: RecentActivity[];
  storage: { usedMb: number; capMb: number; usedPct: number };
  serverTime: string;
}

interface AdminTask {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  source: 'manual' | 'system';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

type TaskStatusFilter = 'all' | 'open' | 'in_progress' | 'done';

const emptyTaskForm = {
  title: '',
  description: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  dueDate: '',
};

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === 'UP') return 'bg-green-100 text-green-700 border-green-200';
  if (s === 'DEGRADED') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function aiColorClass(color: string) {
  if (color === 'red') return 'text-red-600';
  if (color === 'amber') return 'text-amber-600';
  return 'text-green-600';
}

function priorityClass(priority: AdminTask['priority']) {
  if (priority === 'high') return 'bg-red-100 text-red-700 border-red-200';
  if (priority === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-neutral-100 text-neutral-700 border-neutral-200';
}

function taskStatusBadge(status: AdminTask['status']) {
  if (status === 'done') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'in_progress') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-neutral-100 text-neutral-700 border-neutral-200';
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskStatusFilter>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const previousUserCount = useRef<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyTaskForm);
  const [editTask, setEditTask] = useState<AdminTask | null>(null);
  const [editForm, setEditForm] = useState(emptyTaskForm);
  const [deleteTask, setDeleteTask] = useState<AdminTask | null>(null);
  const [saving, setSaving] = useState(false);

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [overview, taskList] = await Promise.all([
        api.get<AdminOverview>('/admin/overview'),
        api.get<AdminTask[]>(`/admin/tasks?status=${taskFilter}`),
      ]);
      setData(overview);
      setTasks(taskList);
      setLastSync(new Date());
      setError(null);

      if (
        !silent &&
        previousUserCount.current !== null &&
        overview.totalUsers !== previousUserCount.current
      ) {
        const diff = overview.totalUsers - previousUserCount.current;
        toast.message(
          diff > 0
            ? `User count updated: +${diff} new (now ${overview.totalUsers})`
            : `User count updated: ${diff} (now ${overview.totalUsers})`
        );
      }
      previousUserCount.current = overview.totalUsers;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load overview';
      if (!silent) setError(message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [taskFilter]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Auto-refresh every 10 seconds so the dashboard reflects new users,
  // uploads, and other changes in close to real time.
  useEffect(() => {
    const interval = setInterval(() => loadOverview(true), 10000);
    return () => clearInterval(interval);
  }, [loadOverview]);

  const visibleTasks = tasks;
  const openCount = useMemo(() => tasks.filter((t) => t.status !== 'done').length, [tasks]);

  const handleCreate = async () => {
    if (!createForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/tasks', {
        title: createForm.title,
        description: createForm.description || undefined,
        priority: createForm.priority,
        dueDate: createForm.dueDate || undefined,
      });
      toast.success('Task created');
      setCreateOpen(false);
      setCreateForm(emptyTaskForm);
      loadOverview(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (task: AdminTask) => {
    setEditTask(task);
    setEditForm({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      dueDate: task.due_date ?? '',
    });
  };

  const handleEditSave = async () => {
    if (!editTask) return;
    setSaving(true);
    try {
      await api.patch('/admin/tasks', {
        id: editTask.id,
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        dueDate: editForm.dueDate || null,
      });
      toast.success('Task updated');
      setEditTask(null);
      loadOverview(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (task: AdminTask, status: AdminTask['status']) => {
    try {
      await api.patch('/admin/tasks', { id: task.id, status });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status, completed_at: status === 'done' ? new Date().toISOString() : null } : t))
      );
      toast.success(status === 'done' ? 'Marked done' : 'Status updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTask) return;
    try {
      await api.delete(`/admin/tasks?id=${deleteTask.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTask.id));
      toast.success('Task removed');
      setDeleteTask(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete task');
    }
  };

  if (loading && !data) return <div className="p-6"><PageLoadingSkeleton rows={6} /></div>;
  if (error && !data) return <div className="p-6"><PageError message={error} onRetry={() => loadOverview()} /></div>;
  if (!data) return null;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Overview</h1>
          <p className="text-sm text-muted-foreground">
            Live snapshot of users, AI health, and admin tasks. Refreshes automatically every 10 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              Last update: {lastSync.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => loadOverview()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4" /> Uptime (30 days)
          </div>
          <p className={`text-3xl font-semibold mt-2 ${
            data.uptimePct >= 99 ? 'text-green-600' : data.uptimePct >= 95 ? 'text-amber-600' : 'text-red-600'
          }`}>{data.uptimePct.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Share of time the app was healthy</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="w-4 h-4" /> Online last 24h
          </div>
          <p className="text-3xl font-semibold text-foreground mt-2">{data.activeUsers}</p>
          <p className="text-xs text-muted-foreground mt-1">Users who logged in recently</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="w-4 h-4" /> AI status
          </div>
          <p className={`text-3xl font-semibold mt-2 ${aiColorClass(data.aiStatusColor)}`}>{data.aiStatus}</p>
          <p className="text-xs text-muted-foreground mt-1">Across all predictive models</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="w-4 h-4" /> Database storage
          </div>
          <p className={`text-3xl font-semibold mt-2 ${
            data.storage.usedPct >= 80 ? 'text-red-600' : data.storage.usedPct >= 60 ? 'text-amber-600' : 'text-foreground'
          }`}>{data.storage.usedMb} MB</p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.storage.usedPct.toFixed(1)}% of {Math.round(data.storage.capMb)} MB recommended
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" /> Active users
          </div>
          <p className="text-3xl font-semibold text-foreground mt-2">{data.totalUsers}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.totalUsersAll - data.totalUsers > 0
              ? `${data.totalUsersAll} total · ${data.totalUsersAll - data.totalUsers} deactivated`
              : `${data.totalUsersAll} total accounts`}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserPlus className="w-4 h-4" /> New today
          </div>
          <p className="text-3xl font-semibold text-foreground mt-2">{data.newUsersToday}</p>
          <p className="text-xs text-muted-foreground mt-1">Accounts created since midnight</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClipboardCheck className="w-4 h-4" /> Open admin tasks
          </div>
          <p className="text-3xl font-semibold text-foreground mt-2">{data.openTasks}</p>
          <p className="text-xs text-muted-foreground mt-1">Items needing your attention</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" /> Pending tasks
            </h3>
            <p className="text-sm text-muted-foreground">
              System detects issues automatically (sync failures, missing roles, AI accuracy drops). You can also add your own.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={taskFilter} onValueChange={(v) => setTaskFilter(v as TaskStatusFilter)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setCreateForm(emptyTaskForm); setCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add task
            </Button>
          </div>
        </div>

        {visibleTasks.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            {taskFilter === 'open' ? 'No open tasks — everything is up to date.' : 'No tasks match this filter.'}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{task.title}</p>
                    <Badge variant="outline" className={priorityClass(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className={taskStatusBadge(task.status)}>
                      {task.status === 'in_progress' ? 'in progress' : task.status}
                    </Badge>
                    {task.source === 'system' && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Sparkles className="w-3 h-3 mr-1" /> auto
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Created {formatRelativeTime(task.created_at)}
                    {task.due_date ? ` · Due ${task.due_date}` : ''}
                    {task.completed_at ? ` · Completed ${formatRelativeTime(task.completed_at)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={task.status}
                    onValueChange={(v) => handleStatusChange(task, v as AdminTask['status'])}
                  >
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  {task.source === 'manual' && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(task)} title="Edit task">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTask(task)} title="Delete task">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          {openCount} open · {tasks.filter((t) => t.status === 'in_progress').length} in progress · {tasks.filter((t) => t.status === 'done').length} done
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Service status</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Tracks the background services that keep AIBID running. <span className="font-medium text-foreground">UP</span> means healthy, <span className="font-medium text-foreground">DEGRADED</span> means slow but working, <span className="font-medium text-foreground">DOWN</span> means unreachable.
          </p>
          {data.services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No services configured.</p>
          ) : (
            <div className="space-y-3">
              {data.services.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{svc.service_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{svc.response_time_ms}ms</span>
                    <Badge variant="outline" className={statusBadge(svc.status)}>{svc.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Recent activity</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Last actions performed by anyone on the platform. Use Audit & Governance for full history.
          </p>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="space-y-3">
              {data.recentActivity.map((row) => (
                <li key={row.id} className="text-sm">
                  <p className="font-medium text-foreground">{row.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.user_name} · {row.module} · {formatRelativeTime(row.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Critical alerts
        </h3>
        {data.criticalAlerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            No critical alerts in the audit log.
          </div>
        ) : (
          <div className="space-y-3">
            {data.criticalAlerts.map((alert) => (
              <div key={alert.id} className="flex gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.action}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.user_name} · {alert.module}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(alert.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add admin task</DialogTitle>
            <DialogDescription>
              Track follow-ups, reminders, or anything the system can&apos;t detect on its own.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g. Review Q1 access permissions"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={createForm.priority} onValueChange={(v) => setCreateForm({ ...createForm, priority: v as 'low' | 'medium' | 'high' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={createForm.dueDate}
                  onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm({ ...editForm, priority: v as 'low' | 'medium' | 'high' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTask(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTask} onOpenChange={(o) => !o && setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the task. System-generated tasks cannot be deleted; they resolve automatically when the underlying issue is gone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
