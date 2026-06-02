'use client';

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Vibrant palette — every colour is clearly visible on both light and dark backgrounds.
const COLORS = [
  '#f0883e', // brand orange
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // amber
  '#ec4899', // pink
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ef4444', // red
  '#14b8a6', // teal
  '#f97316', // deep orange
];

// Compact number formatting for axis labels (e.g. 1.2M, 45K)
function compact(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

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

  // Axis/grid colours follow the surrounding text colour (themed via the wrapper).
  const axisTick = { fontSize: 11, fill: 'currentColor' };
  const gridStroke = 'currentColor';
  const tooltipStyle = {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--popover-foreground)',
    fontSize: '12px',
  };
  // Force tooltip label + value text to the themed colour (default is black → invisible in dark mode)
  const tooltipLabelStyle = { color: 'var(--popover-foreground)', fontWeight: 600 };
  const tooltipItemStyle = { color: 'var(--popover-foreground)' };

  return (
    <div className="h-80 sm:h-96 w-full mt-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-border p-3 text-neutral-600 dark:text-neutral-300">
      <ResponsiveContainer width="100%" height="100%">
        {type === 'pie' ? (
          <PieChart margin={{ top: 24, right: 24, bottom: 24, left: 24 }}>
            <Pie
              data={data.slice(0, 10)}
              dataKey={y}
              nameKey={x}
              cx="50%"
              cy="50%"
              outerRadius="70%"
              innerRadius="40%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              label={(entry) => String((entry as Record<string, unknown>)[x] ?? '')}
              labelLine={{ stroke: 'currentColor', strokeOpacity: 0.4 }}
            >
              {data.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        ) : type === 'line' ? (
          <LineChart data={data.slice(0, 20)} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} strokeOpacity={0.15} />
            <XAxis dataKey={x} tick={axisTick} stroke={gridStroke} strokeOpacity={0.3} />
            <YAxis tick={axisTick} stroke={gridStroke} strokeOpacity={0.3} tickFormatter={compact} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ stroke: '#f0883e', strokeOpacity: 0.3 }} />
            <Line type="monotone" dataKey={y} stroke="#f0883e" strokeWidth={3} dot={{ fill: '#f0883e', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        ) : type === 'scatter' ? (
          <ScatterChart margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} strokeOpacity={0.15} />
            <XAxis dataKey={x} tick={axisTick} stroke={gridStroke} strokeOpacity={0.3} />
            <YAxis dataKey={y} tick={axisTick} stroke={gridStroke} strokeOpacity={0.3} tickFormatter={compact} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ strokeOpacity: 0.2 }} />
            <Scatter data={data.slice(0, 50)} fill="#3b82f6" />
          </ScatterChart>
        ) : (
          <BarChart data={data.slice(0, 12)} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} strokeOpacity={0.15} vertical={false} />
            <XAxis dataKey={x} tick={axisTick} stroke={gridStroke} strokeOpacity={0.3} />
            <YAxis tick={axisTick} stroke={gridStroke} strokeOpacity={0.3} tickFormatter={compact} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: 'currentColor', fillOpacity: 0.06 }} />
            <Bar dataKey={y} radius={[6, 6, 0, 0]}>
              {data.slice(0, 12).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
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
