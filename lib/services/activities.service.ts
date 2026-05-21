import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getActivities(organizationId: string, contactId?: string, dealId?: string, type?: string, page = 1, limit = 20) {
  const db = getDb();
  let where = 'WHERE a.organization_id = ?';
  const params: any[] = [organizationId];

  if (contactId) { where += ' AND a.contact_id = ?'; params.push(contactId); }
  if (dealId) { where += ' AND a.deal_id = ?'; params.push(dealId); }
  if (type) { where += ' AND a.type = ?'; params.push(type); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM activities a ${where}`).get(...params) as { count: number };
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT a.*, u.name as user_name,
      c.first_name || ' ' || c.last_name as contact_name,
      d.title as deal_title
    FROM activities a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN contacts c ON a.contact_id = c.id
    LEFT JOIN deals d ON a.deal_id = d.id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { activities: rows, total: total.count, page, limit };
}

export function createActivity(data: any, organizationId: string, userId: string) {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO activities (id, organization_id, type, subject, description, contact_id, deal_id, company_id, user_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, organizationId, data.type, data.subject, data.description, data.contactId, data.dealId, data.companyId, userId, data.dueDate);
  return db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
}

export function updateActivity(id: string, data: any, organizationId: string) {
  const db = getDb();
  db.prepare(`
    UPDATE activities SET subject = ?, description = ?, is_completed = ?,
    completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END,
    updated_at = datetime('now')
    WHERE id = ? AND organization_id = ?
  `).run(data.subject, data.description, data.isCompleted ? 1 : 0, data.isCompleted ? 1 : 0, id, organizationId);
  return db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
}

export function deleteActivity(id: string, organizationId: string) {
  const db = getDb();
  db.prepare('DELETE FROM activities WHERE id = ? AND organization_id = ?').run(id, organizationId);
}
