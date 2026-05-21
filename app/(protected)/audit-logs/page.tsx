'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { History, Search, Download, Filter, Clock, User, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
}

interface AuditStats {
  totalEvents: number;
  todayEvents: number;
  activeUsers: number;
  avgDaily: number;
}

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats>({ totalEvents: 0, todayEvents: 0, activeUsers: 0, avgDaily: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [logsData, statsData, timelineData] = await Promise.all([
        api.get<{ logs: AuditLog[] }>(`/audit-logs?limit=15${searchQuery ? `&search=${searchQuery}` : ''}`),
        api.get<AuditStats>('/audit-logs/stats'),
        api.get<AuditLog[]>('/audit-logs/timeline?limit=5'),
      ]);
      setLogs(logsData.logs);
      setStats(statsData);
      setTimeline(timelineData);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = () => {
    loadData();
  }

  const handleExport = () => {
    toast.success('Export started', {
      description: 'Audit logs are being prepared for download.'
    });
  }

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      'Dashboard': 'bg-blue-100 text-blue-700 border-blue-200',
      'Reports': 'bg-purple-100 text-purple-700 border-purple-200',
      'AI Analytics': 'bg-green-100 text-green-700 border-green-200',
      'Data Management': 'bg-amber-100 text-amber-700 border-amber-200',
      'Settings': 'bg-neutral-100 text-neutral-700 border-neutral-200',
      'Auth': 'bg-cyan-100 text-cyan-700 border-cyan-200',
      'CRM': 'bg-pink-100 text-pink-700 border-pink-200'
    }
    return colors[module] || 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Audit Logs</h1>
            <p className="text-sm text-neutral-600">System usage tracking and activity monitoring</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: stats.totalEvents.toLocaleString(), icon: Activity },
          { label: 'Today', value: stats.todayEvents.toString(), icon: Clock },
          { label: 'Active Users', value: stats.activeUsers.toString(), icon: User },
          { label: 'Avg. Daily Events', value: stats.avgDaily.toString(), icon: Activity }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-neutral-500">{stat.label}</p>
                  <Icon className="w-4 h-4 text-neutral-400" />
                </div>
                <p className="text-2xl font-semibold text-neutral-900">{stat.value}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search logs by user, action, or module..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <div className="p-6 border-b border-neutral-200">
          <h3 className="font-semibold text-neutral-900">Activity Log</h3>
          <p className="text-sm text-neutral-600 mt-1">Complete record of system actions and user activities</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-neutral-500">Loading...</TableCell>
              </TableRow>
            ) : (
              logs.map((log, index) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-neutral-100"
                >
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-400" />
                      <div>
                        <p className="text-neutral-900">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {new Date(log.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-neutral-600" />
                      </div>
                      <span className="text-sm font-medium text-neutral-900">{log.user_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-900">{log.action}</TableCell>
                  <TableCell>
                    <Badge className={getModuleColor(log.module)}>
                      {log.module}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-600">{log.details}</TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Activity Timeline */}
      <Card className="p-6">
        <h3 className="font-semibold text-neutral-900 mb-4">Recent Activity Timeline</h3>
        <div className="space-y-4">
          {timeline.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 pb-4 border-b border-neutral-100 last:border-0"
            >
              <div className="w-2 h-2 bg-neutral-800 rounded-full mt-2" />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{log.action}</p>
                    <p className="text-sm text-neutral-600">by {log.user_name} in {log.module}</p>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
