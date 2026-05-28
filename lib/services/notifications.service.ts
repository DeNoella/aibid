import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import { EmailService } from '@/lib/services/email.service';
import { AppError } from '@/lib/validation';

export function getNotifications(userId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM notifications WHERE user_id = ? AND is_dismissed = 0 ORDER BY created_at DESC').all(userId);
}

export function getUnreadCount(userId: string): number {
  const db = getDb();
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0'
  ).get(userId) as { count: number };
  return row.count;
}

export function markAllRead(userId: string) {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
}

export function createNotification(
  orgId: string,
  userId: string,
  data: {
    priority: string;
    title: string;
    message: string;
    linkUrl?: string;
    senderUserId?: string | null;
    senderName?: string | null;
    category?: 'system' | 'message';
  }
) {
  const db = getDb();
  const id = uuid();
  db.prepare(
    'INSERT INTO notifications (id, user_id, organization_id, priority, title, message, link_url, sender_user_id, sender_name, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    userId,
    orgId,
    data.priority,
    data.title,
    data.message,
    data.linkUrl ?? null,
    data.senderUserId ?? null,
    data.senderName ?? null,
    data.category ?? 'system'
  );
  return id;
}

/**
 * Send a direct user-to-user message. Inserts an in-app notification
 * for each recipient and (best-effort) emails them in the background.
 * Works across organizations — any active AIBID user can be a recipient.
 */
export function sendDirectMessage(
  _orgIdIgnored: string,
  sender: { id: string; name: string },
  data: { recipientIds: string[]; subject: string; body: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }
): { delivered: number; recipients: { id: string; name: string }[] } {
  const subject = data.subject?.trim();
  const body = data.body?.trim();

  if (!subject) throw new AppError('Subject is required.');
  if (!body) throw new AppError('Message body is required.');
  if (!Array.isArray(data.recipientIds) || data.recipientIds.length === 0) {
    throw new AppError('Pick at least one recipient.');
  }
  if (subject.length > 200) throw new AppError('Subject must be 200 characters or fewer.');
  if (body.length > 5000) throw new AppError('Message must be 5000 characters or fewer.');

  const db = getDb();
  const placeholders = data.recipientIds.map(() => '?').join(',');
  const recipients = db.prepare(
    `SELECT id, name, email, organization_id FROM users
     WHERE is_active = 1 AND id != ? AND id IN (${placeholders})`
  ).all(sender.id, ...data.recipientIds) as {
    id: string;
    name: string;
    email: string;
    organization_id: string;
  }[];

  if (recipients.length === 0) {
    throw new AppError('No valid recipients found.', 400);
  }

  for (const r of recipients) {
    createNotification(r.organization_id, r.id, {
      priority: data.priority ?? 'MEDIUM',
      title: subject,
      message: body,
      linkUrl: '/notifications',
      senderUserId: sender.id,
      senderName: sender.name,
      category: 'message',
    });
    setImmediate(() => {
      EmailService.sendUserMessage(r.email, {
        fromName: sender.name,
        subject,
        body,
        linkUrl: '/notifications',
      }).catch(() => {
        // SMTP not configured or transient failure — in-app inbox still works.
      });
    });
  }

  return {
    delivered: recipients.length,
    recipients: recipients.map((r) => ({ id: r.id, name: r.name })),
  };
}

/**
 * Notify every admin in an organization both in-system and (best-effort)
 * via email. Email is dispatched asynchronously so callers never have to
 * await SMTP latency.
 */
export function notifyAdmins(
  orgId: string,
  data: { title: string; message: string; priority?: string; linkUrl?: string; actorName?: string; actionLabel?: string }
) {
  const db = getDb();
  const admins = db.prepare(
    "SELECT id, email FROM users WHERE organization_id = ? AND role = 'admin' AND is_active = 1"
  ).all(orgId) as { id: string; email: string }[];

  for (const admin of admins) {
    createNotification(orgId, admin.id, {
      priority: data.priority ?? 'MEDIUM',
      title: data.title,
      message: data.message,
      linkUrl: data.linkUrl,
    });
    // Best-effort email — fire and forget so the calling request stays fast.
    setImmediate(() => {
      EmailService.sendAdminAlert(admin.email, {
        title: data.title,
        message: data.message,
        actorName: data.actorName,
        actionLabel: data.actionLabel,
        linkUrl: data.linkUrl,
      }).catch(() => {
        // SMTP not configured or transient failure — swallow.
      });
    });
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
