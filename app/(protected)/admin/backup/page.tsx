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
import {
  HardDrive,
  Plus,
  RotateCcw,
  Download,
  Trash2,
  ShieldCheck,
  Info,
  RefreshCw,
} from 'lucide-react';

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
  storageUsedMb: string;
}

function formatSize(bytes: number) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadgeClass(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'failed') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

export default function AdminBackupPage() {
  const [data, setData] = useState<BackupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState({ frequency: 'daily', time: '02:00', emailConfirm: true });
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<BackupRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchBackup = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await api.get<BackupSummary>('/admin/backup');
      setData(result);
      setSchedule(result.schedule);
      setLastSync(new Date());
      setError(null);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load backup data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackup();
    const interval = setInterval(() => fetchBackup(true), 20000);
    return () => clearInterval(interval);
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
      toast.success('Backup created — file is being written to disk');
      // Give the file a moment to flush, then refresh.
      setTimeout(() => fetchBackup(true), 800);
    } catch {
      toast.error('Backup failed');
    } finally {
      setCreating(false);
    }
  };

  const confirmRestore = async () => {
    if (!restoreId) return;
    try {
      const res = await api.post<{ message?: string }>('/admin/backup', {
        action: 'restore',
        backupId: restoreId,
      });
      toast.success(res?.message ?? 'Restore request recorded');
      setRestoreId(null);
    } catch {
      toast.error('Restore request failed');
    }
  };

  const downloadBackup = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/backup?download=${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aibid-backup-${id}.db`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch {
      toast.error('Could not download backup');
    }
  };

  const removeBackup = async () => {
    if (!deleteRecord) return;
    try {
      await api.delete(`/admin/backup?id=${deleteRecord.id}`);
      toast.success('Backup deleted');
      setDeleteRecord(null);
      fetchBackup(true);
    } catch {
      toast.error('Failed to delete backup');
    }
  };

  if (loading && !data) return <div className="p-6"><PageLoadingSkeleton rows={5} /></div>;
  if (error && !data) return <div className="p-6"><PageError message={error} onRetry={() => fetchBackup()} /></div>;
  if (!data) return null;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Backup & Restore</h1>
          <p className="text-sm text-muted-foreground">
            Take snapshots of the system so nothing is lost if something goes wrong.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs text-muted-foreground">Updated {lastSync.toLocaleTimeString()}</span>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchBackup()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={createBackup} disabled={creating}>
            <Plus className="w-4 h-4 mr-2" />
            {creating ? 'Creating…' : 'Backup now'}
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Why backups matter</p>
            <p className="text-muted-foreground mt-1">
              A backup is a saved copy of the entire system — users, reports, uploaded data, AI settings. If
              the database file ever gets corrupted, deleted by accident, or you want to roll back a bad change,
              you can restore from one of these snapshots. <span className="font-medium text-foreground">Take a backup before any big change.</span>
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Last backup</p>
          <p className="text-lg font-semibold text-foreground mt-1">
            {data.last ? formatRelativeTime(data.last.created_at) : 'Never'}
          </p>
          {data.last && <p className="text-xs text-muted-foreground">{formatSize(data.last.file_size)}</p>}
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Restore points (last 30 days)</p>
          <p className="text-lg font-semibold text-foreground mt-1">{data.restorePoints}</p>
          <p className="text-xs text-muted-foreground">Available snapshots</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Disk used by backups</p>
          <p className="text-lg font-semibold text-foreground mt-1">{data.storageUsedMb} MB</p>
          <p className="text-xs text-muted-foreground">Stored under data/backups/</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-1">Automatic schedule</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The system will create new backups by itself on this schedule.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>How often</Label>
            <Select value={schedule.frequency} onValueChange={(v) => setSchedule({ ...schedule, frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Every hour</SelectItem>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekly">Every week</SelectItem>
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
              Email me when a backup finishes
            </label>
          </div>
        </div>
        <Button className="mt-4" variant="outline" onClick={saveSchedule}>Save schedule</Button>
        {data.nextRun && <p className="text-xs text-muted-foreground mt-2">Next automatic backup: {formatRelativeTime(data.nextRun)}</p>}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-1">Restore points</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Every successful backup becomes a point you can go back to. Click <span className="font-medium text-foreground">Download</span> to
          save the file outside the server, or <span className="font-medium text-foreground">Restore</span> to log a restore request.
        </p>

        {data.records.length === 0 ? (
          <EmptyState title="No backups yet" description='Click "Backup now" to create your first restore point.' />
        ) : (
          <div className="space-y-3">
            {data.records.map((record) => (
              <div
                key={record.id}
                className="flex flex-col gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{record.backup_type} backup</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(record.created_at)} · {formatSize(record.file_size)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusBadgeClass(record.status)}>{record.status}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={record.status !== 'completed'}
                    onClick={() => downloadBackup(record.id)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={record.status !== 'completed'}
                    onClick={() => setRestoreId(record.id)}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteRecord(record)}
                    title="Delete backup"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Backups are stored in <code className="rounded bg-neutral-200/60 dark:bg-neutral-800 px-1">data/backups/</code> on the
            server. For a full restore, stop the app, replace <code className="rounded bg-neutral-200/60 dark:bg-neutral-800 px-1">data/crm.db</code> with the downloaded backup file, then start the app again. The audit log will record the request.
          </span>
        </div>
      </Card>

      <AlertDialog open={!!restoreId} onOpenChange={(o) => !o && setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm restore</AlertDialogTitle>
            <AlertDialogDescription>
              This will log a restore request in the audit log and prepare the file. Because AIBID runs on a
              single SQLite file, a true restore needs the app to stop briefly while you replace <code>data/crm.db</code>
              with the downloaded backup. The page will guide you through it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteRecord} onOpenChange={(o) => !o && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              The backup file and its record will be removed permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeBackup}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
