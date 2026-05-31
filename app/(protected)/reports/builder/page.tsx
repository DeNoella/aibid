'use client';

import { useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { FileText, Download, Save, Sparkles, Send } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PreviewChart {
  type: 'bar' | 'line';
  title: string;
  data: { name: string; value: number; secondary?: number }[];
}

const defaultChartData = [
  { name: 'Jan', value: 4200, secondary: 2400 },
  { name: 'Feb', value: 3800, secondary: 2210 },
  { name: 'Mar', value: 5100, secondary: 2900 },
  { name: 'Apr', value: 4600, secondary: 2780 },
  { name: 'May', value: 5400, secondary: 3200 },
  { name: 'Jun', value: 4900, secondary: 3100 },
];

function BuilderContent() {
  const [prompt, setPrompt] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ summary: string; charts: PreviewChart[] } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [refinement, setRefinement] = useState('');

  const buildPreview = (userPrompt: string) => ({
    summary: `Report generated from: "${userPrompt.slice(0, 120)}${userPrompt.length > 120 ? '…' : ''}"`,
    charts: [
      { type: 'bar' as const, title: 'Primary Metrics', data: defaultChartData },
      { type: 'line' as const, title: 'Trend Analysis', data: defaultChartData },
    ],
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Enter a prompt to generate a report');
      return;
    }
    setGenerating(true);
    try {
      const nextPreview = buildPreview(prompt);
      const result = await api.post<{ reportId: string; preview: typeof nextPreview }>('/reports/builder', {
        action: 'generate',
        prompt,
        title: `Report — ${new Date().toLocaleDateString()}`,
        preview: nextPreview,
      });
      setPreview(result.preview ?? nextPreview);
      setChatMessages([
        { role: 'user', content: prompt },
        { role: 'assistant', content: 'Report preview generated. Use refinement to adjust charts and metrics.' },
      ]);
      toast.success('Report preview ready');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = () => {
    if (!refinement.trim()) return;
    const updated = buildPreview(`${prompt} — ${refinement}`);
    setPreview(updated);
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: refinement },
      { role: 'assistant', content: 'Preview updated based on your refinement.' },
    ]);
    setRefinement('');
    toast.success('Preview refined');
  };

  const handleSaveRecipe = async () => {
    if (!prompt.trim() || !recipeName.trim()) {
      toast.error('Provide a recipe name and prompt');
      return;
    }
    try {
      await api.post('/reports/builder', {
        action: 'save-recipe',
        name: recipeName,
        prompt,
      });
      toast.success('Recipe saved');
    } catch {
      toast.error('Failed to save recipe');
    }
  };

  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    toast.success(`${format} export started`, {
      description: 'Your report file is being prepared for download.',
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Report Builder</h1>
        <p className="text-sm text-muted-foreground">Generate reports from natural language prompts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="p-4 sm:p-6">
            <Label htmlFor="prompt" className="text-sm font-medium">Natural language prompt</Label>
            <Textarea
              id="prompt"
              placeholder="e.g. Show revenue trends by campaign for the last 6 months with conversion breakdown"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="mt-2 mb-4"
            />
            <Button
              className="w-full bg-neutral-900 hover:bg-black text-white dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand/90"
              onClick={handleGenerate}
              disabled={generating}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? 'Generating…' : 'Generate report'}
            </Button>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-3">Refinement chat</h3>
            <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
              {chatMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Generate a report to start refining.</p>
              ) : (
                chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-sm p-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-neutral-100 dark:bg-neutral-800 ml-4'
                        : 'bg-neutral-50 dark:bg-neutral-900 mr-4 border'
                    }`}
                  >
                    <Badge variant="outline" className="text-[10px] mb-1">{msg.role}</Badge>
                    <p>{msg.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Refine the report…"
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                disabled={!preview}
              />
              <Button size="icon" variant="outline" onClick={handleRefine} disabled={!preview}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold text-foreground mb-3">Save as recipe</h3>
            <Input
              placeholder="Recipe name"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              className="mb-3"
            />
            <Button variant="outline" className="w-full" onClick={handleSaveRecipe}>
              <Save className="w-4 h-4 mr-2" />
              Save recipe
            </Button>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Live preview
              </h3>
              {preview && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport('PDF')}>
                    <Download className="w-3 h-3 mr-1" />
                    PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport('Excel')}>Excel</Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport('CSV')}>CSV</Button>
                </div>
              )}
            </div>

            {!preview ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Enter a prompt and generate to see the live preview.
              </p>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">{preview.summary}</p>
                {preview.charts.map((chart, idx) => (
                  <div key={idx}>
                    <p className="text-sm font-medium mb-2">{chart.title}</p>
                    <ResponsiveContainer width="100%" height={200}>
                      {chart.type === 'bar' ? (
                        <BarChart data={chart.data}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" fill="#171717" name="Primary" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="secondary" fill="#737373" name="Secondary" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <LineChart data={chart.data}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="#171717" name="Primary" strokeWidth={2} />
                          <Line type="monotone" dataKey="secondary" stroke="#737373" name="Secondary" strokeWidth={2} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ReportBuilderPage() {
  return (
    <RoleGuard allowedRoles={['analyst']}>
      <BuilderContent />
    </RoleGuard>
  );
}
