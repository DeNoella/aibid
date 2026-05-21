import { MetricData, ChartDataPoint, AuditLog, AIInsight, Report } from '@/types';

export const generateMockMetrics = (filter?: string): MetricData[] => {
  const baseMetrics: MetricData[] = [
    { label: 'Total Revenue', value: 284750, change: 12.5, trend: 'up' },
    { label: 'Active Campaigns', value: 24, change: -3.2, trend: 'down' },
    { label: 'Conversion Rate', value: 3.84, change: 8.1, trend: 'up' },
    { label: 'Customer Acquisition Cost', value: 42.50, change: -5.4, trend: 'up' },
    { label: 'Total Impressions', value: 1245000, change: 15.3, trend: 'up' },
    { label: 'Click-Through Rate', value: 2.47, change: 4.2, trend: 'up' },
  ];

  if (filter === 'revenue' || filter === 'show revenue') {
    return baseMetrics.filter(m => m.label.toLowerCase().includes('revenue'));
  }
  if (filter === 'campaigns' || filter === 'show campaigns') {
    return baseMetrics.filter(m => m.label.toLowerCase().includes('campaign'));
  }
  if (filter === 'conversion' || filter === 'show conversion') {
    return baseMetrics.filter(m => m.label.toLowerCase().includes('conversion'));
  }
  
  return baseMetrics;
};

export const generateChartData = (type: string = 'monthly'): ChartDataPoint[] => {
  if (type === 'weekly') {
    return [
      { name: 'Mon', revenue: 12400, cost: 4200, profit: 8200, conversions: 142, clicks: 3400, impressions: 45000 },
      { name: 'Tue', revenue: 15600, cost: 5100, profit: 10500, conversions: 168, clicks: 4100, impressions: 52000 },
      { name: 'Wed', revenue: 14200, cost: 4800, profit: 9400, conversions: 156, clicks: 3800, impressions: 49000 },
      { name: 'Thu', revenue: 18900, cost: 6200, profit: 12700, conversions: 201, clicks: 5200, impressions: 61000 },
      { name: 'Fri', revenue: 16800, cost: 5500, profit: 11300, conversions: 184, clicks: 4600, impressions: 55000 },
      { name: 'Sat', revenue: 13200, cost: 4400, profit: 8800, conversions: 145, clicks: 3500, impressions: 44000 },
      { name: 'Sun', revenue: 11500, cost: 3900, profit: 7600, conversions: 128, clicks: 3100, impressions: 38000 },
    ];
  }
  
  if (type === 'quarterly') {
    return [
      { name: 'Q1 2025', revenue: 245000, cost: 82000, profit: 163000, conversions: 2840, clicks: 68000, impressions: 980000 },
      { name: 'Q2 2025', revenue: 268000, cost: 89000, profit: 179000, conversions: 3120, clicks: 75000, impressions: 1050000 },
      { name: 'Q3 2025', revenue: 291000, cost: 95000, profit: 196000, conversions: 3450, clicks: 82000, impressions: 1180000 },
      { name: 'Q4 2025', revenue: 315000, cost: 102000, profit: 213000, conversions: 3780, clicks: 89000, impressions: 1290000 },
    ];
  }
  
  // Default monthly data
  return [
    { name: 'Jan', revenue: 65400, cost: 22000, profit: 43400, conversions: 742, clicks: 18500, impressions: 245000 },
    { name: 'Feb', revenue: 71200, cost: 24000, profit: 47200, conversions: 814, clicks: 20100, impressions: 268000 },
    { name: 'Mar', revenue: 68900, cost: 23200, profit: 45700, conversions: 789, clicks: 19400, impressions: 251000 },
    { name: 'Apr', revenue: 78500, cost: 26300, profit: 52200, conversions: 902, clicks: 22400, impressions: 298000 },
    { name: 'May', revenue: 82100, cost: 27500, profit: 54600, conversions: 948, clicks: 23800, impressions: 315000 },
    { name: 'Jun', revenue: 88400, cost: 29600, profit: 58800, conversions: 1024, clicks: 25900, impressions: 342000 },
    { name: 'Jul', revenue: 92800, cost: 31100, profit: 61700, conversions: 1087, clicks: 27500, impressions: 364000 },
    { name: 'Aug', revenue: 96500, cost: 32400, profit: 64100, conversions: 1142, clicks: 29100, impressions: 385000 },
    { name: 'Sep', revenue: 89200, cost: 29900, profit: 59300, conversions: 1034, clicks: 26200, impressions: 348000 },
    { name: 'Oct', revenue: 94700, cost: 31700, profit: 63000, conversions: 1108, clicks: 28400, impressions: 376000 },
    { name: 'Nov', revenue: 98200, cost: 32900, profit: 65300, conversions: 1156, clicks: 29800, impressions: 394000 },
    { name: 'Dec', revenue: 102400, cost: 34300, profit: 68100, conversions: 1214, clicks: 31500, impressions: 417000 },
  ];
};

