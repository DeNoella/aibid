'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Brain, RefreshCw, BarChart3 } from 'lucide-react';
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

function modelStatusClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'healthy') return 'bg-green-100 text-green-700 border-green-200';
  if (s === 'watch') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

export default function AdminAiHealthPage() {
  const [data, setData] = useState<AiHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(80);
  const [selectedModel, setSelectedModel] = useState<ModelHealth | null>(null);
  const [retrainingId, setRetrainingId] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<AiHealthResponse>('/admin/ai-health');
      setData(result);
      setThreshold(result.threshold);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load AI health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
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

  const handleRetrain = async (modelId: string) => {
    setRetrainingId(modelId);
    try {
      await api.post('/admin/ai-health', { modelId });
      toast.success('Model retraining started');
      fetchHealth();
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
  if (error && !data) return <div className="p-6"><PageError message={error} onRetry={fetchHealth} /></div>;
  if (!data) return <div className="p-6"><EmptyState title="No AI health data" description="Model metrics are unavailable." /></div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Model Health</h1>
          <p className="text-sm text-muted-foreground">Monitor accuracy, retrain models, and tune alerts</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {data.models.length === 0 ? (
        <EmptyState title="No models" description="Predictive models have not been configured." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.models.map((model) => (
            <Card
              key={model.model_id}
              className="p-4 cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
              onClick={() => setSelectedModel(model)}
            >
              <div className="flex items-start justify-between mb-2">
                <Brain className="w-5 h-5 text-muted-foreground" />
                <Badge variant="outline" className={modelStatusClass(model.status)}>{model.status}</Badge>
              </div>
              <h3 className="font-semibold text-foreground">{model.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{model.model_type}</p>
              <p className="text-2xl font-semibold text-foreground mt-3">{(model.current_accuracy * 100).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">FP rate: {model.falsePositiveRate.toFixed(1)}%</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3"
                disabled={retrainingId === model.model_id}
                onClick={(e) => { e.stopPropagation(); handleRetrain(model.model_id); }}
              >
                {retrainingId === model.model_id ? 'Retraining...' : 'Retrain'}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">14-Day Accuracy Trend</h3>
        {chartData.length === 0 ? (
          <EmptyState title="No trend data" description="Performance logs are not available yet." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="accuracy" stroke="#171717" strokeWidth={2} dot={false} name="Accuracy %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Alert Threshold</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Insights below {threshold}% confidence are flagged for review.
          </p>
          <Slider value={[threshold]} onValueChange={([v]) => setThreshold(v)} min={50} max={99} step={1} />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>50%</span>
            <span className="font-medium text-foreground">{threshold}%</span>
            <span>99%</span>
          </div>
          <Button className="mt-4" onClick={saveThreshold}>Save threshold</Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">NLP / Voice Metrics (Today)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Avg resolution</p>
              <p className="text-xl font-semibold text-foreground">{data.nlpMetrics.avgResolutionMs}ms</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Queries</p>
              <p className="text-xl font-semibold text-foreground">{data.nlpMetrics.totalToday}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
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
          {selectedModel && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Accuracy distribution (histogram)</span>
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
                <p><span className="text-muted-foreground">Type:</span> {selectedModel.model_type}</p>
                <p><span className="text-muted-foreground">Accuracy:</span> {(selectedModel.current_accuracy * 100).toFixed(1)}%</p>
                <p><span className="text-muted-foreground">False positive rate:</span> {selectedModel.falsePositiveRate.toFixed(1)}%</p>
              </div>
              <Button
                className="w-full"
                disabled={retrainingId === selectedModel.model_id}
                onClick={() => handleRetrain(selectedModel.model_id)}
              >
                Retrain model
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
