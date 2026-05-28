'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { api } from '@/services/api';
import { formatRelativeTime } from '@/utils/dateFormat';
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import { toast } from 'sonner';
import {
  Brain,
  RefreshCw,
  BarChart3,
  Info,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Mic,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AccuracyPoint {
  accuracy: number;
  recorded_at: string;
}

interface ModelHealth {
  model_id: string;
  name: string;
  model_type: string;
  current_accuracy: number;
  last_retrained: string;
  status: string;
  accuracyHistory: AccuracyPoint[];
  falsePositiveRate: number;
}

interface AiHealthResponse {
  models: ModelHealth[];
  threshold: number;
  nlpMetrics: { avgResolutionMs: number; totalToday: number; failedToday: number };
}

const modelExplainers: Record<string, string> = {
  TREND: 'Spots steady upward or downward changes in your data so the team can react early.',
  ANOMALY: 'Flags unusual spikes or drops that look different from the rest of the data.',
  PREDICTION: 'Estimates likely future numbers (e.g. next month\'s revenue) based on past patterns.',
  NLP: 'Understands questions typed or spoken in plain English so analysts can ask the data anything.',
};

function modelStatusClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'healthy') return 'bg-green-100 text-green-700 border-green-200';
  if (s === 'watch') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function plainLanguageStatus(accuracy: number, status: string) {
  const pct = accuracy * 100;
  if (status === 'Critical' || pct < 75) {
    return {
      label: 'Needs retraining',
      tone: 'red' as const,
      message: `Right now this model is correct about ${pct.toFixed(0)} out of every 100 times. Below 75 means insights from it should not be trusted until it is retrained.`,
      Icon: ShieldAlert,
    };
  }
  if (status === 'Watch' || pct < 90) {
    return {
      label: 'Keep an eye on it',
      tone: 'amber' as const,
      message: `This model is correct about ${pct.toFixed(0)} out of every 100 times. That is usable, but worth monitoring or retraining soon.`,
      Icon: AlertTriangle,
    };
  }
  return {
    label: 'Healthy',
    tone: 'green' as const,
    message: `This model is correct about ${pct.toFixed(0)} out of every 100 times. No action needed.`,
    Icon: CheckCircle2,
  };
}

