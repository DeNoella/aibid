'use client';

import { useCallback, useEffect, useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PageLoadingSkeleton, PageError, EmptyState } from '@/components/shared/PageStates';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { AlertTriangle, Database, Sparkles, Brain, Lightbulb, ScanSearch } from 'lucide-react';

interface InsightTitle {
  id: string;
  title: string;
}

interface LineageData {
  lineage: {
    insight: Record<string, unknown>;
    source: Record<string, unknown>;
    cleaning: { steps: string[] };
    model: Record<string, unknown>;
  };
  related: { id: string; title: string; type: string; confidence: number }[];
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 72;
const GAP = 80;
const SVG_HEIGHT = 160;

function LineageGraph({
  source,
  cleaning,
  model,
  insight,
  onNodeClick,
}: {
  source: Record<string, unknown>;
  cleaning: { steps: string[] };
  model: Record<string, unknown>;
  insight: Record<string, unknown>;
  onNodeClick: (key: string) => void;
}) {
  const nodes = [
    { key: 'source', label: 'Data Source', sub: String(source.name ?? 'Source'), icon: Database, x: 20 },
    { key: 'cleaning', label: 'Cleaning', sub: `${cleaning.steps.length} steps`, icon: Sparkles, x: 20 + NODE_WIDTH + GAP },
    { key: 'model', label: 'Model', sub: String(model.name ?? 'Model'), icon: Brain, x: 20 + (NODE_WIDTH + GAP) * 2 },
    { key: 'insight', label: 'Insight', sub: String(insight.title ?? 'Insight').slice(0, 24), icon: Lightbulb, x: 20 + (NODE_WIDTH + GAP) * 3 },
  ];

  const svgWidth = 20 + (NODE_WIDTH + GAP) * 3 + NODE_WIDTH + 20;

  return (
    <svg viewBox={`0 0 ${svgWidth} ${SVG_HEIGHT}`} className="w-full max-w-4xl h-auto">
      {nodes.slice(0, -1).map((node, i) => {
        const next = nodes[i + 1];
        const x1 = node.x + NODE_WIDTH;
        const x2 = next.x;
        const y = SVG_HEIGHT / 2;
        return (
          <g key={`edge-${node.key}`}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke="currentColor" strokeOpacity={0.25} strokeWidth={2} markerEnd="url(#arrow)" />
          </g>
        );
      })}
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="currentColor" fillOpacity={0.4} />
        </marker>
      </defs>
      {nodes.map((node) => {
        const y = SVG_HEIGHT / 2 - NODE_HEIGHT / 2;
        return (
          <Popover key={node.key}>
            <PopoverTrigger asChild>
              <g
                className="cursor-pointer"
                onClick={() => onNodeClick(node.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onNodeClick(node.key)}
              >
                <rect
                  x={node.x}
                  y={y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  className="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-300 dark:stroke-neutral-600"
                  strokeWidth={1.5}
                />
                <text x={node.x + NODE_WIDTH / 2} y={y + 28} textAnchor="middle" className="fill-foreground text-xs font-semibold">
                  {node.label}
                </text>
                <text x={node.x + NODE_WIDTH / 2} y={y + 48} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {node.sub}
                </text>
              </g>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <p className="font-medium text-sm mb-1">{node.label}</p>
              <p className="text-xs text-muted-foreground">{node.sub}</p>
              {node.key === 'cleaning' && (
                <ul className="mt-2 text-xs space-y-1">
                  {cleaning.steps.map((step) => (
                    <li key={step}>• {step}</li>
                  ))}
                </ul>
              )}
              {node.key === 'source' && source.quality_score != null && (
                <p className="text-xs mt-2">Quality: {String(source.quality_score)}%</p>
              )}
              {node.key === 'model' && model.current_accuracy != null && (
                <p className="text-xs mt-2">Accuracy: {Math.round(Number(model.current_accuracy) * 100)}%</p>
              )}
            </PopoverContent>
          </Popover>
        );
      })}
    </svg>
  );
}

function LineageContent() {
  const [titles, setTitles] = useState<InsightTitle[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [lineage, setLineage] = useState<LineageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [impactScanning, setImpactScanning] = useState(false);

  const fetchTitles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<{ titles: InsightTitle[] }>('/insights/lineage');
      setTitles(data.titles);
      if (data.titles.length > 0) {
        setSelectedId((prev) => prev || data.titles[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLineage = useCallback(async (insightId: string) => {
    if (!insightId) return;
    try {
      setLineageLoading(true);
      const data = await api.get<LineageData>(`/insights/lineage?insightId=${insightId}`);
      setLineage(data);
    } catch {
      toast.error('Failed to load lineage');
    } finally {
      setLineageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTitles();
  }, [fetchTitles]);

  useEffect(() => {
    if (selectedId) fetchLineage(selectedId);
  }, [selectedId, fetchLineage]);

  const handleImpactScan = () => {
    setImpactScanning(true);
    setTimeout(() => {
      setImpactScanning(false);
      toast.success('Impact scan complete', {
        description: `${lineage?.related.length ?? 0} related insights may be affected.`,
      });
    }, 1200);
  };

  const qualityScore = lineage?.lineage.source?.quality_score as number | undefined;
  const modelAccuracy = lineage?.lineage.model?.current_accuracy as number | undefined;
  const warnings: string[] = [];
  if (qualityScore != null && qualityScore < 70) warnings.push(`Source quality score is low (${qualityScore}%)`);
  if (modelAccuracy != null && modelAccuracy < 0.8) warnings.push(`Model accuracy below 80% (${Math.round(modelAccuracy * 100)}%)`);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <PageLoadingSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <PageError message={error} onRetry={fetchTitles} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insight Lineage</h1>
          <p className="text-sm text-muted-foreground">Trace data flow from source to AI insight</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full md:w-72">
              <SelectValue placeholder="Select insight" />
            </SelectTrigger>
            <SelectContent>
              {titles.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleImpactScan} disabled={impactScanning || !lineage}>
            <ScanSearch className="w-4 h-4 mr-2" />
            {impactScanning ? 'Scanning…' : 'Impact scan'}
          </Button>
        </div>
      </div>

      {titles.length === 0 ? (
        <EmptyState title="No insights available" description="Generate or import insights to view lineage." />
      ) : lineageLoading || !lineage ? (
        <PageLoadingSkeleton rows={2} />
      ) : (
        <>
          {warnings.length > 0 && (
            <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-200 text-sm">Quality warnings</p>
                  <ul className="text-sm text-amber-800 dark:text-amber-300 mt-1 space-y-1">
                    {warnings.map((w) => (
                      <li key={w}>• {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4 sm:p-6 overflow-x-auto">
            <LineageGraph
              source={lineage.lineage.source}
              cleaning={lineage.lineage.cleaning}
              model={lineage.lineage.model}
              insight={lineage.lineage.insight}
              onNodeClick={() => {}}
            />
          </Card>

          {lineage.related.length > 0 && (
            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold text-foreground mb-3">Related insights</h3>
              <div className="space-y-2">
                {lineage.related.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <Badge className="mt-1 text-xs" variant="outline">{r.type}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground tabular-nums">{Math.round(r.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default function InsightLineagePage() {
  return (
    <RoleGuard allowedRoles={['analyst']}>
      <LineageContent />
    </RoleGuard>
  );
}