export const generateAuditLogs = (): AuditLog[] => {
  const actions = [
    'Generated monthly report',
    'Updated dashboard settings',
    'Accessed AI insights',
    'Exported data',
    'Modified user permissions',
    'Viewed analytics',
    'Created new campaign',
    'Updated data filters'
  ];
  
  const users = ['Ange Mutesi', 'John Doe', 'Sarah Johnson', 'Mike Peters'];
  const modules = ['Dashboard', 'Reports', 'AI Analytics', 'Data Management', 'Settings'];
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: `log-${i + 1}`,
    timestamp: new Date(Date.now() - i * 3600000),
    user: users[Math.floor(Math.random() * users.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    module: modules[Math.floor(Math.random() * modules.length)],
    details: 'Operation completed successfully'
  }));
};

export const generateAIInsights = (): AIInsight[] => {
  return [
    {
      id: 'insight-1',
      type: 'trend',
      title: 'Revenue Growth Acceleration',
      description: 'Revenue has increased by 15.3% over the past 30 days, outpacing the quarterly average of 8.2%. This trend is expected to continue based on current campaign performance.',
      confidence: 0.89,
      timestamp: new Date(Date.now() - 2 * 3600000),
      impact: 'high'
    },
    {
      id: 'insight-2',
      type: 'anomaly',
      title: 'Unusual Campaign Activity Detected',
      description: 'Campaign #12 shows a 42% decrease in click-through rate compared to the previous week. Recommendation: Review ad creative and targeting parameters.',
      confidence: 0.92,
      timestamp: new Date(Date.now() - 5 * 3600000),
      impact: 'medium'
    },
    {
      id: 'insight-3',
      type: 'prediction',
      title: 'Q1 2026 Revenue Forecast',
      description: 'Based on current trends and seasonal patterns, Q1 2026 revenue is projected to reach $342,000, representing a 8.6% increase over Q4 2025.',
      confidence: 0.76,
      timestamp: new Date(Date.now() - 8 * 3600000),
      impact: 'high'
    },
    {
      id: 'insight-4',
      type: 'recommendation',
      title: 'Optimize Ad Spend Allocation',
      description: 'Analysis suggests reallocating 15% of budget from Campaign Group A to Campaign Group C could increase overall ROI by approximately 12%.',
      confidence: 0.84,
      timestamp: new Date(Date.now() - 12 * 3600000),
      impact: 'high'
    },
    {
      id: 'insight-5',
      type: 'trend',
      title: 'Improved Conversion Rates on Mobile',
      description: 'Mobile conversion rates have improved by 23% following recent UX optimizations. Desktop conversions remain stable.',
      confidence: 0.91,
      timestamp: new Date(Date.now() - 24 * 3600000),
      impact: 'medium'
    },
    {
      id: 'insight-6',
      type: 'anomaly',
      title: 'Cost Per Acquisition Spike',
      description: 'CPA increased by 18% on January 15-17. Investigation reveals correlation with increased competition in target keywords.',
      confidence: 0.87,
      timestamp: new Date(Date.now() - 36 * 3600000),
      impact: 'medium'
    }
  ];
};

export const generateReports = (): Report[] => {
  return [
    {
      id: 'report-1',
      title: 'Monthly Performance Report - December 2025',
      type: 'Monthly Summary',
      generatedAt: new Date('2026-01-05'),
      status: 'ready',
      downloadUrl: '#'
    },
    {
      id: 'report-2',
      title: 'Q4 2025 Analytics Overview',
      type: 'Quarterly Report',
      generatedAt: new Date('2026-01-10'),
      status: 'ready',
      downloadUrl: '#'
    },
    {
      id: 'report-3',
      title: 'Campaign Performance Analysis',
      type: 'Custom Report',
      generatedAt: new Date('2026-01-15'),
      status: 'ready',
      downloadUrl: '#'
    },
    {
      id: 'report-4',
      title: 'Weekly Analytics - Week 3',
      type: 'Weekly Report',
      generatedAt: new Date(),
      status: 'generating'
    },
    {
      id: 'report-5',
      title: 'Monthly Performance Report - January 2026',
      type: 'Monthly Summary',
      generatedAt: new Date('2026-02-01'),
      status: 'scheduled'
    }
  ];
};
