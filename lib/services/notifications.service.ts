import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getNotifications(userId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM notifications WHERE user_id = ? AND is_dismissed = 0 ORDER BY created_at DESC').all(userId);
}

export function createNotification(orgId: string, userId: string, data: { priority: string; title: string; message: string; linkUrl?: string }) {
  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO notifications (id, user_id, organization_id, priority, title, message, link_url) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, userId, orgId, data.priority, data.title, data.message, data.linkUrl ?? null
  );
  return id;
}

export function notifyAdmins(orgId: string, data: { title: string; message: string; priority?: string }) {
  const db = getDb();
  const admins = db.prepare("SELECT id FROM users WHERE organization_id = ? AND role = 'admin'").all(orgId) as { id: string }[];
  for (const admin of admins) {
    createNotification(orgId, admin.id, { ...data, priority: data.priority ?? 'MEDIUM' });
  }
}

export function updateNotification(id: string, userId: string, updates: { isRead?: boolean; isDismissed?: boolean; needsFollowUp?: boolean }) {
  const db = getDb();
  if (updates.isRead !== undefined) db.prepare('UPDATE notifications SET is_read = ? WHERE id = ? AND user_id = ?').run(updates.isRead ? 1 : 0, id, userId);
  if (updates.isDismissed !== undefined) db.prepare('UPDATE notifications SET is_dismissed = ? WHERE id = ? AND user_id = ?').run(updates.isDismissed ? 1 : 0, id, userId);
  if (updates.needsFollowUp !== undefined) db.prepare('UPDATE notifications SET needs_follow_up = ? WHERE id = ? AND user_id = ?').run(updates.needsFollowUp ? 1 : 0, id, userId);
}

export function getAnalystAlertRules(analystId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM analyst_alert_rule WHERE analyst_id = ? ORDER BY created_at DESC').all(analystId);
}

export function createAnalystAlertRule(analystId: string, data: Record<string, unknown>) {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM analyst_alert_rule WHERE analyst_id = ?').get(analystId) as { count: number };
  if (count.count >= 10) throw new Error('Maximum 10 custom rules allowed');
  const id = uuid();
  db.prepare(`INSERT INTO analyst_alert_rule (rule_id, analyst_id, metric_name, condition_type, threshold_value, time_window, delivery_method) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, analystId, data.metricName, data.conditionType, data.thresholdValue, data.timeWindow, data.deliveryMethod
  );
  return id;
}

export function deleteAnalystAlertRule(ruleId: string, analystId: string) {
  const db = getDb();
  db.prepare('DELETE FROM analyst_alert_rule WHERE rule_id = ? AND analyst_id = ?').run(ruleId, analystId);
}

export function getFollowUpCount(userId: string) {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND needs_follow_up = 1 AND is_dismissed = 0').get(userId) as { count: number };
  return row.count;
}

export function getPinnedMetrics(userId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM pinned_metric WHERE user_id = ? ORDER BY display_order').all(userId);
}

export function togglePinnedMetric(userId: string, metricKey: string) {
  const db = getDb();
  const existing = db.prepare('SELECT pin_id FROM pinned_metric WHERE user_id = ? AND metric_key = ?').get(userId, metricKey);
  if (existing) {
    db.prepare('DELETE FROM pinned_metric WHERE user_id = ? AND metric_key = ?').run(userId, metricKey);
    return false;
  }
  const order = db.prepare('SELECT COALESCE(MAX(display_order), 0) + 1 as o FROM pinned_metric WHERE user_id = ?').get(userId) as { o: number };
  db.prepare('INSERT INTO pinned_metric (pin_id, user_id, metric_key, display_order) VALUES (?, ?, ?, ?)').run(uuid(), userId, metricKey, order.o);
  return true;
}
