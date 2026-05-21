import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getReports(organizationId: string, status?: string) {
  const db = getDb();
  let where = 'WHERE r.organization_id = ?';
  const params: any[] = [organizationId];
  if (status) { where += ' AND r.status = ?'; params.push(status); }

  return db.prepare(`
    SELECT r.*, u.name as created_by_name
    FROM reports r
    LEFT JOIN users u ON r.created_by = u.id
    ${where}
    ORDER BY r.created_at DESC
  `).all(...params);
}

export function getReportById(id: string, organizationId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM reports WHERE id = ? AND organization_id = ?').get(id, organizationId);
}

export function createReport(data: any, organizationId: string, userId: string) {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO reports (id, organization_id, template_id, title, type, status, scheduled_at, config_json, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, organizationId, data.templateId, data.title, data.type, data.status || 'generating', data.scheduledAt, data.configJson, userId);

  // Simulate report generation completing after creation
  if (!data.scheduledAt) {
    setTimeout(() => {
      try {
        db.prepare("UPDATE reports SET status = 'ready', generated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);
      } catch { /* ignore if db closed */ }
    }, 3000);
  }

  return db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
}

export function getReportTemplates() {
  const db = getDb();
  return db.prepare('SELECT * FROM report_templates ORDER BY type').all();
}

export function getReportStats(organizationId: string) {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM reports WHERE organization_id = ?').get(organizationId) as { count: number };
  const thisMonth = db.prepare("SELECT COUNT(*) as count FROM reports WHERE organization_id = ? AND created_at >= date('now', 'start of month')").get(organizationId) as { count: number };
  const scheduled = db.prepare("SELECT COUNT(*) as count FROM reports WHERE organization_id = ? AND status = 'scheduled'").get(organizationId) as { count: number };
  const ready = db.prepare("SELECT COUNT(*) as count FROM reports WHERE organization_id = ? AND status = 'ready'").get(organizationId) as { count: number };

  return {
    total: total.count,
    thisMonth: thisMonth.count,
    scheduled: scheduled.count,
    downloaded: ready.count
  };
}
