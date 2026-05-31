'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  Database,
  Plus,
  Plug,
  RefreshCw,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  Loader2,
} from 'lucide-react';

interface SyncLog {
  id: string;
  status: string;
  message: string;
  created_at: string;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  quality_score?: number;
  sync_frequency?: string;
  last_synced_at?: string | null;
  role_access?: string;
  sync_paused?: number;
  completeness?: number;
  duplicate_pct?: number;
  missing_values?: number;
  syncLogs?: SyncLog[];
}

const emptySource = {
  name: '',
  type: 'postgresql',
  connectionString: '',
  syncFrequency: 'daily',
  qualityScore: 85,
  roleAccess: { admin: true, analyst: true },
};

function parseRoleAccess(raw?: string): { admin: boolean; analyst: boolean } {
  if (!raw) return { admin: true, analyst: true };
  try {
    return JSON.parse(raw) as { admin: boolean; analyst: boolean };
  } catch {
    return { admin: true, analyst: true };
  }
}

function qualityColor(score: number) {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-amber-600';
  return 'text-red-600';
}

function healthStatus(src: DataSource): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (src.sync_paused) return { label: 'Paused', variant: 'secondary' };
  if (src.status === 'syncing') return { label: 'Syncing', variant: 'default' };
  if ((src.quality_score ?? 85) < 50) return { label: 'Critical', variant: 'destructive' };
  if ((src.quality_score ?? 85) < 75) return { label: 'Degraded', variant: 'outline' };
  return { label: 'Healthy', variant: 'default' };
}

function typeBadgeColor(type: string) {
  const map: Record<string, string> = {
    postgresql: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    mysql: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    api: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    csv: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };
  return map[type] ?? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
}