export default function AdminAiHealthPage() {
  const [data, setData] = useState<AiHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(80);
  const [selectedModel, setSelectedModel] = useState<ModelHealth | null>(null);
  const [retrainingId, setRetrainingId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const previousAccuracyById = useRef<Record<string, number>>({});

  const fetchHealth = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await api.get<AiHealthResponse>('/admin/ai-health');
      setData(result);
      setThreshold(result.threshold);
      setLastSync(new Date());
      setError(null);

      if (silent) {
        // Detect changes that the admin should see at a glance
        for (const m of result.models) {
          const prev = previousAccuracyById.current[m.model_id];
          if (prev !== undefined && Math.abs(prev - m.current_accuracy) >= 0.02) {
            toast.message(
              `${m.name} accuracy changed: ${(prev * 100).toFixed(1)}% → ${(m.current_accuracy * 100).toFixed(1)}%`
            );
          }
          previousAccuracyById.current[m.model_id] = m.current_accuracy;
        }
      } else {
        previousAccuracyById.current = Object.fromEntries(
          result.models.map((m) => [m.model_id, m.current_accuracy])
        );
      }
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load AI health');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    const interval = setInterval(() => fetchHealth(true), 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const chartData = useMemo(() => {
    if (!data?.models.length) return [];
    const first = data.models[0];
    return first.accuracyHistory.map((p) => ({
      date: formatRelativeTime(p.recorded_at),
      accuracy: Math.round(p.accuracy * 1000) / 10,
    }));
  }, [data]);

  const histogramData = useMemo(() => {
    if (!selectedModel) return [];
    const acc = selectedModel.current_accuracy;
    return [
      { bucket: '60-70%', count: acc < 0.7 ? 12 : 2 },
      { bucket: '70-80%', count: acc >= 0.7 && acc < 0.8 ? 18 : 5 },
      { bucket: '80-90%', count: acc >= 0.8 && acc < 0.9 ? 24 : 8 },
      { bucket: '90-95%', count: acc >= 0.9 && acc < 0.95 ? 15 : 12 },
      { bucket: '95%+', count: acc >= 0.95 ? 8 : 4 },
    ];
  }, [selectedModel]);

  const summary = useMemo(() => {
    if (!data) return { healthy: 0, watch: 0, critical: 0 };
    return data.models.reduce(
      (acc, m) => {
        const s = plainLanguageStatus(m.current_accuracy, m.status);
        if (s.tone === 'green') acc.healthy += 1;
        else if (s.tone === 'amber') acc.watch += 1;
        else acc.critical += 1;
        return acc;
      },
      { healthy: 0, watch: 0, critical: 0 }
    );
  }, [data]);

  const handleRetrain = async (modelId: string) => {
    setRetrainingId(modelId);
    try {
      await api.post('/admin/ai-health', { modelId });
      toast.success('Model retraining started');
      fetchHealth(true);
    } catch {
      toast.error('Retrain failed');
    } finally {
      setRetrainingId(null);
    }
  };

  const saveThreshold = async () => {
    try {
      await api.put('/admin/ai-health', { threshold });
      toast.success('Alert threshold updated');
    } catch {
      toast.error('Failed to save threshold');
    }
  };

  if (loading && !data) return <div className="p-6"><PageLoadingSkeleton rows={6} /></div>;
  if (error && !data) return <div className="p-6"><PageError message={error} onRetry={() => fetchHealth()} /></div>;
  if (!data) return null;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Model Health</h1>
          <p className="text-sm text-muted-foreground">
            Each card shows how often a model is right in plain numbers. Updates every 15 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              Last update: {lastSync.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => fetchHealth()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh now
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-neutral-50 dark:bg-neutral-900/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">What does &quot;accuracy&quot; mean here?</p>
              <p className="text-sm text-muted-foreground">
                It is the share of times the model gave the right answer out of all answers it tried.
                90% means it was right 9 out of 10 times. Below 75% we recommend retraining.
              </p>
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-600" />{summary.healthy} healthy</span>
            <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-600" />{summary.watch} watch</span>
            <span className="flex items-center gap-1"><ShieldAlert className="w-4 h-4 text-red-600" />{summary.critical} critical</span>
          </div>
        </div>
      </Card>

      {data.models.length === 0 ? (
        <EmptyState title="No models" description="Predictive models have not been configured." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.models.map((model) => {
            const status = plainLanguageStatus(model.current_accuracy, model.status);
            const StatusIcon = status.Icon;
            return (
              <Card
                key={model.model_id}
                className="p-4 cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                onClick={() => setSelectedModel(model)}
              >
                <div className="flex items-start justify-between mb-2">
                  <Brain className="w-5 h-5 text-muted-foreground" />
                  <Badge variant="outline" className={modelStatusClass(model.status)}>{status.label}</Badge>
                </div>
                <h3 className="font-semibold text-foreground">{model.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {modelExplainers[model.model_type] ?? model.model_type}
                </p>
                <p className="text-3xl font-semibold text-foreground mt-3">{(model.current_accuracy * 100).toFixed(0)}%</p>
                <div className={`mt-1 flex items-start gap-1 text-xs ${
                  status.tone === 'red' ? 'text-red-600' : status.tone === 'amber' ? 'text-amber-600' : 'text-green-700'
                }`}>
                  <StatusIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{status.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  False alarms: {model.falsePositiveRate.toFixed(1)}% · Retrained {formatRelativeTime(model.last_retrained)}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-3"
                  disabled={retrainingId === model.model_id}
                  onClick={(e) => { e.stopPropagation(); handleRetrain(model.model_id); }}
                >
                  {retrainingId === model.model_id ? 'Retraining…' : 'Retrain now'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-1">Accuracy over the last 14 measurements</h3>
        <p className="text-sm text-muted-foreground mb-4">
          A flat or rising line is good. A sustained drop is the trigger to retrain the model.
        </p>
        {chartData.length === 0 ? (
          <EmptyState title="No trend data" description="Performance logs are not available yet." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(value: number) => `${value}%`} />
              <Line type="monotone" dataKey="accuracy" stroke="#171717" strokeWidth={2} dot={false} name="Accuracy" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-1">Alert threshold</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Any insight the AI is less than <span className="font-medium text-foreground">{threshold}%</span> sure about will be marked for an analyst to review before it shows up on dashboards.
          </p>
          <Slider value={[threshold]} onValueChange={([v]) => setThreshold(v)} min={50} max={99} step={1} />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>50% (lenient)</span>
            <span className="font-medium text-foreground">{threshold}%</span>
            <span>99% (strict)</span>
          </div>
          <Button className="mt-4" onClick={saveThreshold}>Save threshold</Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Mic className="w-4 h-4" /> Voice & natural-language queries today
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            When analysts ask the AI a question by typing or voice. &quot;Failed&quot; means the AI could not understand the question.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Avg time to answer</p>
              <p className="text-xl font-semibold text-foreground">{data.nlpMetrics.avgResolutionMs}ms</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Questions asked</p>
              <p className="text-xl font-semibold text-foreground">{data.nlpMetrics.totalToday}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Couldn&apos;t answer</p>
              <p className="text-xl font-semibold text-red-600">{data.nlpMetrics.failedToday}</p>
            </div>
          </div>
        </Card>
      </div>

      <Sheet open={!!selectedModel} onOpenChange={(o) => !o && setSelectedModel(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedModel?.name}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Last retrained: {selectedModel ? formatRelativeTime(selectedModel.last_retrained) : '—'}
            </p>
          </SheetHeader>
          {selectedModel && (() => {
            const status = plainLanguageStatus(selectedModel.current_accuracy, selectedModel.status);
            return (
              <div className="mt-6 space-y-6">
                <div className={`rounded-lg border p-3 text-sm ${
                  status.tone === 'red'
                    ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:border-red-900'
                    : status.tone === 'amber'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900'
                      : 'border-green-200 bg-green-50 text-green-700 dark:bg-green-950/30 dark:border-green-900'
                }`}>
                  <p className="font-medium">{status.label}</p>
                  <p className="mt-1">{status.message}</p>
                </div>

                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Accuracy distribution</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={histogramData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="text-sm space-y-2">
                  <p><span className="text-muted-foreground">What it does:</span> {modelExplainers[selectedModel.model_type] ?? selectedModel.model_type}</p>
                  <p><span className="text-muted-foreground">Accuracy:</span> {(selectedModel.current_accuracy * 100).toFixed(1)}%</p>
                  <p><span className="text-muted-foreground">False alarm rate:</span> {selectedModel.falsePositiveRate.toFixed(1)}%</p>
                </div>

                <Button
                  className="w-full"
                  disabled={retrainingId === selectedModel.model_id}
                  onClick={() => handleRetrain(selectedModel.model_id)}
                >
                  Retrain this model
                </Button>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
