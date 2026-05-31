'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { FileText, Download, Calendar, Clock, Plus, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Report {
  id: string;
  title: string;
  type: string;
  status: 'ready' | 'generating' | 'scheduled';
  generated_at: string | null;
  created_at: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface ReportStats {
  total: number;
  thisMonth: number;
  scheduled: number;
  downloaded: number;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const isFreeTrial = user?.role !== 'admin' && user?.subscriptionStatus === 'free_trial';
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [stats, setStats] = useState<ReportStats>({ total: 0, thisMonth: 0, scheduled: 0, downloaded: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reportsData, templatesData, statsData] = await Promise.all([
          api.get<Report[]>('/reports'),
          api.get<ReportTemplate[]>('/reports/templates'),
          api.get<ReportStats>('/reports/stats'),
        ]);
        setReports(reportsData);
        setTemplates(templatesData);
        setStats(statsData);
      } catch {
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDownload = (reportId: string) => {
    toast.success('Download started', {
      description: 'Your report is being prepared for download.'
    });
  }

  const handleGenerateReport = async () => {
    try {
      const newReport = await api.post<Report>('/reports', {
        title: `Custom Report - ${new Date().toLocaleDateString()}`,
        type: 'Custom Report',
      });
      setReports(prev => [newReport, ...prev]);
      toast.success('Report generation started', {
        description: 'Your custom report is being generated.'
      });
    } catch {
      toast.error('Failed to generate report');
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Ready</Badge>;
      case 'generating':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Generating</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Scheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Pending';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Analytical summaries and automated reporting</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button
            className="flex-1 sm:flex-none bg-neutral-900 hover:bg-black text-white dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand/90 text-xs sm:text-sm"
            onClick={handleGenerateReport}
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Free trial notice */}
      {isFreeTrial && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
          <p className="text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Free Trial:</span> Upgrade to Premium for automated report generation and advanced reporting tools.
          </p>
          <Link href="/upgrade" className="shrink-0 font-semibold text-amber-900 dark:text-amber-200 underline underline-offset-2">
            Upgrade
          </Link>
        </div>
      )}

      {/* Report Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: stats.total.toString() },
          { label: 'This Month', value: stats.thisMonth.toString() },
          { label: 'Scheduled', value: stats.scheduled.toString() },
          { label: 'Downloaded', value: stats.downloaded.toString() }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4">
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-neutral-100 animate-pulse rounded-xl" />
          ))
        ) : (
          reports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-foreground/90" />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{report.title}</h3>
                        <p className="text-sm text-muted-foreground">{report.type}</p>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(report.generated_at || report.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(report.generated_at || report.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {report.status === 'ready' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 sm:flex-none"
                            onClick={() => handleDownload(report.id)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </Button>
                          <Button size="sm" variant="ghost" className="flex-1 sm:flex-none">
                            View Online
                          </Button>
                        </>
                      )}
                      {report.status === 'generating' && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
                          <span className="text-sm text-muted-foreground">Generating report...</span>
                        </div>
                      )}
                      {report.status === 'scheduled' && (
                        <Button size="sm" variant="outline">
                          Edit Schedule
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Report Templates */}
      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Available Report Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors">
              <h4 className="font-medium text-foreground mb-1">{template.name}</h4>
              <p className="text-xs text-muted-foreground">{template.description}</p>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
