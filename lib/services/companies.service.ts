import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getCompanies(organizationId: string, page = 1, limit = 20, search?: string) {
  const db = getDb();
  let where = 'WHERE c.organization_id = ?';
  const params: any[] = [organizationId];

  if (search) {
    where += " AND (c.name LIKE ? OR c.domain LIKE ? OR c.industry LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM companies c ${where}`).get(...params) as { count: number };
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM contacts WHERE company_id = c.id) as contact_count,
      (SELECT COUNT(*) FROM deals WHERE company_id = c.id) as deal_count,
      (SELECT COALESCE(SUM(value), 0) FROM deals WHERE company_id = c.id) as total_deal_value
    FROM companies c
    ${where}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { companies: rows, total: total.count, page, limit };
}

export function getCompanyById(id: string, organizationId: string) {
  const db = getDb();
  const company = db.prepare('SELECT * FROM companies WHERE id = ? AND organization_id = ?').get(id, organizationId);
  if (!company) return null;

  const contacts = db.prepare('SELECT * FROM contacts WHERE company_id = ? ORDER BY created_at DESC').all(id);
  const deals = db.prepare(`
    SELECT d.*, ps.name as stage_name, ps.color as stage_color
    FROM deals d JOIN pipeline_stages ps ON d.stage_id = ps.id
    WHERE d.company_id = ? ORDER BY d.created_at DESC
  `).all(id);

  return { ...(company as any), contacts, deals };
}

export function createCompany(data: any, organizationId: string, userId: string) {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO companies (id, organization_id, name, domain, industry, size, phone, address, city, country, website, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, organizationId, data.name, data.domain, data.industry, data.size, data.phone, data.address, data.city, data.country, data.website, data.notes, userId);
  return db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
}

export function updateCompany(id: string, data: any, organizationId: string) {
  const db = getDb();
  db.prepare(`
    UPDATE companies SET name = ?, domain = ?, industry = ?, size = ?, phone = ?,
    address = ?, city = ?, country = ?, website = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ? AND organization_id = ?
  `).run(data.name, data.domain, data.industry, data.size, data.phone, data.address, data.city, data.country, data.website, data.notes, id, organizationId);
  return db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
}

export function deleteCompany(id: string, organizationId: string) {
  const db = getDb();
  db.prepare('DELETE FROM companies WHERE id = ? AND organization_id = ?').run(id, organizationId);
}
