import { Card } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

interface AnalyticsChartProps {
  data: ChartDataPoint[];
  title: string;
  dataKeys: { key: string; color: string; label: string; }[];
  type?: 'line' | 'bar' | 'area';
}

export const AnalyticsChart = ({ 
  data, 
  title, 
  dataKeys,
  type = 'line'
}: AnalyticsChartProps) => {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>(type);

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    const Chart = chartType === 'line' ? LineChart : chartType === 'bar' ? BarChart : AreaChart;

    return (
      <ResponsiveContainer width="100%" height={350}>
        <Chart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
          {dataKeys.map(({ key, color, label }) => {
            if (chartType === 'line') {
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, r: 4 }}
                  name={label}
                />
              );
            } else if (chartType === 'bar') {
              return (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={color}
                  name={label}
                  radius={[4, 4, 0, 0]}
                />
              );
            } else {
              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.6}
                  name={label}
                />
              );
            }
          })}
        </Chart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Tabs value={chartType} onValueChange={(v) => setChartType(v as any)}>
          <TabsList className="bg-neutral-100">
            <TabsTrigger value="line" className="text-xs">Line</TabsTrigger>
            <TabsTrigger value="bar" className="text-xs">Bar</TabsTrigger>
            <TabsTrigger value="area" className="text-xs">Area</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {renderChart()}
    </Card>
  );
};
