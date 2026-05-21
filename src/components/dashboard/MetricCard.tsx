import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricData } from '@/types';
import { motion } from 'motion/react';

interface MetricCardProps {
  metric: MetricData;
  index?: number;
}

export const MetricCard = ({ metric, index = 0 }: MetricCardProps) => {
  const getTrendIcon = () => {
    if (metric.trend === 'up') return <TrendingUp className="w-4 h-4" />;
    if (metric.trend === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (metric.trend === 'up') return 'text-green-600';
    if (metric.trend === 'down') return 'text-red-600';
    return 'text-muted-foreground';
  };

  const formatValue = (value: number, label: string) => {
    if (label.includes('Rate') || label.includes('Cost')) {
      return value.toFixed(2);
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="p-6 hover:shadow-md transition-shadow">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-semibold text-foreground">
              {metric.label.includes('Cost') && '$'}
              {formatValue(metric.value, metric.label)}
              {metric.label.includes('Rate') && '%'}
            </h3>
            <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{Math.abs(metric.change)}%</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">vs. previous period</p>
        </div>
      </Card>
    </motion.div>
  );
};
