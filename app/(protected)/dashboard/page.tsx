'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { VoiceControl } from '@/components/voice/VoiceControl';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { VoiceCommandAction } from '@/utils/voiceCommands';
import { MetricData } from '@/types';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Download,
  RefreshCw,
  Loader2,
  Pin,
  PinOff,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CalendarRange,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

type DateRangePreset = 'today' | 'thisweek' | 'thismonth' | 'last3months' | 'custom';
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

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'thisweek', label: 'This Week' },
  { value: 'thismonth', label: 'This Month' },
  { value: 'last3months', label: 'Last 3 Months' },
];

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

function buildQuery(range: DateRangePreset, customStart: string, customEnd: string) {
  const params = new URLSearchParams({ range });
  if (range === 'custom' && customStart && customEnd) {
    params.set('customStart', customStart);
    params.set('customEnd', customEnd);
  }
  return params.toString();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAnalyst = user?.role === 'analyst';

  const [timeRange, setTimeRange] = useState<DateRangePreset>('thismonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customOpen, setCustomOpen] = useState(false);

  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [analystData, setAnalystData] = useState<AnalystDashboardData | null>(null);
  const [pinnedKeys, setPinnedKeys] = useState<Set<string>>(new Set());
  const [voiceFocus, setVoiceFocus] = useState<VoiceMetricFocus>(null);
  const [loading, setLoading] = useState(true);
  const [analystLoading, setAnalystLoading] = useState(false);
  // Per-card overrides driven by the latest dataset question (key -> {value, hint})
  const [cardOverrides, setCardOverrides] = useState<Record<string, { value: string; hint: string }>>({});

  const fetchData = useCallback(async (range: DateRangePreset, cStart: string, cEnd: string) => {
    if (range === 'custom' && (!cStart || !cEnd)) return;
    try {
      setLoading(true);
      const qs = buildQuery(range, cStart, cEnd);
      const metricsData = await api.get<MetricData[]>(`/dashboard/metrics?${qs}`);
      setMetrics(metricsData);
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
      const data = await api.get<AnalystDashboardData>('/dashboard/analyst');
      setAnalystData(data);
      setPinnedKeys(new Set(data.pinnedMetrics.map((p) => p.metric_key)));
    } catch {
      toast.error('Failed to load analyst KPIs');
    } finally {
      setAnalystLoading(false);
    }
  }, [isAnalyst]);

  useEffect(() => {
    fetchData(timeRange, customStart, customEnd);
  }, [timeRange, customStart, customEnd, fetchData]);

  useEffect(() => {
    fetchAnalystData();
  }, [fetchAnalystData]);

  // Auto-refresh analyst KPI cards every 60 seconds
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

  const handleRangeSelect = (preset: DateRangePreset) => {
    setTimeRange(preset);
    setCustomStart('');
    setCustomEnd('');
  };

  const handleCustomApply = () => {
    if (!customStart || !customEnd) { toast.error('Select both a start and end date'); return; }
    if (customEnd < customStart) { toast.error('End date must be after start date'); return; }
    setTimeRange('custom');
    setCustomOpen(false);
  };

  const handleVoiceCommand = (action: VoiceCommandAction) => {
    if (action.timeRange) {
      const legacyMap: Record<string, DateRangePreset> = {
        weekly: 'thisweek',
        monthly: 'thismonth',
        quarterly: 'last3months',
      };
      setTimeRange(legacyMap[action.timeRange] ?? 'thismonth');
    }

    const focusSource = action.metric ?? action.filter ?? '';
    if (focusSource) {
      const mappedFocus =
        focusSource === 'campaigns' || focusSource === 'campaign' ? 'campaigns'
        : focusSource === 'revenue' ? 'revenue'
        : focusSource === 'clicks' || focusSource === 'click' ? 'clicks'
        : focusSource === 'conversion' || focusSource === 'conversions' ? 'conversion'
        : focusSource === 'impressions' || focusSource === 'impression' ? 'impressions'
        : null;
      if (mappedFocus) setVoiceFocus(mappedFocus);
    }

    if (action.action === 'refresh') {
      fetchData(timeRange, customStart, customEnd);
      if (isAnalyst) fetchAnalystData();
      toast.success('Dashboard refreshed');
    }
    if (action.action === 'export') {
      toast.success('Export prepared', { description: 'Your data export is being generated…' });
    }
    if (action.action === 'reset') {
      setTimeRange('thismonth');
      setVoiceFocus(null);
      setCardOverrides({});
    }
  };

  // Map a dataset question to one of the four analyst cards and update it live.
  const handleQueryResult = useCallback((result: {
    question: string;
    primaryValue?: number | null;
    primaryLabel?: string;
    rowCount: number;
    data: Record<string, unknown>[];
  }) => {
    const q = result.question.toLowerCase();

    // Which card does this question relate to?
    const target =
      /revenue|sales|income|arr|mrr|turnover|profit/.test(q) ? 'revenue'
      : /client|customer|account|churn/.test(q) ? 'clients'
      : /anomaly|risk|flag|issue|alert|outlier/.test(q) ? 'anomalies'
      : /insight|report|recommendation|finding|analysis/.test(q) ? 'insights'
      : null;
    if (!target) return;

    // Pick the headline number: engine's primaryValue, else sum the numeric column, else rowCount
    let value = result.primaryValue ?? null;
    if (value == null && result.data.length) {
      const numericKey = Object.keys(result.data[0]).find(
        (k) => typeof result.data[0][k] === 'number'
      );
      if (numericKey) {
        value = result.data.reduce((s, r) => s + (Number(r[numericKey]) || 0), 0);
      }
    }
    if (value == null) value = result.rowCount;

    const formatted =
      target === 'revenue'
        ? (Math.abs(value) >= 1_000_000 ? `$${(value / 1_000_000).toFixed(2)}M` : `$${Math.round(value).toLocaleString()}`)
        : Math.round(value).toLocaleString();

    setCardOverrides((prev) => ({
      ...prev,
      [target]: { value: formatted, hint: 'from your dataset' },
    }));
  }, []);

  const displayedMetrics = voiceFocus
    ? metrics.filter((m) => metricCardMap[voiceFocus].includes(m.label))
    : metrics;

  const activePresetLabel = timeRange === 'custom' && customStart && customEnd
    ? `${customStart} – ${customEnd}`
    : PRESETS.find((p) => p.value === timeRange)?.label ?? 'This Month';

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time business intelligence and insights</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => { fetchData(timeRange, customStart, customEnd); if (isAnalyst) fetchAnalystData(); toast.success('Dashboard refreshed'); }}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => toast.success('Export prepared', { description: 'Your data export is being generated…' })}
          >
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

      {/* Analyst KPI cards — auto-refresh every 60 seconds */}
      {isAnalyst && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {analystLoading && !analystData ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-xl" />
            ))
          ) : (
            analystData?.kpis.map((kpi, index) => {
              const isPinned = pinnedKeys.has(kpi.key);
              const override = cardOverrides[kpi.key];
              const content = (
                <Card className={`p-4 h-full hover:shadow-md transition-shadow ${override ? 'ring-1 ring-brand/40' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 shrink-0"
                      title={isPinned ? 'Unpin metric' : 'Pin metric'}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTogglePin(kpi.key); }}
                    >
                      {isPinned
                        ? <Pin className="w-4 h-4 text-foreground" />
                        : <PinOff className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  <p className="text-2xl font-semibold text-foreground">{override ? override.value : kpi.value}</p>
                  {override ? (
                    <p className="text-xs text-brand mt-1">{override.hint}</p>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      {kpi.change >= 0
                        ? <TrendingUp className="w-3 h-3 text-green-600" />
                        : <TrendingDown className="w-3 h-3 text-red-600" />}
                      <span className={`text-xs ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {kpi.change >= 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">{kpi.changeLabel}</span>
                    </div>
                  )}
                  {isPinned && !override && <Badge variant="outline" className="mt-2 text-[10px]">Pinned</Badge>}
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

      {/* Date range filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleRangeSelect(preset.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeRange === preset.value
                  ? 'bg-foreground text-background'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {preset.label}
            </button>
          ))}

          <Popover open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  timeRange === 'custom'
                    ? 'bg-foreground text-background'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                {timeRange === 'custom' && customStart && customEnd ? activePresetLabel : 'Custom Range'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4 space-y-3" align="start">
              <p className="text-sm font-medium text-foreground">Select a custom date range</p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Start date</label>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-background text-foreground" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">End date</label>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-background text-foreground" />
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={handleCustomApply}>Apply</Button>
            </PopoverContent>
          </Popover>
        </div>

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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && metrics.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-xl" />
            ))
          : displayedMetrics.map((metric, index) => (
              <MetricCard key={metric.label} metric={metric} index={index} />
            ))}
      </div>

      {/* Voice Control — queries this section and returns results with visualizations */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-foreground">Voice Query</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ask a question or upload a dataset — your answer will appear as a visualization below.
          </p>
        </div>
        <VoiceControl onCommand={handleVoiceCommand} onResult={handleQueryResult} />
      </div>
    </div>
  );
}
