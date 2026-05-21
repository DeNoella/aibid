import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getContacts(organizationId: string, page = 1, limit = 20, search?: string, stage?: string) {
  const db = getDb();
  let where = 'WHERE c.organization_id = ?';
  const params: any[] = [organizationId];

  if (search) {
    where += " AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.job_title LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (stage) {
    where += ' AND c.lifecycle_stage = ?';
    params.push(stage);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM contacts c ${where}`).get(...params) as { count: number };
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT c.*, comp.name as company_name
    FROM contacts c
    LEFT JOIN companies comp ON c.company_id = comp.id
    ${where}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { contacts: rows, total: total.count, page, limit };
}

export function getContactById(id: string, organizationId: string) {
  const db = getDb();
  const contact = db.prepare(`
    SELECT c.*, comp.name as company_name
    FROM contacts c
    LEFT JOIN companies comp ON c.company_id = comp.id
    WHERE c.id = ? AND c.organization_id = ?
  `).get(id, organizationId);

  if (!contact) return null;

  const activities = db.prepare(`
    SELECT a.*, u.name as user_name
    FROM activities a
    JOIN users u ON a.user_id = u.id
    WHERE a.contact_id = ?
    ORDER BY a.created_at DESC
    LIMIT 10
  `).all(id);

  const deals = db.prepare(`
    SELECT d.*, ps.name as stage_name, ps.color as stage_color
    FROM deals d
    JOIN pipeline_stages ps ON d.stage_id = ps.id
    WHERE d.contact_id = ?
    ORDER BY d.created_at DESC
  `).all(id);

  return { ...(contact as any), activities, deals };
}

export function createContact(data: any, organizationId: string, userId: string) {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO contacts (id, organization_id, first_name, last_name, email, phone, job_title, lifecycle_stage, source, company_id, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, organizationId, data.firstName, data.lastName, data.email, data.phone, data.jobTitle, data.lifecycleStage || 'lead', data.source, data.companyId, data.notes, userId);

  db.prepare('INSERT INTO audit_logs (id, organization_id, user_id, user_name, action, module, details, entity_type, entity_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    uuid(), organizationId, userId, '', 'Created contact', 'CRM', `Created contact ${data.firstName} ${data.lastName}`, 'contact', id
  );

  return db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
}

export function updateContact(id: string, data: any, organizationId: string) {
  const db = getDb();
  db.prepare(`
    UPDATE contacts SET first_name = ?, last_name = ?, email = ?, phone = ?, job_title = ?,
    lifecycle_stage = ?, source = ?, company_id = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ? AND organization_id = ?
  `).run(data.firstName, data.lastName, data.email, data.phone, data.jobTitle, data.lifecycleStage, data.source, data.companyId, data.notes, id, organizationId);
  return db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
}

export function deleteContact(id: string, organizationId: string) {
  const db = getDb();
  db.prepare('DELETE FROM contacts WHERE id = ? AND organization_id = ?').run(id, organizationId);
}
