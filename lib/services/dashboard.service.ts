import { getDb } from '@/lib/db';

type RangeInfo = {
  currentStart: string;
  previousStart: string;
  previousEnd: string;
  chartQuery: (placeholders: string) => string;
};

function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function buildRangeInfo(range: string, customStart?: string, customEnd?: string): RangeInfo {
  const now = new Date();

  if (range === 'today') {
    const todayStr = formatDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      currentStart: todayStr,
      previousStart: formatDate(yesterday),
      previousEnd: todayStr,
      chartQuery: (ph) => `
        SELECT
          strftime('%H:00', date) as name,
          strftime('%Y-%m-%dT%H', date) as sort_order,
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(cost), 0) as cost,
          COALESCE(SUM(revenue) - SUM(cost), 0) as profit,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(impressions), 0) as impressions
        FROM campaign_metrics
        WHERE campaign_id IN (${ph})
          AND date = date('now')
        GROUP BY strftime('%H', date)
        ORDER BY sort_order
      `,
    };
  }

  if (range === 'thisweek') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    return {
      currentStart: formatDate(weekStart),
      previousStart: formatDate(prevWeekStart),
      previousEnd: formatDate(weekStart),
      chartQuery: (ph) => `
        SELECT
          CASE CAST(strftime('%w', date) AS INTEGER)
            WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
            WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
          END as name,
          date as sort_order,
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(cost), 0) as cost,
          COALESCE(SUM(revenue) - SUM(cost), 0) as profit,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(impressions), 0) as impressions
        FROM campaign_metrics
        WHERE campaign_id IN (${ph})
          AND date >= date('now', 'weekday 1', '-7 days')
        GROUP BY date
        ORDER BY sort_order
      `,
    };
  }

  if (range === 'thismonth') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      currentStart: formatDate(monthStart),
      previousStart: formatDate(prevMonthStart),
      previousEnd: formatDate(monthStart),
      chartQuery: (ph) => `
        SELECT
          strftime('%d %b', date) as name,
          date as sort_order,
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(cost), 0) as cost,
          COALESCE(SUM(revenue) - SUM(cost), 0) as profit,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(impressions), 0) as impressions
        FROM campaign_metrics
        WHERE campaign_id IN (${ph})
          AND date >= date('now', 'start of month')
        GROUP BY date
        ORDER BY sort_order
      `,
    };
  }

  if (range === 'last3months') {
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    return {
      currentStart: formatDate(threeMonthsAgo),
      previousStart: formatDate(sixMonthsAgo),
      previousEnd: formatDate(threeMonthsAgo),
      chartQuery: (ph) => `
        SELECT
          CASE CAST(strftime('%m', date) AS INTEGER)
            WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar'
            WHEN 4 THEN 'Apr' WHEN 5 THEN 'May' WHEN 6 THEN 'Jun'
            WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug' WHEN 9 THEN 'Sep'
            WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec'
          END || ' ' || strftime('%Y', date) as name,
          strftime('%Y-%m', date) as sort_order,
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(cost), 0) as cost,
          COALESCE(SUM(revenue) - SUM(cost), 0) as profit,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(impressions), 0) as impressions
        FROM campaign_metrics
        WHERE campaign_id IN (${ph})
          AND date >= date('now', '-3 months')
        GROUP BY strftime('%Y-%m', date)
        ORDER BY sort_order
      `,
    };
  }

  if (range === 'custom' && customStart && customEnd) {
    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);
    const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - diffDays);
    return {
      currentStart: customStart,
      previousStart: formatDate(prevStart),
      previousEnd: customStart,
      chartQuery: (ph) => `
        SELECT
          strftime('%d %b', date) as name,
          date as sort_order,
          COALESCE(SUM(revenue), 0) as revenue,
          COALESCE(SUM(cost), 0) as cost,
          COALESCE(SUM(revenue) - SUM(cost), 0) as profit,
          COALESCE(SUM(conversions), 0) as conversions,
          COALESCE(SUM(clicks), 0) as clicks,
          COALESCE(SUM(impressions), 0) as impressions
        FROM campaign_metrics
        WHERE campaign_id IN (${ph})
          AND date >= '${customStart}' AND date <= '${customEnd}'
        GROUP BY date
        ORDER BY sort_order
      `,
    };
  }

  // Legacy: weekly
  if (range === 'weekly') {
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 6);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);
    return {
      currentStart: formatDate(currentStart),
      previousStart: formatDate(previousStart),
      previousEnd: formatDate(currentStart),
      chartQuery: (ph) => `
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
        WHERE campaign_id IN (${ph})
          AND date >= date('now', '-6 days')
        GROUP BY strftime('%w', date)
        ORDER BY sort_order
      `,
    };
  }

  // Legacy: quarterly
  if (range === 'quarterly') {
    const currentStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const previousStart = new Date(now.getFullYear() - 1, now.getMonth() - 11, 1);
    return {
      currentStart: formatDate(currentStart),
      previousStart: formatDate(previousStart),
      previousEnd: formatDate(currentStart),
      chartQuery: (ph) => `
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
        WHERE campaign_id IN (${ph})
          AND date >= date('now', '-12 months')
        GROUP BY strftime('%Y', date), ((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 + 1)
        ORDER BY sort_order
      `,
    };
  }

  // Default: monthly (last 12 months)
  const currentStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const previousStart = new Date(now.getFullYear() - 1, now.getMonth() - 11, 1);
  return {
    currentStart: formatDate(currentStart),
    previousStart: formatDate(previousStart),
    previousEnd: formatDate(currentStart),
    chartQuery: (ph) => `
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
      WHERE campaign_id IN (${ph})
        AND date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY sort_order
    `,
  };
}

