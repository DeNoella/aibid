'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Database, Plus, Plug, RefreshCw } from 'lucide-react';

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

function parseRoleAccess(raw?: string) {
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

export default function AdminDataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptySource);
  const [selected, setSelected] = useState<DataSource | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

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

  const handleAdd = async () => {
    try {
      await api.post('/admin/datasources', form);
      toast.success('Data source added');
      setAddOpen(false);
      setForm(emptySource);
      fetchSources();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add source');
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await api.post<{ success: boolean; message: string }>('/admin/datasources', {
        action: 'test',
        id,
      });
      toast.success(result.message || 'Connection successful');
    } catch {
      toast.error('Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleSync = async (id: string) => {
    try {
      await api.post('/admin/datasources', { action: 'sync', id });
      toast.success('Sync started');
      fetchSources();
      if (selected?.id === id) {
        const updated = await api.get<DataSource[]>('/admin/datasources');
        const found = updated.find((s) => s.id === id);
        if (found) setSelected(found);
      }
    } catch {
      toast.error('Sync failed');
    }
  };

  const updateRoleAccess = async (source: DataSource, roles: { admin: boolean; analyst: boolean }) => {
    try {
      await api.put('/admin/datasources', { id: source.id, roleAccess: roles });
      toast.success('Role access updated');
      fetchSources();
    } catch {
      toast.error('Failed to update access');
    }
  };

  if (loading && sources.length === 0) return <div className="p-6"><PageLoadingSkeleton /></div>;
  if (error && sources.length === 0) return <div className="p-6"><PageError message={error} onRetry={fetchSources} /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Sources</h1>
          <p className="text-sm text-muted-foreground">Manage connections, quality, and sync</p>
        </div>
        <Button onClick={() => { setForm(emptySource); setAddOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Source
        </Button>
      </div>

      <Card>
        {sources.length === 0 ? (
          <EmptyState title="No data sources" description="Add your first data source to get started." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sync</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((src) => {
                const score = src.quality_score ?? 85;
                const roles = parseRoleAccess(src.role_access);
                return (
                  <TableRow key={src.id}>
                    <TableCell>
                      <button type="button" className="font-medium hover:underline text-left" onClick={() => setSelected(src)}>
                        {src.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{src.type}</TableCell>
                    <TableCell className={`font-medium ${qualityColor(score)}`}>{score}%</TableCell>
                    <TableCell><Badge variant="outline">{src.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(src.last_synced_at)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" disabled={testingId === src.id} onClick={() => handleTest(src.id)}>
                        <Plug className="w-4 h-4" />
                      </Button>
                      <div className="inline-flex gap-2 mt-1">
                        <label className="flex items-center gap-1 text-xs">
                          <Checkbox checked={roles.admin} onCheckedChange={(c) => updateRoleAccess(src, { ...roles, admin: !!c })} />
                          Admin
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <Checkbox checked={roles.analyst} onCheckedChange={(c) => updateRoleAccess(src, { ...roles, analyst: !!c })} />
                          Analyst
                        </label>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Data Source</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
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
            <div><Label>Connection string</Label><Input value={form.connectionString} onChange={(e) => setForm({ ...form, connectionString: e.target.value })} /></div>
            <div>
              <Label>Sync frequency</Label>
              <Select value={form.syncFrequency} onValueChange={(v) => setForm({ ...form, syncFrequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              {selected?.name}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">Type: {selected.type} · Quality: {selected.quality_score ?? 85}%</p>
              <Button className="w-full" onClick={() => handleSync(selected.id)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Force sync
              </Button>
              <h4 className="font-medium text-foreground">Sync events</h4>
              {(selected.syncLogs ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No sync history yet.</p>
              ) : (
                <div className="space-y-2">
                  {selected.syncLogs!.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 text-sm">
                      <div className="flex justify-between">
                        <Badge variant="outline">{log.status}</Badge>
                        <span className="text-muted-foreground">{formatRelativeTime(log.created_at)}</span>
                      </div>
                      <p className="text-muted-foreground mt-1">{log.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
