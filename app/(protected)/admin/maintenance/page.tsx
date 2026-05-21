'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import { toast } from 'sonner';
import { Wrench, Activity, Database, Bell } from 'lucide-react';

interface MaintenanceConfig {
  enabled: boolean;
  returnTime: string | null;
}

interface PerformanceMetrics {
  apiResponseMs: number;
  dbQueryMs: number;
  memoryPct: number;
  activeConnections: number;
  lastVacuum: string;
  lastReindex: string;
}

interface NotificationRule {
  id: string;
  event_type: string;
  delivery_method: string;
  target_roles: string;
}

interface MaintenanceResponse {
  maintenance: MaintenanceConfig;
  performance: PerformanceMetrics;
  notificationRules: NotificationRule[];
}

const optimizeTasks = [
  { id: 'vacuum', label: 'Vacuum database', icon: Database },
  { id: 'reindex', label: 'Reindex tables', icon: Database },
  { id: 'cache_clear', label: 'Clear API cache', icon: Activity },
];

export default function AdminMaintenancePage() {
  const [data, setData] = useState<MaintenanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState(false);
  const [returnTime, setReturnTime] = useState('');
  const [newRule, setNewRule] = useState({ eventType: 'maintenance', deliveryMethod: 'email', targetRoles: ['admin'] });

  const fetchMaintenance = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await api.get<MaintenanceResponse>('/admin/maintenance');
      setData(result);
      setReturnTime(result.maintenance.returnTime ?? '');
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load maintenance data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaintenance();
    const interval = setInterval(() => fetchMaintenance(true), 30000);
    return () => clearInterval(interval);
  }, [fetchMaintenance]);

  const applyMaintenanceMode = async (enabled: boolean) => {
    try {
      await api.post('/admin/maintenance', {
        action: 'maintenance',
        enabled,
        returnTime: enabled ? returnTime : undefined,
      });
      toast.success(enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
      setConfirmMaintenance(false);
      fetchMaintenance(true);
    } catch {
      toast.error('Failed to update maintenance mode');
    }
  };

  const requestToggle = (enabled: boolean) => {
    setPendingEnabled(enabled);
    setConfirmMaintenance(true);
  };

  const runOptimize = async (task: string) => {
    try {
      await api.post('/admin/maintenance', { action: 'optimize', task });
      toast.success(`${task} completed`);
      fetchMaintenance(true);
    } catch {
      toast.error('Optimization failed');
    }
  };

  const saveNotificationRule = async () => {
    try {
      await api.post('/admin/maintenance', { action: 'notification-rule', ...newRule });
      toast.success('Notification rule added');
      setNewRule({ eventType: 'maintenance', deliveryMethod: 'email', targetRoles: ['admin'] });
      fetchMaintenance(true);
    } catch {
      toast.error('Failed to save rule');
    }
  };

  if (loading && !data) return <div className="p-6"><PageLoadingSkeleton rows={5} /></div>;
  if (error && !data) return <div className="p-6"><PageError message={error} onRetry={() => fetchMaintenance()} /></div>;
  if (!data) return <div className="p-6"><EmptyState title="No maintenance data" description="System configuration is unavailable." /></div>;

  const perf = data.performance;
  const rules = data.notificationRules;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Maintenance</h1>
        <p className="text-sm text-muted-foreground">Maintenance mode, performance, and notifications</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-foreground">Maintenance Mode</h3>
              <p className="text-sm text-muted-foreground">Blocks non-admin access when enabled</p>
            </div>
          </div>
          <Switch
            checked={data.maintenance.enabled}
            onCheckedChange={(checked) => requestToggle(checked)}
          />
        </div>
        {data.maintenance.enabled && (
          <p className="text-sm text-amber-600 mt-3">
            Active — expected return: {data.maintenance.returnTime ? formatRelativeTime(data.maintenance.returnTime) : 'Not set'}
          </p>
        )}
        <div className="mt-4">
          <Label>Expected return time</Label>
          <Input type="datetime-local" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="max-w-xs mt-1" />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Performance Metrics</h3>
          <span className="text-xs text-muted-foreground">Auto-refresh 30s</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">API response</p>
            <p className="text-xl font-semibold text-foreground">{perf.apiResponseMs}ms</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">DB query</p>
            <p className="text-xl font-semibold text-foreground">{perf.dbQueryMs}ms</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Memory</p>
            <p className="text-xl font-semibold text-foreground">{perf.memoryPct}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Connections</p>
            <p className="text-xl font-semibold text-foreground">{perf.activeConnections}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Last vacuum: {formatRelativeTime(perf.lastVacuum)} · Last reindex: {formatRelativeTime(perf.lastReindex)}
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Database Optimization</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {optimizeTasks.map((task) => {
            const Icon = task.icon;
            return (
              <Button key={task.id} variant="outline" className="justify-start h-auto py-3" onClick={() => runOptimize(task.id)}>
                <Icon className="w-4 h-4 mr-2 shrink-0" />
                {task.label}
              </Button>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Notification Rules</h3>
        </div>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">No notification rules configured.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {rules.map((rule) => (
              <li key={rule.id} className="text-sm p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                {rule.event_type} via {rule.delivery_method} → {rule.target_roles}
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Event</Label>
            <Select value={newRule.eventType} onValueChange={(v) => setNewRule({ ...newRule, eventType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="backup_failed">Backup failed</SelectItem>
                <SelectItem value="ai_degraded">AI degraded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Delivery</Label>
            <Select value={newRule.deliveryMethod} onValueChange={(v) => setNewRule({ ...newRule, deliveryMethod: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="slack">Slack</SelectItem>
                <SelectItem value="in_app">In-app</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={saveNotificationRule}>Add rule</Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={confirmMaintenance} onOpenChange={setConfirmMaintenance}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingEnabled ? 'Enable maintenance mode?' : 'Disable maintenance mode?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingEnabled
                ? 'Users will be blocked from the application until maintenance is disabled.'
                : 'The application will return to normal operation for all users.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyMaintenanceMode(pendingEnabled)}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
