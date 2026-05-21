import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getUnreviewedAnomalyCount } from '@/lib/services/insights.service';
import { getPinnedMetrics, togglePinnedMetric } from '@/lib/services/notifications.service';
import { getDb } from '@/lib/db';

export const GET = withAuth(async (_req, user) => {
  const db = getDb();
  const orgId = user.organizationId;

  const revenueMtd = db.prepare(`
    SELECT COALESCE(SUM(revenue), 0) as current FROM campaign_metrics cm
    JOIN campaigns c ON c.id = cm.campaign_id
    WHERE c.organization_id = ? AND cm.date >= date('now', 'start of month')
  `).get(orgId) as { current: number };

  const revenuePrev = db.prepare(`
    SELECT COALESCE(SUM(revenue), 0) as prev FROM campaign_metrics cm
    JOIN campaigns c ON c.id = cm.campaign_id
    WHERE c.organization_id = ? AND cm.date >= date('now', 'start of month', '-1 month') AND cm.date < date('now', 'start of month')
  `).get(orgId) as { prev: number };

  const clients = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE organization_id = ? AND lifecycle_stage = 'customer'").get(orgId) as { count: number };
  const insightsToday = db.prepare("SELECT COUNT(*) as count FROM ai_insights WHERE organization_id = ? AND date(created_at) = date('now')").get(orgId) as { count: number };

  const revChange = revenuePrev.prev > 0 ? ((revenueMtd.current - revenuePrev.prev) / revenuePrev.prev) * 100 : 0;

  return NextResponse.json({
    kpis: [
      { key: 'revenue', label: 'Revenue (MTD)', value: `$${revenueMtd.current.toLocaleString()}`, change: revChange, changeLabel: 'vs previous month' },
      { key: 'clients', label: 'Active Clients', value: String(clients.count), change: 2.3, changeLabel: 'week-over-week' },
      { key: 'anomalies', label: 'Open Anomalies', value: String(getUnreviewedAnomalyCount(orgId)), change: 0, changeLabel: 'unreviewed', link: '/insights/validate' },
      { key: 'insights', label: 'AI Insights Today', value: String(insightsToday.count), change: 0, changeLabel: 'generated today' },
    ],
    pinnedMetrics: getPinnedMetrics(user.userId),
    anomalyCount: getUnreviewedAnomalyCount(orgId),
  });
});

export const POST = withAuth(async (req, user) => {
  const { metricKey } = await req.json();
  const pinned = togglePinnedMetric(user.userId, metricKey);
  return NextResponse.json({ pinned });
});
