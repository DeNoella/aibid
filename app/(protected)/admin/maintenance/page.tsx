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
import { PageLoadingSkeleton, PageError } from '@/components/shared/PageStates';
import { toast } from 'sonner';
import { Wrench, Bell, Info } from 'lucide-react';

interface MaintenanceConfig {
  enabled: boolean;
  returnTime: string | null;
}

interface NotificationRule {
  id: string;
  event_type: string;
  delivery_method: string;
  target_roles: string;
}

interface MaintenanceResponse {
  maintenance: MaintenanceConfig;
  notificationRules: NotificationRule[];
}

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

  if (loading && !data) return <div className="p-6"><PageLoadingSkeleton rows={4} /></div>;
  if (error && !data) return <div className="p-6"><PageError message={error} onRetry={() => fetchMaintenance()} /></div>;
  if (!data) return null;

  const rules = data.notificationRules;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Maintenance</h1>
        <p className="text-sm text-muted-foreground">
          Take the app offline for upgrades and decide who gets notified when system events happen.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-foreground">Maintenance mode</h3>
              <p className="text-sm text-muted-foreground">
                When ON, only admins can sign in. Use this before upgrades or restores.
              </p>
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
          <p className="text-xs text-muted-foreground mt-1">
            Shown to analysts on the maintenance screen so they know when to come back.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Notification rules</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Decide which system events automatically email or notify admins (e.g. backup failures, AI model degradation).
        </p>

        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-4">No notification rules configured yet.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {rules.map((rule) => (
              <li key={rule.id} className="text-sm p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <span className="font-medium text-foreground capitalize">{rule.event_type.replace('_', ' ')}</span>
                <span className="text-muted-foreground"> → {rule.delivery_method} → {rule.target_roles}</span>
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
                <SelectItem value="maintenance">Maintenance window starts</SelectItem>
                <SelectItem value="backup_failed">Backup fails</SelectItem>
                <SelectItem value="ai_degraded">AI model drops below threshold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Send via</Label>
            <Select value={newRule.deliveryMethod} onValueChange={(v) => setNewRule({ ...newRule, deliveryMethod: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="in_app">In-app</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={saveNotificationRule}>Add rule</Button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Email delivery uses the SMTP settings in your <code>.env</code> file. If SMTP is not configured, rules still
            create in-app notifications so the bell icon will still update.
          </span>
        </div>
      </Card>

      <AlertDialog open={confirmMaintenance} onOpenChange={setConfirmMaintenance}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingEnabled ? 'Enable maintenance mode?' : 'Disable maintenance mode?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingEnabled
                ? 'All non-admin users will be locked out until you turn this off again.'
                : 'The application will return to normal access for everyone.'}
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
