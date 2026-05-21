'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Search, AlertTriangle } from 'lucide-react';

type TabKey = 'pending' | 'approved' | 'false_positive';

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  impact: string;
  analyst_note?: string;
  low_confidence_pending?: number;
  created_at: string;
}

interface ValidateResponse {
  insights: Insight[];
  pendingCount: number;
  threshold: number;
}

const typeBadgeClass: Record<string, string> = {
  trend: 'bg-blue-100 text-blue-700 border-blue-200',
  anomaly: 'bg-amber-100 text-amber-700 border-amber-200',
  prediction: 'bg-purple-100 text-purple-700 border-purple-200',
  recommendation: 'bg-green-100 text-green-700 border-green-200',
};

function ValidateContent() {
  const [tab, setTab] = useState<TabKey>('pending');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [threshold, setThreshold] = useState(70);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchInsights = useCallback(async (activeTab: TabKey) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<ValidateResponse>(`/insights/validate?tab=${activeTab}`);
      setInsights(data.insights);
      setPendingCount(data.pendingCount);
      setThreshold(data.threshold);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights(tab);
  }, [tab, fetchInsights]);

  const handleThresholdChange = async (value: number[]) => {
    const next = value[0];
    setThreshold(next);
  };

  const handleThresholdCommit = async () => {
    try {
      await api.put('/insights/validate', { threshold });
      toast.success('Confidence threshold updated');
      fetchInsights(tab);
    } catch {
      toast.error('Failed to update threshold');
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'false-positive' | 'drill-down') => {
    setActionId(id);
    try {
      if (action === 'drill-down') {
        const question = notes[id]?.trim() || 'Provide deeper analysis on this insight';
        const result = await api.post<{ childId: string }>(`/insights/${id}`, { action, question });
        toast.success('Drill-down insight created', {
          description: 'A follow-up insight has been queued for review.',
        });
        if (result.childId) {
          setTab('pending');
        }
      } else {
        await api.post(`/insights/${id}`, { action, note: notes[id] || undefined });
        toast.success(action === 'approve' ? 'Insight approved' : 'Marked as false positive');
        fetchInsights(tab);
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insight Validation</h1>
          <p className="text-sm text-muted-foreground">
            Review AI-generated insights before publication
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-200">{pendingCount} pending</Badge>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/insights/lineage">View lineage</Link>
        </Button>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <Label className="text-sm font-medium">Auto-hold confidence threshold</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Insights below {threshold}% confidence are held for manual review
            </p>
          </div>
          <span className="text-lg font-semibold tabular-nums">{threshold}%</span>
        </div>
        <Slider
          value={[threshold]}
          onValueChange={handleThresholdChange}
          onValueCommit={handleThresholdCommit}
          min={40}
          max={95}
          step={1}
          className="mb-2"
        />
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="bg-neutral-100 dark:bg-neutral-800 w-full sm:w-auto grid grid-cols-3 sm:flex">
          <TabsTrigger value="pending" className="flex-1 sm:flex-none">Pending</TabsTrigger>
          <TabsTrigger value="approved" className="flex-1 sm:flex-none">Approved</TabsTrigger>
          <TabsTrigger value="false_positive" className="flex-1 sm:flex-none">False positive</TabsTrigger>
        </TabsList>

        {(['pending', 'approved', 'false_positive'] as TabKey[]).map((tabKey) => (
          <TabsContent key={tabKey} value={tabKey} className="space-y-4 mt-4">
            {loading ? (
              <PageLoadingSkeleton rows={3} />
            ) : error ? (
              <PageError message={error} onRetry={() => fetchInsights(tabKey)} />
            ) : insights.length === 0 ? (
              <EmptyState
                title={tabKey === 'pending' ? 'No pending insights' : tabKey === 'approved' ? 'No approved insights' : 'No false positives'}
                description="Insights matching this filter will appear here."
              />
            ) : (
              insights.map((insight) => {
                const confidencePct = Math.round((insight.confidence ?? 0) * 100);
                const isLowConfidence = confidencePct < threshold;
                const isPending = tabKey === 'pending';

                return (
                  <Card key={insight.id} className="p-4 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={typeBadgeClass[insight.type] ?? 'bg-neutral-100 text-neutral-700 border-neutral-200'}>
                            {insight.type}
                          </Badge>
                          <Badge variant="outline">{insight.impact} impact</Badge>
                          {isLowConfidence && isPending && (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Below threshold
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground">{insight.title}</h3>
                      </div>
                      <span className="text-sm text-muted-foreground tabular-nums">{confidencePct}%</span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4">{insight.description}</p>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Confidence</span>
                        <span>{confidencePct}%</span>
                      </div>
                      <Progress value={confidencePct} className="h-2" />
                    </div>

                    {isPending && (
                      <>
                        <Textarea
                          placeholder="Analyst note (optional)"
                          value={notes[insight.id] ?? insight.analyst_note ?? ''}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [insight.id]: e.target.value }))}
                          className="mb-4"
                          rows={2}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="bg-green-700 hover:bg-green-800 text-white"
                            disabled={actionId === insight.id}
                            onClick={() => handleAction(insight.id, 'approve')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionId === insight.id}
                            onClick={() => handleAction(insight.id, 'false-positive')}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            False positive
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionId === insight.id}
                            onClick={() => handleAction(insight.id, 'drill-down')}
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Drill down
                          </Button>
                        </div>
                      </>
                    )}

                    {!isPending && insight.analyst_note && (
                      <p className="text-sm text-muted-foreground border-t pt-3 mt-2">
                        <span className="font-medium text-foreground">Note: </span>
                        {insight.analyst_note}
                      </p>
                    )}
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default function InsightValidatePage() {
  return (
    <RoleGuard allowedRoles={['analyst']}>
      <ValidateContent />
    </RoleGuard>
  );
}
