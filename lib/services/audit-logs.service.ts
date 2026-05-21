import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getAuditLogs(organizationId: string, page = 1, limit = 20, search?: string, module?: string, userId?: string) {
  const db = getDb();
  let where = 'WHERE a.organization_id = ?';
  const params: any[] = [organizationId];

  if (search) {
    where += " AND (a.action LIKE ? OR a.details LIKE ? OR a.user_name LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (module) { where += ' AND a.module = ?'; params.push(module); }
  if (userId) { where += ' AND a.user_id = ?'; params.push(userId); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM audit_logs a ${where}`).get(...params) as { count: number };
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT a.* FROM audit_logs a
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { logs: rows, total: total.count, page, limit };
}

export function getAuditStats(organizationId: string) {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE organization_id = ?').get(organizationId) as { count: number };
  const today = db.prepare("SELECT COUNT(*) as count FROM audit_logs WHERE organization_id = ? AND date(created_at) = date('now')").get(organizationId) as { count: number };
  const activeUsers = db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE organization_id = ? AND created_at >= datetime('now', '-24 hours')").get(organizationId) as { count: number };
  const avgDaily = db.prepare(`
    SELECT COALESCE(AVG(cnt), 0) as avg FROM (
      SELECT COUNT(*) as cnt FROM audit_logs WHERE organization_id = ? GROUP BY date(created_at)
    )
  `).get(organizationId) as { avg: number };

  return {
    totalEvents: total.count,
    todayEvents: today.count,
    activeUsers: activeUsers.count,
    avgDaily: Math.round(avgDaily.avg)
  };
}

export function getAuditTimeline(organizationId: string, limit = 5) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM audit_logs
    WHERE organization_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(organizationId, limit);
}

export function createAuditLog(organizationId: string, userId: string, userName: string, action: string, module: string, details?: string, entityType?: string, entityId?: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_logs (id, organization_id, user_id, user_name, action, module, details, entity_type, entity_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuid(), organizationId, userId, userName, action, module, details, entityType, entityId);
}
