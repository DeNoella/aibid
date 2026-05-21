import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getDeals(organizationId: string, page = 1, limit = 20, stageId?: string, ownerId?: string) {
  const db = getDb();
  let where = 'WHERE d.organization_id = ?';
  const params: any[] = [organizationId];

  if (stageId) { where += ' AND d.stage_id = ?'; params.push(stageId); }
  if (ownerId) { where += ' AND d.owner_id = ?'; params.push(ownerId); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM deals d ${where}`).get(...params) as { count: number };
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT d.*, ps.name as stage_name, ps.color as stage_color,
      c.first_name || ' ' || c.last_name as contact_name,
      comp.name as company_name, u.name as owner_name
    FROM deals d
    JOIN pipeline_stages ps ON d.stage_id = ps.id
    LEFT JOIN contacts c ON d.contact_id = c.id
    LEFT JOIN companies comp ON d.company_id = comp.id
    LEFT JOIN users u ON d.owner_id = u.id
    ${where}
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { deals: rows, total: total.count, page, limit };
}

export function getDealsPipeline(organizationId: string) {
  const db = getDb();
  const stages = db.prepare('SELECT * FROM pipeline_stages WHERE organization_id = ? ORDER BY position').all(organizationId) as any[];

  return stages.map(stage => {
    const deals = db.prepare(`
      SELECT d.*, c.first_name || ' ' || c.last_name as contact_name, comp.name as company_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      WHERE d.stage_id = ? AND d.organization_id = ?
      ORDER BY d.updated_at DESC
    `).all(stage.id, organizationId);
    return { ...stage, deals };
  });
}

export function getDealById(id: string, organizationId: string) {
  const db = getDb();
  const deal = db.prepare(`
    SELECT d.*, ps.name as stage_name, ps.color as stage_color,
      c.first_name || ' ' || c.last_name as contact_name, c.email as contact_email,
      comp.name as company_name, u.name as owner_name
    FROM deals d
    JOIN pipeline_stages ps ON d.stage_id = ps.id
    LEFT JOIN contacts c ON d.contact_id = c.id
    LEFT JOIN companies comp ON d.company_id = comp.id
    LEFT JOIN users u ON d.owner_id = u.id
    WHERE d.id = ? AND d.organization_id = ?
  `).get(id, organizationId);

  if (!deal) return null;

  const activities = db.prepare(`
    SELECT a.*, u.name as user_name FROM activities a
    JOIN users u ON a.user_id = u.id
    WHERE a.deal_id = ? ORDER BY a.created_at DESC LIMIT 10
  `).all(id);

  return { ...(deal as any), activities };
}

export function createDeal(data: any, organizationId: string, userId: string) {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO deals (id, organization_id, contact_id, company_id, stage_id, title, value, currency, expected_close_date, notes, owner_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, organizationId, data.contactId, data.companyId, data.stageId, data.title, data.value, data.currency || 'USD', data.expectedCloseDate, data.notes, data.ownerId || userId, userId);
  return getDealById(id, organizationId);
}

export function updateDeal(id: string, data: any, organizationId: string) {
  const db = getDb();
  db.prepare(`
    UPDATE deals SET contact_id = ?, company_id = ?, stage_id = ?, title = ?, value = ?,
    expected_close_date = ?, notes = ?, owner_id = ?, updated_at = datetime('now')
    WHERE id = ? AND organization_id = ?
  `).run(data.contactId, data.companyId, data.stageId, data.title, data.value, data.expectedCloseDate, data.notes, data.ownerId, id, organizationId);
  return getDealById(id, organizationId);
}

export function deleteDeal(id: string, organizationId: string) {
  const db = getDb();
  db.prepare('DELETE FROM deals WHERE id = ? AND organization_id = ?').run(id, organizationId);
}
