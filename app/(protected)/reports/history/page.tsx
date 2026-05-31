'use client';

import { useCallback, useEffect, useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Calendar, Clock, Download, Filter, RefreshCw, FileText } from 'lucide-react';

interface Report {
  id: string;
  title: string;
  type: string;
  status: string;
  generated_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface ScheduledReport {
  schedule_id: string;
  recipe_name: string;
  frequency: string;
  next_run: string;
  recipients: string;
}

interface BuilderHistoryResponse {
  reports: Report[];
  recipes: unknown[];
  scheduled: ScheduledReport[];
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function HistoryContent() {
  const [reports, setReports] = useState<Report[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.get<BuilderHistoryResponse>(`/reports/builder${query}`);
      setReports(data.reports);
      setScheduled(data.scheduled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    return true;
  });

  const types = [...new Set(reports.map((r) => r.type))];

  const handleDownload = async (report: Report) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/reports/${report.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60) || 'report'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started', { description: `Saved ${a.download}` });
    } catch {
      toast.error('Could not download report');
    }
  };

  const handleRegenerate = async (report: Report) => {
    try {
      await api.post('/reports/builder', {
        action: 'generate',
        prompt: report.title,
        title: `${report.title} (regenerated)`,
        reportType: report.type,
      });
      toast.success('Report regenerated');
      fetchReports();
    } catch {
      toast.error('Failed to regenerate report');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
        <p className="text-sm text-muted-foreground">Report history and scheduled deliveries</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search reports…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchReports()}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="generating">Generating</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchReports}>
            <Filter className="w-4 h-4 mr-2" />
            Apply
          </Button>
        </div>
      </Card>

      {loading ? (
        <PageLoadingSkeleton rows={4} />
      ) : error ? (
        <PageError message={error} onRetry={fetchReports} />
      ) : filteredReports.length === 0 ? (
        <EmptyState title="No reports found" description="Generate reports from the Report Builder." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => {
                const expired = isExpired(report.expires_at);
                return (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{report.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {expired ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Expired</Badge>
                      ) : report.status === 'ready' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Ready</Badge>
                      ) : (
                        <Badge variant="outline">{report.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(report.generated_at || report.created_at)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(report.expires_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!expired && report.status === 'ready' && (
                          <Button size="sm" variant="outline" onClick={() => handleDownload(report)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {expired && (
                          <Button size="sm" variant="outline" onClick={() => handleRegenerate(report)}>
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Regenerate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Scheduled reports
        </h3>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scheduled reports configured.</p>
        ) : (
          <div className="space-y-3">
            {scheduled.map((s) => (
              <div key={s.schedule_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{s.recipe_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {s.frequency} · Next: {formatDate(s.next_run)}
                  </p>
                </div>
                <Badge variant="outline">{s.frequency}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ReportHistoryPage() {
  return (
    <RoleGuard allowedRoles={['analyst']}>
      <HistoryContent />
    </RoleGuard>
  );
}