export default function AdminDataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptySource);
  const [formTesting, setFormTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editSource, setEditSource] = useState<DataSource | null>(null);
  const [editForm, setEditForm] = useState({ name: '', syncFrequency: 'daily', roleAccess: { admin: true, analyst: true } });

  // Detail panel
  const [selected, setSelected] = useState<DataSource | null>(null);

  // Row-level action tracking
  const [testingId, setTestingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<DataSource | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<DataSource[]>('/admin/datasources');
      setSources(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data sources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // ── Add ──────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Source name is required'); return; }
    setSaving(true);
    try {
      await api.post('/admin/datasources', form);
      toast.success('Data source added');
      setAddOpen(false);
      setForm(emptySource);
      fetchSources();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add source');
    } finally {
      setSaving(false);
    }
  };

  // ── Test connection (in add form) ─────────────────────────────────────
  const handleFormTest = async () => {
    if (!form.connectionString.trim()) { toast.error('Enter a connection string first'); return; }
    setFormTesting(true);
    try {
      const result = await api.post<{ success: boolean; message: string }>('/admin/datasources', {
        action: 'test',
        connectionString: form.connectionString,
        type: form.type,
      });
      toast.success(result.message || 'Connection successful');
    } catch {
      toast.error('Connection test failed');
    } finally {
      setFormTesting(false);
    }
  };

  // ── Test connection (existing row) ────────────────────────────────────
  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await api.post<{ success: boolean; message: string }>('/admin/datasources', { action: 'test', id });
      toast.success(result.message || 'Connection successful');
    } catch {
      toast.error('Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  // ── Force sync ────────────────────────────────────────────────────────
  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      await api.post('/admin/datasources', { action: 'sync', id });
      toast.success('Sync started');
      await fetchSources();
      if (selected?.id === id) {
        const updated = await api.get<DataSource[]>('/admin/datasources');
        const found = updated.find((s) => s.id === id);
        if (found) setSelected(found);
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  // ── Pause / Resume ────────────────────────────────────────────────────
  const handlePauseToggle = async (src: DataSource) => {
    setPausingId(src.id);
    const willPause = !src.sync_paused;
    try {
      await api.post('/admin/datasources', { action: 'pause', id: src.id, paused: willPause });
      toast.success(willPause ? 'Sync paused' : 'Sync resumed');
      fetchSources();
    } catch {
      toast.error('Failed to update sync status');
    } finally {
      setPausingId(null);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────
  const openEdit = (src: DataSource) => {
    setEditSource(src);
    setEditForm({
      name: src.name,
      syncFrequency: src.sync_frequency ?? 'daily',
      roleAccess: parseRoleAccess(src.role_access),
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editSource) return;
    setSaving(true);
    try {
      await api.put('/admin/datasources', {
        id: editSource.id,
        name: editForm.name,
        type: editSource.type,
        status: editSource.status,
        syncFrequency: editForm.syncFrequency,
        roleAccess: editForm.roleAccess,
      });
      toast.success('Source updated');
      setEditOpen(false);
      fetchSources();
    } catch {
      toast.error('Failed to update source');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async (src: DataSource) => {
    setDeletingId(src.id);
    try {
      await api.delete(`/admin/datasources?id=${src.id}`);
      toast.success('Data source deleted');
      setDeleteConfirm(null);
      if (selected?.id === src.id) setSelected(null);
      fetchSources();
    } catch {
      toast.error('Failed to delete source');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && sources.length === 0) return <div className="p-6"><PageLoadingSkeleton /></div>;
  if (error && sources.length === 0) return <div className="p-6"><PageError message={error} onRetry={fetchSources} /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Sources</h1>
          <p className="text-sm text-muted-foreground">
            Manage connections, quality, and synchronization for all data feeds
          </p>
        </div>
        <Button onClick={() => { setForm(emptySource); setAddOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Data Source
        </Button>
      </div>

      {/* Sources table */}
      <Card>
        {sources.length === 0 ? (
          <EmptyState
            title="No data sources"
            description="Add your first data source to start connecting organizational data to AIBID."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sync Frequency</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((src) => {
                  const score = src.quality_score ?? 85;
                  const health = healthStatus(src);
                  return (
                    <TableRow key={src.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="font-medium hover:underline text-left text-foreground"
                          onClick={() => setSelected(src)}
                        >
                          {src.name}
                        </button>
                      </TableCell>

                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeColor(src.type)}`}>
                          {src.type.toUpperCase()}
                        </span>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {src.sync_frequency ?? 'manual'}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(src.last_synced_at)}
                      </TableCell>

                      <TableCell>
                        <span className={`font-semibold text-sm ${qualityColor(score)}`}>{score}%</span>
                      </TableCell>

                      <TableCell>
                        <Badge variant={health.variant}>{health.label}</Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Test connection */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Test connection"
                            disabled={testingId === src.id}
                            onClick={() => handleTest(src.id)}
                          >
                            {testingId === src.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Plug className="w-4 h-4" />}
                          </Button>

                          {/* Pause / Resume sync */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title={src.sync_paused ? 'Resume sync' : 'Pause sync'}
                            disabled={pausingId === src.id}
                            onClick={() => handlePauseToggle(src)}
                          >
                            {pausingId === src.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : src.sync_paused
                                ? <PlayCircle className="w-4 h-4 text-green-600" />
                                : <PauseCircle className="w-4 h-4" />}
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit source"
                            onClick={() => openEdit(src)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete source"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setDeleteConfirm(src)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ── Add Data Source dialog ─────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Data Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Source name</Label>
              <Input
                placeholder="e.g. Production CRM Database"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="api">REST API</SelectItem>
                  <SelectItem value="csv">CSV Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Connection parameters</Label>
              <Input
                placeholder={
                  form.type === 'api'
                    ? 'https://api.example.com/data'
                    : 'postgresql://user:pass@host:5432/dbname'
                }
                value={form.connectionString}
                onChange={(e) => setForm({ ...form, connectionString: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a connection string or URL for the source.
              </p>
            </div>

            <div>
              <Label>Sync frequency</Label>
              <Select value={form.syncFrequency} onValueChange={(v) => setForm({ ...form, syncFrequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Role access</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Choose which user roles can query this source.
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.roleAccess.admin}
                    onCheckedChange={(c) => setForm({ ...form, roleAccess: { ...form.roleAccess, admin: !!c } })}
                  />
                  Admin
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.roleAccess.analyst}
                    onCheckedChange={(c) => setForm({ ...form, roleAccess: { ...form.roleAccess, analyst: !!c } })}
                  />
                  Analyst
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="sm:mr-auto"
              disabled={formTesting}
              onClick={handleFormTest}
            >
              {formTesting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing…</>
                : <><Plug className="w-4 h-4 mr-2" />Test Connection</>}
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleAdd}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Source</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Source name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Sync frequency</Label>
              <Select value={editForm.syncFrequency} onValueChange={(v) => setEditForm({ ...editForm, syncFrequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="manual">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Role access</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Control which roles can query this data source.
              </p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={editForm.roleAccess.admin}
                    onCheckedChange={(c) => setEditForm({ ...editForm, roleAccess: { ...editForm.roleAccess, admin: !!c } })}
                  />
                  Admin
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={editForm.roleAccess.analyst}
                    onCheckedChange={(c) => setEditForm({ ...editForm, roleAccess: { ...editForm.roleAccess, analyst: !!c } })}
                  />
                  Analyst
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleEditSave}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ─────────────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete data source?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{deleteConfirm?.name}</span> and all its sync
            history will be permanently removed. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deletingId === deleteConfirm?.id}
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              {deletingId === deleteConfirm?.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail panel (Sheet) ──────────────────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 shrink-0" />
              {selected?.name}
            </SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="mt-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs mb-1">Type</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeColor(selected.type)}`}>
                    {selected.type.toUpperCase()}
                  </span>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs mb-1">Health</p>
                  <Badge variant={healthStatus(selected).variant}>{healthStatus(selected).label}</Badge>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs mb-1">Overall quality</p>
                  <p className={`font-semibold ${qualityColor(selected.quality_score ?? 85)}`}>
                    {selected.quality_score ?? 85}%
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs mb-1">Sync frequency</p>
                  <p className="font-medium capitalize">{selected.sync_frequency ?? 'manual'}</p>
                </div>
              </div>

              {/* Data quality breakdown */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Data quality breakdown</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Completeness</span>
                      <span className="font-medium">{selected.completeness ?? 95}%</span>
                    </div>
                    <Progress value={selected.completeness ?? 95} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Consistency (no duplicates)</span>
                      <span className="font-medium">{Math.max(0, 100 - (selected.duplicate_pct ?? 2)).toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.max(0, 100 - (selected.duplicate_pct ?? 2))} className="h-2" />
                  </div>
                  {(selected.missing_values ?? 0) > 0 && (
                    <p className="text-xs text-amber-600">
                      {selected.missing_values} fields with missing values detected.
                    </p>
                  )}
                </div>
              </div>

              {/* Force sync */}
              <Button
                className="w-full"
                disabled={syncingId === selected.id}
                onClick={() => handleSync(selected.id)}
              >
                {syncingId === selected.id
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing…</>
                  : <><RefreshCw className="w-4 h-4 mr-2" />Force Sync Now</>}
              </Button>

              {/* Sync events */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">
                  Last synchronization events
                </h4>
                {(selected.syncLogs ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sync history yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.syncLogs!.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 text-sm"
                      >
                        <div className="flex justify-between">
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                          <span className="text-muted-foreground text-xs">{formatRelativeTime(log.created_at)}</span>
                        </div>
                        {log.message && (
                          <p className="text-muted-foreground mt-1 text-xs">{log.message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
