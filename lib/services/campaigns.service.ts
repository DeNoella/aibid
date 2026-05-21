import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getCampaigns(organizationId: string, status?: string, page = 1, limit = 20) {
  const db = getDb();
  let where = 'WHERE c.organization_id = ?';
  const params: any[] = [organizationId];

  if (status) { where += ' AND c.status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM campaigns c ${where}`).get(...params) as { count: number };
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COALESCE(SUM(impressions), 0) FROM campaign_metrics WHERE campaign_id = c.id) as total_impressions,
      (SELECT COALESCE(SUM(clicks), 0) FROM campaign_metrics WHERE campaign_id = c.id) as total_clicks,
      (SELECT COALESCE(SUM(conversions), 0) FROM campaign_metrics WHERE campaign_id = c.id) as total_conversions,
      (SELECT COALESCE(SUM(revenue), 0) FROM campaign_metrics WHERE campaign_id = c.id) as total_revenue
    FROM campaigns c
    ${where}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { campaigns: rows, total: total.count, page, limit };
}

export function getCampaignById(id: string, organizationId: string) {
  const db = getDb();
  return db.prepare(`
    SELECT c.*,
      (SELECT COALESCE(SUM(impressions), 0) FROM campaign_metrics WHERE campaign_id = c.id) as total_impressions,
      (SELECT COALESCE(SUM(clicks), 0) FROM campaign_metrics WHERE campaign_id = c.id) as total_clicks,
      (SELECT COALESCE(SUM(conversions), 0) FROM campaign_metrics WHERE campaign_id = c.id) as total_conversions,
      (SELECT COALESCE(SUM(revenue), 0) FROM campaign_metrics WHERE campaign_id = c.id) as total_revenue
    FROM campaigns c
    WHERE c.id = ? AND c.organization_id = ?
  `).get(id, organizationId);
}

export function createCampaign(data: any, organizationId: string, userId: string) {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO campaigns (id, organization_id, name, type, status, budget, start_date, end_date, target_audience, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, organizationId, data.name, data.type, data.status || 'draft', data.budget || 0, data.startDate, data.endDate, data.targetAudience, data.notes, userId);
  return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
}

export function updateCampaign(id: string, data: any, organizationId: string) {
  const db = getDb();
  db.prepare(`
    UPDATE campaigns SET name = ?, type = ?, status = ?, budget = ?, start_date = ?, end_date = ?,
    target_audience = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ? AND organization_id = ?
  `).run(data.name, data.type, data.status, data.budget, data.startDate, data.endDate, data.targetAudience, data.notes, id, organizationId);
  return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
}

export function deleteCampaign(id: string, organizationId: string) {
  const db = getDb();
  db.prepare('DELETE FROM campaigns WHERE id = ? AND organization_id = ?').run(id, organizationId);
}

export function getCampaignMetrics(id: string, range: string = '30d') {
  const db = getDb();
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  return db.prepare(`
    SELECT date, impressions, clicks, conversions, revenue, cost
    FROM campaign_metrics
    WHERE campaign_id = ? AND date >= date('now', '-' || ? || ' days')
    ORDER BY date
  `).all(id, days);
}
