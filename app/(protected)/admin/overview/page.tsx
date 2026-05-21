'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { formatRelativeTime } from '@/utils/dateFormat';
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import {
  LayoutDashboard,
  Users,
  Brain,
  HardDrive,
  Server,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
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

interface AdminOverview {
  uptimePct: number;
  activeUsers: number;
  aiStatus: string;
  aiStatusColor: string;
  storageUsedPct: number;
  storageUsedGb: string;
  services: ServiceHealth[];
  criticalAlerts: AuditAlert[];
  pendingTasks: {
    roleAssignment: number;
    staleSources: number;
    failedBackups: number;
  };
}

const quickLinks = [
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/ai-health', label: 'AI Health', icon: Brain },
  { href: '/admin/audit', label: 'Audit & Security', icon: AlertTriangle },
  { href: '/admin/datasources', label: 'Data Sources', icon: Server },
  { href: '/admin/backup', label: 'Backup & Restore', icon: HardDrive },
  { href: '/admin/maintenance', label: 'Maintenance', icon: LayoutDashboard },
];

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

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<AdminOverview>('/admin/overview');
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading && !data) return <div className="p-6"><PageLoadingSkeleton rows={6} /></div>;
  if (error && !data) return <div className="p-6"><PageError message={error} onRetry={fetchOverview} /></div>;
  if (!data) return <div className="p-6"><EmptyState title="No overview data" description="System metrics are unavailable." /></div>;

  const pendingTotal =
    data.pendingTasks.roleAssignment + data.pendingTasks.staleSources + data.pendingTasks.failedBackups;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Overview</h1>
          <p className="text-sm text-muted-foreground">Platform health, alerts, and admin shortcuts</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOverview} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Uptime</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{data.uptimePct}%</p>
          <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Users (24h)</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{data.activeUsers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">AI Status</p>
          <p className={`text-2xl font-semibold mt-1 ${aiColorClass(data.aiStatusColor)}`}>{data.aiStatus}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Storage</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{data.storageUsedGb} GB</p>
          <p className="text-xs text-muted-foreground mt-1">{data.storageUsedPct}% of quota</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Service Status</h3>
          {data.services.length === 0 ? (
            <EmptyState title="No services" description="Service health data is not configured." />
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
          <h3 className="font-semibold text-foreground mb-4">Critical Alerts</h3>
          {data.criticalAlerts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              No critical alerts
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
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Pending Tasks</h3>
        {pendingTotal === 0 ? (
          <p className="text-sm text-muted-foreground">All admin tasks are up to date.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.pendingTasks.roleAssignment > 0 && (
              <li className="flex justify-between">
                <span>Users missing department assignment</span>
                <Badge variant="secondary">{data.pendingTasks.roleAssignment}</Badge>
              </li>
            )}
            {data.pendingTasks.staleSources > 0 && (
              <li className="flex justify-between">
                <span>Stale data sources (&gt;24h)</span>
                <Badge variant="secondary">{data.pendingTasks.staleSources}</Badge>
              </li>
            )}
            {data.pendingTasks.failedBackups > 0 && (
              <li className="flex justify-between">
                <span>Failed backups (7 days)</span>
                <Badge variant="destructive">{data.pendingTasks.failedBackups}</Badge>
              </li>
            )}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Quick Navigation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{link.label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
