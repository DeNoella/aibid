'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/services/api';
import { formatRelativeTime } from '@/utils/dateFormat';
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import { toast } from 'sonner';
import { HardDrive, Plus, RotateCcw } from 'lucide-react';

interface BackupRecord {
  id: string;
  backup_type: string;
  file_size: number;
  status: string;
  created_at: string;
}

interface BackupSummary {
  last: BackupRecord | null;
  restorePoints: number;
  schedule: { frequency: string; time: string; emailConfirm: boolean };
  nextRun: string | null;
  records: BackupRecord[];
  storageUsedGb: string;
}

const restoreOptions = [
  { id: 'users', label: 'Users & roles' },
  { id: 'data_sources', label: 'Data sources' },
  { id: 'reports', label: 'Reports' },
  { id: 'ai_models', label: 'AI models' },
  { id: 'audit_logs', label: 'Audit logs' },
];

function formatSize(bytes: number) {
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

export default function AdminBackupPage() {
  const [data, setData] = useState<BackupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState({ frequency: 'daily', time: '02:00', emailConfirm: true });
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [partialRestore, setPartialRestore] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const fetchBackup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<BackupSummary>('/admin/backup');
      setData(result);
      setSchedule(result.schedule);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load backup data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackup();
  }, [fetchBackup]);

  const saveSchedule = async () => {
    try {
      await api.post('/admin/backup', { action: 'schedule', schedule });
      toast.success('Backup schedule saved');
    } catch {
      toast.error('Failed to save schedule');
    }
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      await api.post('/admin/backup', {});
      toast.success('Backup created');
      fetchBackup();
    } catch {
      toast.error('Backup failed');
    } finally {
      setCreating(false);
    }
  };

  const confirmRestore = async () => {
    if (!restoreId) return;
    try {
      await api.post('/admin/backup', {
        action: 'restore',
        backupId: restoreId,
        partial: partialRestore,
      });
      toast.success('Restore initiated');
      setRestoreId(null);
      setPartialRestore([]);
    } catch {
      toast.error('Restore failed');
    }
  };

  const togglePartial = (id: string) => {
    setPartialRestore((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (loading && !data) return <div className="p-6"><PageLoadingSkeleton rows={5} /></div>;
  if (error && !data) return <div className="p-6"><PageError message={error} onRetry={fetchBackup} /></div>;
  if (!data) return <div className="p-6"><EmptyState title="No backup data" description="Backup configuration is unavailable." /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
          <p className="text-sm text-muted-foreground">Schedule backups and restore from checkpoints</p>
        </div>
        <Button onClick={createBackup} disabled={creating}>
          <Plus className="w-4 h-4 mr-2" />
          {creating ? 'Creating...' : 'Create Backup'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Last backup</p>
          <p className="text-lg font-semibold text-foreground mt-1">
            {data.last ? formatRelativeTime(data.last.created_at) : 'Never'}
          </p>
          {data.last && <p className="text-xs text-muted-foreground">{formatSize(data.last.file_size)}</p>}
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Restore points (30d)</p>
          <p className="text-lg font-semibold text-foreground mt-1">{data.restorePoints}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Storage used</p>
          <p className="text-lg font-semibold text-foreground mt-1">{data.storageUsedGb} GB</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Backup Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Frequency</Label>
            <Select value={schedule.frequency} onValueChange={(v) => setSchedule({ ...schedule, frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Time (UTC)</Label>
            <Input type="time" value={schedule.time} onChange={(e) => setSchedule({ ...schedule, time: e.target.value })} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={schedule.emailConfirm}
                onCheckedChange={(c) => setSchedule({ ...schedule, emailConfirm: !!c })}
              />
              Email confirmation
            </label>
          </div>
        </div>
        <Button className="mt-4" variant="outline" onClick={saveSchedule}>Save schedule</Button>
        {data.nextRun && <p className="text-xs text-muted-foreground mt-2">Next run: {formatRelativeTime(data.nextRun)}</p>}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Restore Timeline</h3>
        {data.records.length === 0 ? (
          <EmptyState title="No backups" description="Create a backup to enable restore points." />
        ) : (
          <div className="space-y-3">
            {data.records.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 rounded-lg border border-neutral-200 dark:border-neutral-800"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{record.backup_type} backup</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(record.created_at)} · {formatSize(record.file_size)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={record.status === 'completed' ? 'outline' : 'destructive'}>{record.status}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setRestoreId(record.id)}>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AlertDialog open={!!restoreId} onOpenChange={(o) => !o && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm restore</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore data from the selected backup. Partial restore lets you choose components only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm font-medium text-foreground">Partial restore (optional)</p>
            {restoreOptions.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={partialRestore.includes(opt.id)} onCheckedChange={() => togglePartial(opt.id)} />
                {opt.label}
              </label>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Confirm restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
