'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { VoiceControl } from '@/components/voice/VoiceControl';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart';
import { VoiceCommandAction } from '@/utils/voiceCommands';
import { MetricData, ChartDataPoint } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, RefreshCw, Loader2, Pin, PinOff, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

type VoiceMetricFocus = 'revenue' | 'campaigns' | 'clicks' | 'conversion' | 'impressions' | null;

interface AnalystKpi {
  key: string;
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  link?: string;
}

interface AnalystDashboardData {
  kpis: AnalystKpi[];
  pinnedMetrics: { metric_key: string }[];
  anomalyCount: number;
}

const metricCardMap: Record<Exclude<VoiceMetricFocus, null>, string[]> = {
  revenue: ['Total Revenue', 'Conversion Rate', 'Customer Acquisition Cost'],
  campaigns: ['Active Campaigns', 'Total Impressions', 'Click-Through Rate'],
  clicks: ['Click-Through Rate', 'Total Impressions', 'Active Campaigns'],
  conversion: ['Conversion Rate', 'Customer Acquisition Cost', 'Total Revenue'],
  impressions: ['Total Impressions', 'Click-Through Rate', 'Active Campaigns'],
};

const focusLabelMap: Record<Exclude<VoiceMetricFocus, null>, string> = {
  revenue: 'Revenue',
  campaigns: 'Campaign Analytics',
  clicks: 'Click Metrics',
  conversion: 'Conversion Data',
  impressions: 'Impression Metrics',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const isAnalyst = user?.role === 'analyst';

  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [analystData, setAnalystData] = useState<AnalystDashboardData | null>(null);
  const [pinnedKeys, setPinnedKeys] = useState<Set<string>>(new Set());
  const [voiceFocus, setVoiceFocus] = useState<VoiceMetricFocus>(null);
  const [loading, setLoading] = useState(true);
  const [analystLoading, setAnalystLoading] = useState(false);

  const fetchData = useCallback(async (range: string) => {
    try {
      setLoading(true);
      const [metricsData, chartDataResult] = await Promise.all([
        api.get<MetricData[]>(`/dashboard/metrics?range=${range}`),
        api.get<ChartDataPoint[]>(`/dashboard/charts?range=${range}`),
      ]);
      setMetrics(metricsData);
      setChartData(chartDataResult);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalystData = useCallback(async () => {
    if (!isAnalyst) return;
    try {
      setAnalystLoading(true);
      const data = await api.get<AnalystDashboardData>(`/dashboard/analyst?range=${timeRange}`);
      setAnalystData(data);
      setPinnedKeys(new Set(data.pinnedMetrics.map((p) => p.metric_key)));
    } catch {
      toast.error('Failed to load analyst KPIs');
    } finally {
      setAnalystLoading(false);
    }
  }, [isAnalyst, timeRange]);

  useEffect(() => {
    fetchData(timeRange);
  }, [timeRange, fetchData]);

  useEffect(() => {
    fetchAnalystData();
  }, [fetchAnalystData]);

  useEffect(() => {
    if (!isAnalyst) return;
    const interval = setInterval(fetchAnalystData, 60_000);
    return () => clearInterval(interval);
  }, [isAnalyst, fetchAnalystData]);

  const handleTogglePin = async (metricKey: string) => {
    try {
      const result = await api.post<{ pinned: boolean }>('/dashboard/analyst', { metricKey });
      setPinnedKeys((prev) => {
        const next = new Set(prev);
        if (result.pinned) next.add(metricKey);
        else next.delete(metricKey);
        return next;
      });
    } catch {
      toast.error('Failed to update pin');
    }
  };

  const handleVoiceCommand = (action: VoiceCommandAction) => {
    if (action.timeRange) {
      setTimeRange(action.timeRange as 'weekly' | 'monthly' | 'quarterly');
    }

    const focusSource = action.metric ?? action.filter ?? '';
    if (focusSource) {
      const mappedFocus = focusSource === 'campaigns' || focusSource === 'campaign'
        ? 'campaigns'
        : focusSource === 'revenue'
          ? 'revenue'
          : focusSource === 'clicks' || focusSource === 'click'
            ? 'clicks'
            : focusSource === 'conversion' || focusSource === 'conversions'
              ? 'conversion'
              : focusSource === 'impressions' || focusSource === 'impression'
                ? 'impressions'
                : null;

      if (mappedFocus) {
        setVoiceFocus(mappedFocus);
      }
    }

    if (action.action === 'refresh') {
      handleRefresh();
    }

    if (action.action === 'export') {
      handleExport();
    }

    if (action.action === 'reset') {
      setTimeRange('monthly');
      setVoiceFocus(null);
    }
  };

  const handleRefresh = () => {
    fetchData(timeRange);
    if (isAnalyst) fetchAnalystData();
    toast.success('Dashboard refreshed');
  };

  const handleExport = () => {
    toast.success('Export prepared', {
      description: 'Your data export is being generated...',
    });
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range as 'weekly' | 'monthly' | 'quarterly');
  };

  const displayedMetrics = voiceFocus
    ? metrics.filter((metric) => metricCardMap[voiceFocus].includes(metric.label))
    : metrics;

  const revenueChartKeys = [
    { key: 'revenue', color: '#171717', label: 'Revenue' },
    { key: 'profit', color: '#22c55e', label: 'Profit' },
    { key: 'cost', color: '#ef4444', label: 'Cost' },
  ];
  const campaignChartKeys = [
    { key: 'conversions', color: '#3b82f6', label: 'Conversions' },
    { key: 'clicks', color: '#8b5cf6', label: 'Clicks' },
  ];
  const impressionsChartKeys = [{ key: 'impressions', color: '#06b6d4', label: 'Impressions' }];

  const showRevenueChart = !voiceFocus || voiceFocus === 'revenue';
  const showCampaignChart = !voiceFocus || voiceFocus === 'campaigns' || voiceFocus === 'conversion' || voiceFocus === 'clicks';
  const showImpressionChart = !voiceFocus || voiceFocus === 'campaigns' || voiceFocus === 'impressions';

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time business intelligence and insights</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleRefresh} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Anomaly alert banner (analyst only) */}
      {isAnalyst && analystData && analystData.anomalyCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertTriangle className="text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">
            {analystData.anomalyCount} unreviewed anomal{analystData.anomalyCount === 1 ? 'y' : 'ies'} detected
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-300">
            <Link href="/insights/validate" className="underline font-medium hover:no-underline">
              Review pending insights
            </Link>{' '}
            to validate AI-detected anomalies before they affect reports.
          </AlertDescription>
        </Alert>
      )}

      {/* Voice Control */}
      <VoiceControl onCommand={handleVoiceCommand} />

      {/* Global date range filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={timeRange} onValueChange={handleTimeRangeChange} className="w-full sm:w-auto">
          <TabsList className="bg-neutral-100 dark:bg-neutral-800 w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="weekly" className="flex-1 sm:flex-none">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1 sm:flex-none">Monthly</TabsTrigger>
            <TabsTrigger value="quarterly" className="flex-1 sm:flex-none">Quarterly</TabsTrigger>
          </TabsList>
        </Tabs>
        {voiceFocus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg inline-flex items-center self-start sm:self-auto"
          >
            <span className="text-sm text-foreground/90">
              Voice focus: <span className="font-medium">{focusLabelMap[voiceFocus]}</span>
            </span>
          </motion.div>
        )}
      </div>

      {/* Analyst KPI cards */}
      {isAnalyst && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {analystLoading && !analystData ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-xl" />
            ))
          ) : (
            analystData?.kpis.map((kpi, index) => {
              const isPinned = pinnedKeys.has(kpi.key);
              const content = (
                <Card className="p-4 h-full hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleTogglePin(kpi.key);
                      }}
                    >
                      {isPinned ? (
                        <Pin className="w-4 h-4 text-foreground" />
                      ) : (
                        <PinOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-2xl font-semibold text-foreground">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.change >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`text-xs ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpi.change >= 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">{kpi.changeLabel}</span>
                  </div>
                  {isPinned && (
                    <Badge variant="outline" className="mt-2 text-[10px]">Pinned</Badge>
                  )}
                </Card>
              );
              return kpi.link ? (
                <Link key={kpi.key} href={kpi.link}>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    {content}
                  </motion.div>
                </Link>
              ) : (
                <motion.div key={kpi.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  {content}
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && metrics.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-xl" />
          ))
        ) : (
          displayedMetrics.map((metric, index) => (
            <MetricCard key={metric.label} metric={metric} index={index} />
          ))
        )}
      </div>

      {/* Charts */}
      {(showRevenueChart || showCampaignChart) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showRevenueChart && (
            <AnalyticsChart
              title="Revenue & Profitability"
              data={chartData}
              dataKeys={revenueChartKeys}
            />
          )}

          {showCampaignChart && (
            <AnalyticsChart
              title="Campaign Performance"
              data={chartData}
              dataKeys={
                voiceFocus === 'conversion'
                  ? campaignChartKeys.filter((item) => item.key === 'conversions')
                  : voiceFocus === 'clicks'
                    ? campaignChartKeys.filter((item) => item.key === 'clicks')
                    : campaignChartKeys
              }
              type="bar"
            />
          )}
        </div>
      )}

      {showImpressionChart && (
        <div className="grid grid-cols-1 gap-6">
          <AnalyticsChart
            title="Impressions Overview"
            data={chartData}
            dataKeys={impressionsChartKeys}
            type="area"
          />
        </div>
      )}
    </div>
  );
}
