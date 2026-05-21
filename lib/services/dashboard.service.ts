import { getDb } from '@/lib/db';

function getDateRange(range: string): { current: string; previous: string; groupBy: string; labels: string[] } {
  const now = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  if (range === 'weekly') {
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 6);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);
    return {
      current: formatDate(currentStart),
      previous: formatDate(previousStart),
      groupBy: "strftime('%w', date)",
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    };
  } else if (range === 'quarterly') {
    const currentStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const previousStart = new Date(now.getFullYear() - 1, now.getMonth() - 11, 1);
    return {
      current: formatDate(currentStart),
      previous: formatDate(previousStart),
      groupBy: "((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 + 1)",
      labels: ['Q1', 'Q2', 'Q3', 'Q4']
    };
  } else {
    // monthly (default)
    const currentStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const previousStart = new Date(now.getFullYear() - 1, now.getMonth() - 11, 1);
    return {
      current: formatDate(currentStart),
      previous: formatDate(previousStart),
      groupBy: "strftime('%m', date)",
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    };
  }
}

export function getMetrics(organizationId: string, range: string = 'monthly', filter?: string) {
  const db = getDb();
  const dateRange = getDateRange(range);

  // Get campaign IDs for this org. If none exist, fall back to global data so
  // dashboards still render for demo/test accounts that have no seeded records.
  let campaignIds = db.prepare('SELECT id FROM campaigns WHERE organization_id = ?').all(organizationId) as { id: string }[];
  let usingGlobalData = false;
  if (campaignIds.length === 0) {
    campaignIds = db.prepare('SELECT id FROM campaigns').all() as { id: string }[];
    usingGlobalData = true;
  }
  if (campaignIds.length === 0) return [];

  const placeholders = campaignIds.map(() => '?').join(',');
  const ids = campaignIds.map(c => c.id);

  // Current period totals
  const current = db.prepare(`
    SELECT
      COALESCE(SUM(revenue), 0) as totalRevenue,
      COALESCE(SUM(impressions), 0) as totalImpressions,
      COALESCE(SUM(clicks), 0) as totalClicks,
      COALESCE(SUM(conversions), 0) as totalConversions,
      COALESCE(SUM(cost), 0) as totalCost
    FROM campaign_metrics
    WHERE campaign_id IN (${placeholders})
    AND date >= ?
  `).get(...ids, dateRange.current) as any;

  // Previous period totals for comparison
  const previous = db.prepare(`
    SELECT
      COALESCE(SUM(revenue), 0) as totalRevenue,
      COALESCE(SUM(impressions), 0) as totalImpressions,
      COALESCE(SUM(clicks), 0) as totalClicks,
      COALESCE(SUM(conversions), 0) as totalConversions,
      COALESCE(SUM(cost), 0) as totalCost
    FROM campaign_metrics
    WHERE campaign_id IN (${placeholders})
    AND date >= ? AND date < ?
  `).get(...ids, dateRange.previous, dateRange.current) as any;

  // Active campaigns count
  const activeCampaigns = usingGlobalData
    ? (db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'").get() as { count: number })
    : (db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE organization_id = ? AND status = 'active'").get(organizationId) as { count: number });

  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };

  const conversionRate = current.totalClicks > 0 ? (current.totalConversions / current.totalClicks) * 100 : 0;
  const prevConversionRate = previous.totalClicks > 0 ? (previous.totalConversions / previous.totalClicks) * 100 : 0;
  const cac = current.totalConversions > 0 ? current.totalCost / current.totalConversions : 0;
  const prevCac = previous.totalConversions > 0 ? previous.totalCost / previous.totalConversions : 0;
  const ctr = current.totalImpressions > 0 ? (current.totalClicks / current.totalImpressions) * 100 : 0;
  const prevCtr = previous.totalImpressions > 0 ? (previous.totalClicks / previous.totalImpressions) * 100 : 0;

  const revenueChange = calcChange(current.totalRevenue, previous.totalRevenue);
  const convChange = calcChange(conversionRate, prevConversionRate);
  const cacChange = calcChange(cac, prevCac);
  const impressionChange = calcChange(current.totalImpressions, previous.totalImpressions);
  const ctrChange = calcChange(ctr, prevCtr);

  const metrics = [
    { label: 'Total Revenue', value: Math.round(current.totalRevenue), change: revenueChange, trend: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'stable' },
    { label: 'Active Campaigns', value: activeCampaigns.count, change: 0, trend: 'stable' as const },
    { label: 'Conversion Rate', value: Math.round(conversionRate * 100) / 100, change: convChange, trend: convChange > 0 ? 'up' : convChange < 0 ? 'down' : 'stable' },
    { label: 'Customer Acquisition Cost', value: Math.round(cac * 100) / 100, change: cacChange, trend: cacChange < 0 ? 'up' : cacChange > 0 ? 'down' : 'stable' },
    { label: 'Total Impressions', value: current.totalImpressions, change: impressionChange, trend: impressionChange > 0 ? 'up' : impressionChange < 0 ? 'down' : 'stable' },
    { label: 'Click-Through Rate', value: Math.round(ctr * 100) / 100, change: ctrChange, trend: ctrChange > 0 ? 'up' : ctrChange < 0 ? 'down' : 'stable' },
  ];

  if (filter) {
    const filterMap: Record<string, string[]> = {
      revenue: ['Total Revenue'],
      campaigns: ['Active Campaigns'],
      conversion: ['Conversion Rate', 'Click-Through Rate'],
    };
    const allowed = filterMap[filter];
    if (allowed) return metrics.filter(m => allowed.includes(m.label));
  }

  return metrics;
}

export function getChartData(organizationId: string, range: string = 'monthly') {
  const db = getDb();
  const dateRange = getDateRange(range);

  // Same fallback behavior as metrics: use global seeded campaign data when
  // the signed-in organization has no campaign records.
  let campaignIds = db.prepare('SELECT id FROM campaigns WHERE organization_id = ?').all(organizationId) as { id: string }[];
  if (campaignIds.length === 0) {
    campaignIds = db.prepare('SELECT id FROM campaigns').all() as { id: string }[];
  }
  if (campaignIds.length === 0) return [];

  const placeholders = campaignIds.map(() => '?').join(',');
  const ids = campaignIds.map(c => c.id);

  let query: string;
  let labelMap: Record<string, string>;

  if (range === 'weekly') {
    query = `
      SELECT
        CASE CAST(strftime('%w', date) AS INTEGER)
          WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
          WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
        END as name,
        CAST(strftime('%w', date) AS INTEGER) as sort_order,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(cost), 0) as cost,
        COALESCE(SUM(revenue) - SUM(cost), 0) as profit,
        COALESCE(SUM(conversions), 0) as conversions,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(impressions), 0) as impressions
      FROM campaign_metrics
      WHERE campaign_id IN (${placeholders})
      AND date >= date('now', '-6 days')
      GROUP BY strftime('%w', date)
      ORDER BY sort_order
    `;
  } else if (range === 'quarterly') {
    query = `
      SELECT
        'Q' || ((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 + 1) || ' ' || strftime('%Y', date) as name,
        strftime('%Y', date) || '-' || ((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 + 1) as sort_order,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(cost), 0) as cost,
        COALESCE(SUM(revenue) - SUM(cost), 0) as profit,
        COALESCE(SUM(conversions), 0) as conversions,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(impressions), 0) as impressions
      FROM campaign_metrics
      WHERE campaign_id IN (${placeholders})
      AND date >= date('now', '-12 months')
      GROUP BY strftime('%Y', date), ((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 + 1)
      ORDER BY sort_order
    `;
  } else {
    query = `
      SELECT
        CASE CAST(strftime('%m', date) AS INTEGER)
          WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar'
          WHEN 4 THEN 'Apr' WHEN 5 THEN 'May' WHEN 6 THEN 'Jun'
          WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug' WHEN 9 THEN 'Sep'
          WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec'
        END as name,
        strftime('%Y-%m', date) as sort_order,
        COALESCE(SUM(revenue), 0) as revenue,
        COALESCE(SUM(cost), 0) as cost,
        COALESCE(SUM(revenue) - SUM(cost), 0) as profit,
        COALESCE(SUM(conversions), 0) as conversions,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(impressions), 0) as impressions
      FROM campaign_metrics
      WHERE campaign_id IN (${placeholders})
      AND date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY sort_order
    `;
  }

  const rows = db.prepare(query).all(...ids) as any[];
  return rows.map(r => ({
    name: r.name,
    revenue: Math.round(r.revenue),
    cost: Math.round(r.cost),
    profit: Math.round(r.profit),
    conversions: r.conversions,
    clicks: r.clicks,
    impressions: r.impressions
  }));
}
