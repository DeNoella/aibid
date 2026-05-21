'use client';

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#171717', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

interface InlineChartProps {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  data: Record<string, unknown>[];
  xKey?: string;
  yKey?: string;
}

export function InlineDataChart({ type, data, xKey, yKey }: InlineChartProps) {
  if (!data.length) return null;
  const keys = Object.keys(data[0]);
  const x = xKey ?? keys[0];
  const y = yKey ?? keys.find((k) => k !== x && typeof data[0][k] === 'number') ?? keys[1];

  return (
    <div className="h-48 w-full mt-3">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'pie' ? (
          <PieChart>
            <Pie data={data.slice(0, 8)} dataKey={y} nameKey={x} cx="50%" cy="50%" outerRadius={60}>
              {data.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : type === 'line' ? (
          <LineChart data={data.slice(0, 20)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={x} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey={y} stroke="#171717" strokeWidth={2} />
          </LineChart>
        ) : type === 'scatter' ? (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={x} tick={{ fontSize: 10 }} />
            <YAxis dataKey={y} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Scatter data={data.slice(0, 50)} fill="#3b82f6" />
          </ScatterChart>
        ) : (
          <BarChart data={data.slice(0, 12)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={x} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey={y} fill="#171717" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function inferChartType(question: string, data: Record<string, unknown>[]): 'bar' | 'line' | 'pie' | 'scatter' {
  const q = question.toLowerCase();
  if (q.includes('trend') || q.includes('over time') || q.includes('month')) return 'line';
  if (q.includes('distribution') || q.includes('share') || q.includes('percentage')) return 'pie';
  if (q.includes('correlation') || q.includes('scatter')) return 'scatter';
  const keys = data.length ? Object.keys(data[0]) : [];
  const dateCol = keys.find((k) => /date|time|month|year/i.test(k));
  if (dateCol) return 'line';
  return 'bar';
}

export function shouldShowChart(question: string): boolean {
  const q = question.toLowerCase();
  return q.includes('chart') || q.includes('graph') || q.includes('plot') || q.includes('visual') ||
    q.includes('compare') || q.includes('top') || q.includes('breakdown') || q.includes('by ');
}