export function getMetrics(
  organizationId: string,
  range: string = 'thismonth',
  filter?: string,
  customStart?: string,
  customEnd?: string,
) {
  const db = getDb();
  const info = buildRangeInfo(range, customStart, customEnd);

  let campaignIds = db.prepare('SELECT id FROM campaigns WHERE organization_id = ?').all(organizationId) as { id: string }[];
  let usingGlobalData = false;
  if (campaignIds.length === 0) {
    campaignIds = db.prepare('SELECT id FROM campaigns').all() as { id: string }[];
    usingGlobalData = true;
  }
  if (campaignIds.length === 0) return [];

  const placeholders = campaignIds.map(() => '?').join(',');
  const ids = campaignIds.map((c) => c.id);

  const current = db.prepare(`
    SELECT
      COALESCE(SUM(revenue), 0) as totalRevenue,
      COALESCE(SUM(impressions), 0) as totalImpressions,
      COALESCE(SUM(clicks), 0) as totalClicks,
      COALESCE(SUM(conversions), 0) as totalConversions,
      COALESCE(SUM(cost), 0) as totalCost
    FROM campaign_metrics
    WHERE campaign_id IN (${placeholders}) AND date >= ?
  `).get(...ids, info.currentStart) as Record<string, number>;

  const previous = db.prepare(`
    SELECT
      COALESCE(SUM(revenue), 0) as totalRevenue,
      COALESCE(SUM(impressions), 0) as totalImpressions,
      COALESCE(SUM(clicks), 0) as totalClicks,
      COALESCE(SUM(conversions), 0) as totalConversions,
      COALESCE(SUM(cost), 0) as totalCost
    FROM campaign_metrics
    WHERE campaign_id IN (${placeholders}) AND date >= ? AND date < ?
  `).get(...ids, info.previousStart, info.previousEnd) as Record<string, number>;

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
    if (allowed) return metrics.filter((m) => allowed.includes(m.label));
  }

  return metrics;
}

export function getChartData(
  organizationId: string,
  range: string = 'thismonth',
  customStart?: string,
  customEnd?: string,
) {
  const db = getDb();
  const info = buildRangeInfo(range, customStart, customEnd);

  let campaignIds = db.prepare('SELECT id FROM campaigns WHERE organization_id = ?').all(organizationId) as { id: string }[];
  if (campaignIds.length === 0) {
    campaignIds = db.prepare('SELECT id FROM campaigns').all() as { id: string }[];
  }
  if (campaignIds.length === 0) return [];

  const placeholders = campaignIds.map(() => '?').join(',');
  const ids = campaignIds.map((c) => c.id);

  const query = info.chartQuery(placeholders);
  const rows = db.prepare(query).all(...ids) as Record<string, unknown>[];

  return rows.map((r) => ({
    name: r.name as string,
    revenue: Math.round(r.revenue as number),
    cost: Math.round(r.cost as number),
    profit: Math.round(r.profit as number),
    conversions: r.conversions as number,
    clicks: r.clicks as number,
    impressions: r.impressions as number,
  }));
}

export function getDataSourceStats(organizationId: string) {
  const db = getDb();
  const totalRecords = db.prepare('SELECT COALESCE(SUM(record_count), 0) as total FROM data_sources WHERE organization_id = ?').get(organizationId) as { total: number };
  const sourceCount = db.prepare('SELECT COUNT(*) as count FROM data_sources WHERE organization_id = ?').get(organizationId) as { count: number };
  return {
    totalRecords: totalRecords.total,
    dataSources: sourceCount.count,
    processingQueue: Math.floor(Math.random() * 20) + 5,
    storageUsed: '2.4 GB',
  };
}
