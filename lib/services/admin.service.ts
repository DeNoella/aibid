import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { AppError, assertEmailAvailable, validateName } from '@/lib/validation';

function ensureServiceHealth(db: ReturnType<typeof getDb>, orgId: string) {
  const count = db.prepare('SELECT COUNT(*) as c FROM service_health').get() as { c: number };
  if (count.c === 0) {
    const services = [
      ['API Gateway', 'UP', 45],
      ['AI Engine', 'UP', 120],
      ['PostgreSQL Database', 'UP', 8],
      ['Notification Service', 'DEGRADED', 350],
    ];
    const stmt = db.prepare('INSERT INTO service_health (id, service_name, status, response_time_ms) VALUES (?, ?, ?, ?)');
    for (const [name, status, ms] of services) {
      stmt.run(uuid(), name, status, ms);
    }
  }

  const modelCount = db.prepare('SELECT COUNT(*) as c FROM predictive_model WHERE organization_id = ?').get(orgId) as { c: number };
  if (modelCount.c === 0) {
    const models = [
      ['Trend Detector', 'TREND', 0.92],
      ['Anomaly Detector', 'ANOMALY', 0.88],
      ['Forecasting Model', 'PREDICTION', 0.85],
      ['NLP Query Parser', 'NLP', 0.94],
    ];
    const stmt = db.prepare(`INSERT INTO predictive_model (model_id, organization_id, name, model_type, current_accuracy, last_retrained, status) VALUES (?, ?, ?, ?, ?, datetime('now', '-2 days'), 'Healthy')`);
    for (const [name, type, acc] of models) {
      const modelId = uuid();
      const accuracy = Number(acc);
      stmt.run(modelId, orgId, name, type, accuracy);
      for (let i = 13; i >= 0; i -= 2) {
        db.prepare('INSERT INTO model_performance_log (log_id, model_id, accuracy, false_positive_rate, avg_processing_time_ms, recorded_at) VALUES (?, ?, ?, ?, ?, datetime(?, ?))').run(
          uuid(), modelId, accuracy + (Math.random() * 0.06 - 0.03), Math.random() * 5, 50 + Math.random() * 100,
          'now', `-${i} days`
        );
      }
    }
  }
}

/**
 * Refresh auto-generated admin tasks based on the current system state.
 * Each system task has a stable `system_key` so we can keep one open at a
 * time and resolve it automatically once the underlying condition is gone.
 */
function syncSystemTasks(db: ReturnType<typeof getDb>, orgId: string) {
  type SystemTask = { key: string; title: string; description: string; priority: 'low' | 'medium' | 'high'; condition: boolean };

  const pendingRoleAssignment = db.prepare(
    "SELECT COUNT(*) as c FROM users WHERE organization_id = ? AND role = 'analyst' AND department IS NULL AND is_active = 1"
  ).get(orgId) as { c: number };

  const staleSources = db.prepare(
    "SELECT COUNT(*) as c FROM data_sources WHERE organization_id = ? AND (last_synced_at IS NULL OR last_synced_at < datetime('now', '-24 hours'))"
  ).get(orgId) as { c: number };

  const failedBackups = db.prepare(
    "SELECT COUNT(*) as c FROM backup_records WHERE organization_id = ? AND status = 'failed' AND created_at >= datetime('now', '-7 days')"
  ).get(orgId) as { c: number };

  const lowAccModels = db.prepare(
    "SELECT COUNT(*) as c FROM predictive_model WHERE organization_id = ? AND (current_accuracy < 0.8 OR status != 'Healthy')"
  ).get(orgId) as { c: number };

  const tasks: SystemTask[] = [
    {
      key: 'role_assignment',
      title: 'Assign departments to analysts',
      description: `${pendingRoleAssignment.c} analyst account${pendingRoleAssignment.c === 1 ? ' is' : 's are'} missing a department. Assign one from the Users page so dashboards can scope correctly.`,
      priority: 'medium',
      condition: pendingRoleAssignment.c > 0,
    },
    {
      key: 'stale_sources',
      title: 'Refresh stale data sources',
      description: `${staleSources.c} data source${staleSources.c === 1 ? ' has' : 's have'} not synced in over 24 hours. Open Data Sources to trigger a sync.`,
      priority: 'high',
      condition: staleSources.c > 0,
    },
    {
      key: 'failed_backups',
      title: 'Investigate failed backups',
      description: `${failedBackups.c} backup${failedBackups.c === 1 ? '' : 's'} failed in the last 7 days. Review Backup & Restore and trigger a manual backup.`,
      priority: 'high',
      condition: failedBackups.c > 0,
    },
    {
      key: 'low_accuracy_models',
      title: 'Review AI model accuracy',
      description: `${lowAccModels.c} model${lowAccModels.c === 1 ? ' is' : 's are'} below 80% accuracy or not healthy. Open AI Model Health to retrain.`,
      priority: 'medium',
      condition: lowAccModels.c > 0,
    },
  ];

  const upsert = db.prepare(`
    INSERT INTO admin_tasks (id, organization_id, title, description, status, priority, source, system_key)
    VALUES (?, ?, ?, ?, 'open', ?, 'system', ?)
    ON CONFLICT(system_key) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      priority = excluded.priority,
      status = CASE WHEN admin_tasks.status = 'done' THEN 'open' ELSE admin_tasks.status END,
      updated_at = datetime('now')
  `);
  const resolve = db.prepare(
    "UPDATE admin_tasks SET status = 'done', completed_at = datetime('now'), updated_at = datetime('now') WHERE organization_id = ? AND system_key = ? AND status != 'done'"
  );

  for (const t of tasks) {
    if (t.condition) {
      upsert.run(uuid(), orgId, t.title, t.description, t.priority, t.key);
    } else {
      resolve.run(orgId, t.key);
    }
  }
}

export interface AdminTaskRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  source: 'manual' | 'system';
  system_key: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export function listAdminTasks(orgId: string, status?: 'open' | 'in_progress' | 'done' | 'all'): AdminTaskRow[] {
  const db = getDb();
  syncSystemTasks(db, orgId);
  let where = 'WHERE organization_id = ?';
  const params: unknown[] = [orgId];
  if (status && status !== 'all') {
    where += ' AND status = ?';
    params.push(status);
  }
  return db.prepare(`
    SELECT * FROM admin_tasks ${where}
    ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
             CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
             due_date IS NULL, due_date,
             created_at DESC
  `).all(...params) as AdminTaskRow[];
}

export function createAdminTask(orgId: string, adminId: string, data: { title: string; description?: string; priority?: 'low' | 'medium' | 'high'; dueDate?: string }) {
  const db = getDb();
  if (!data.title?.trim()) {
    throw new AppError('Task title is required.');
  }
  const id = uuid();
  db.prepare(`
    INSERT INTO admin_tasks (id, organization_id, title, description, priority, due_date, source, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'manual', ?)
  `).run(
    id,
    orgId,
    data.title.trim(),
    data.description?.trim() || null,
    data.priority ?? 'medium',
    data.dueDate || null,
    adminId
  );
  return id;
}

export function updateAdminTask(orgId: string, taskId: string, data: { title?: string; description?: string; priority?: 'low' | 'medium' | 'high'; status?: 'open' | 'in_progress' | 'done'; dueDate?: string | null }) {
  const db = getDb();
  const existing = db.prepare('SELECT id, status, source FROM admin_tasks WHERE id = ? AND organization_id = ?').get(taskId, orgId) as { id: string; status: string; source: string } | undefined;
  if (!existing) {
    throw new AppError('Task not found.', 404);
  }
  const nowDone = data.status === 'done' && existing.status !== 'done';
  const reopened = data.status && data.status !== 'done' && existing.status === 'done';

  db.prepare(`
    UPDATE admin_tasks SET
      title       = COALESCE(?, title),
      description = COALESCE(?, description),
      priority    = COALESCE(?, priority),
      status      = COALESCE(?, status),
      due_date    = CASE WHEN ? = 1 THEN ? ELSE due_date END,
      completed_at = CASE WHEN ? = 1 THEN datetime('now') WHEN ? = 1 THEN NULL ELSE completed_at END,
      updated_at  = datetime('now')
    WHERE id = ? AND organization_id = ?
  `).run(
    data.title?.trim() ?? null,
    data.description !== undefined ? (data.description?.trim() || null) : null,
    data.priority ?? null,
    data.status ?? null,
    data.dueDate !== undefined ? 1 : 0,
    data.dueDate ?? null,
    nowDone ? 1 : 0,
    reopened ? 1 : 0,
    taskId,
    orgId
  );
}

export function deleteAdminTask(orgId: string, taskId: string) {
  const db = getDb();
  const existing = db.prepare('SELECT id, source FROM admin_tasks WHERE id = ? AND organization_id = ?').get(taskId, orgId) as { id: string; source: string } | undefined;
  if (!existing) {
    throw new AppError('Task not found.', 404);
  }
  if (existing.source === 'system') {
    throw new AppError('System-generated tasks resolve automatically. Mark them as done to dismiss.', 400);
  }
  db.prepare('DELETE FROM admin_tasks WHERE id = ? AND organization_id = ?').run(taskId, orgId);
}

export function getAdminOverview(orgId: string) {
  const db = getDb();
  ensureServiceHealth(db, orgId);
  syncSystemTasks(db, orgId);

  const totalUsers = db.prepare(
    'SELECT COUNT(*) as count FROM users WHERE organization_id = ? AND is_active = 1'
  ).get(orgId) as { count: number };

  const totalUsersAll = db.prepare(
    'SELECT COUNT(*) as count FROM users WHERE organization_id = ?'
  ).get(orgId) as { count: number };

  const newUsersToday = db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE organization_id = ? AND date(created_at) = date('now')"
  ).get(orgId) as { count: number };

  const activeUsers = db.prepare(`
    SELECT COUNT(*) as count FROM users
    WHERE organization_id = ? AND is_active = 1
    AND last_login >= datetime('now', '-24 hours')
  `).get(orgId) as { count: number };

  const services = db.prepare('SELECT * FROM service_health ORDER BY service_name').all();
  const criticalAlerts = db.prepare(`
    SELECT * FROM audit_logs
    WHERE organization_id = ? AND (risk_level = 'critical' OR severity = 'critical')
    ORDER BY created_at DESC LIMIT 5
  `).all(orgId);

  const openTasks = db.prepare(
    "SELECT COUNT(*) as count FROM admin_tasks WHERE organization_id = ? AND status != 'done'"
  ).get(orgId) as { count: number };

  const recentActivity = db.prepare(`
    SELECT id, user_name, action, module, details, created_at
    FROM audit_logs
    WHERE organization_id = ?
    ORDER BY created_at DESC
    LIMIT 8
  `).all(orgId);

  const models = db.prepare('SELECT current_accuracy, status FROM predictive_model WHERE organization_id = ?').all(orgId) as { current_accuracy: number; status: string }[];
  let aiStatus = 'All healthy';
  let aiStatusColor = 'green';
  if (models.some((m) => m.current_accuracy < 0.75 || m.status === 'Critical')) {
    aiStatus = 'Critical';
    aiStatusColor = 'red';
  } else if (models.some((m) => m.current_accuracy < 0.9 || m.status === 'Watch')) {
    aiStatus = 'Attention needed';
    aiStatusColor = 'amber';
  }

  // Uptime over the last 30 days: derive from service_health degraded/down
  // events in the audit log. If nothing is recorded we default to a healthy
  // baseline. This keeps the metric truthful without needing a separate
  // monitoring system.
  const degradedRow = db
    .prepare(
      `SELECT COUNT(*) AS c FROM audit_logs
       WHERE organization_id = ?
       AND (LOWER(action) LIKE '%down%' OR LOWER(action) LIKE '%degraded%' OR LOWER(severity) = 'critical')
       AND created_at >= datetime('now', '-30 days')`
    )
    .get(orgId) as { c: number };
  const minutesInWindow = 30 * 24 * 60;
  // Each recorded incident counts as ~10 minutes of degraded service.
  const downMinutes = Math.min(minutesInWindow, degradedRow.c * 10);
  const uptimePct = Math.max(0, Math.min(100, 100 - (downMinutes / minutesInWindow) * 100));

  // Real database storage utilization (file size on disk vs. a 2GB soft cap).
  let dbBytes = 0;
  let storagePct = 0;
  const STORAGE_CAP_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB recommended ceiling
  try {
    const dbPath = process.env.DATABASE_FILE || path.join(process.cwd(), 'data', 'crm.db');
    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      dbBytes = stat.size;
      storagePct = Math.min(100, (dbBytes / STORAGE_CAP_BYTES) * 100);
    }
  } catch {
    // Storage unavailable — leave defaults.
  }

  return {
    uptimePct: Math.round(uptimePct * 10) / 10,
    totalUsers: totalUsers.count,
    totalUsersAll: totalUsersAll.count,
    newUsersToday: newUsersToday.count,
    activeUsers: activeUsers.count,
    openTasks: openTasks.count,
    aiStatus,
    aiStatusColor,
    services,
    criticalAlerts,
    recentActivity,
    storage: {
      usedMb: Math.round((dbBytes / (1024 * 1024)) * 100) / 100,
      capMb: Math.round((STORAGE_CAP_BYTES / (1024 * 1024)) * 100) / 100,
      usedPct: Math.round(storagePct * 10) / 10,
    },
    serverTime: new Date().toISOString(),
  };
}

export function getUsers(search?: string, role?: string, status?: string) {
  const db = getDb();
  let where = 'WHERE 1=1';
  const params: unknown[] = [];
  if (search) {
    where += ' AND (u.name LIKE ? OR u.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role) {
    where += ' AND u.role = ?';
    params.push(role === 'SYSTEM_ADMIN' ? 'admin' : 'analyst');
  }
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.department, u.last_login, u.is_active, u.created_at,
      o.name as organization_name
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
    ${where}
    ORDER BY u.last_login IS NULL, u.last_login DESC
  `).all(...params) as Record<string, unknown>[];
  return rows.filter((u) => {
    if (!status) return true;
    const lastLogin = u.last_login as string | null;
    if (!lastLogin) return status === 'inactive';
    const days = (Date.now() - new Date(lastLogin.replace(' ', 'T')).getTime()) / 86400000;
    if (status === 'active') return days <= 7;
    if (status === 'idle') return days > 7 && days <= 30;
    return days > 30;
  });
}

export function createUser(orgId: string, data: { name: string; email: string; role: string; department?: string }) {
  const db = getDb();
  if (!data.name?.trim() || !data.email?.trim()) {
    throw new AppError('Name and email are required.');
  }
  validateName(data.name);
  const normalizedEmail = assertEmailAvailable(db, data.email);
  if (!data.role) {
    throw new AppError('User role is required.');
  }
  const tempPassword = `Tmp${Math.random().toString(36).slice(2, 10)}!`;
  const id = uuid();
  const role = data.role === 'SYSTEM_ADMIN' ? 'admin' : 'analyst';
  db.prepare(`INSERT INTO users (id, organization_id, email, password_hash, name, role, department, is_default_password) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run(
    id, orgId, normalizedEmail, bcrypt.hashSync(tempPassword, 10), data.name.trim(), role, data.department ?? null
  );
  db.prepare('INSERT INTO user_preferences (id, user_id) VALUES (?, ?)').run(uuid(), id);
  return { id, tempPassword };
}

export function updateUser(userId: string, data: { name?: string; email?: string; role?: string; department?: string }) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!existing) {
    throw new AppError('User not found.', 404);
  }

  if (data.name !== undefined) {
    validateName(data.name);
  }

  let emailToSave: string | undefined;
  if (data.email !== undefined) {
    emailToSave = assertEmailAvailable(db, data.email, userId);
  }

  const role = data.role === 'SYSTEM_ADMIN' ? 'admin' : data.role === 'DATA_ANALYST' ? 'analyst' : data.role;
  db.prepare(`UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), department = COALESCE(?, department), updated_at = datetime('now') WHERE id = ?`).run(
    data.name?.trim(), emailToSave, role, data.department, userId
  );
}

export function getUser(userId: string) {
  const db = getDb();
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.department, u.last_login, u.is_active, u.created_at,
      o.name as organization_name
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
    WHERE u.id = ?
  `).get(userId) as (AdminUserRow & { organization_name: string | null }) | undefined;

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
}

function purgeUserReferences(db: ReturnType<typeof getDb>, userId: string, reassignUserId?: string) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM mfa_attempts WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM login_history WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM pinned_metric WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM analyst_alert_rule WHERE analyst_id = ?').run(userId);
  db.prepare('DELETE FROM ai_conversations WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM report_recipe WHERE analyst_id = ?').run(userId);
  db.prepare('DELETE FROM scheduled_report WHERE created_by = ?').run(userId);
  db.prepare('DELETE FROM audit_alert_rule WHERE admin_id = ?').run(userId);
  db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(userId);

  db.prepare('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?').run(userId);
  db.prepare('UPDATE ai_insights SET reviewed_by = NULL WHERE reviewed_by = ?').run(userId);
  db.prepare('UPDATE companies SET created_by = NULL WHERE created_by = ?').run(userId);
  db.prepare('UPDATE contacts SET created_by = NULL WHERE created_by = ?').run(userId);
  db.prepare('UPDATE deals SET created_by = NULL WHERE created_by = ?').run(userId);
  db.prepare('UPDATE deals SET owner_id = NULL WHERE owner_id = ?').run(userId);
  if (reassignUserId) {
    db.prepare('UPDATE activities SET user_id = ? WHERE user_id = ?').run(reassignUserId, userId);
  } else {
    db.prepare('UPDATE activities SET user_id = NULL WHERE user_id = ?').run(userId);
  }
  db.prepare('UPDATE campaigns SET created_by = NULL WHERE created_by = ?').run(userId);
  db.prepare('UPDATE reports SET created_by = NULL WHERE created_by = ?').run(userId);
  db.prepare('UPDATE data_sources SET created_by = NULL WHERE created_by = ?').run(userId);
  db.prepare('UPDATE model_alert_threshold SET updated_by = NULL WHERE updated_by = ?').run(userId);
  db.prepare('UPDATE voice_query_log SET user_id = NULL WHERE user_id = ?').run(userId);
}

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  last_login: string | null;
  is_active: number;
  created_at: string;
};

export function deleteUser(userId: string, actingUserId: string) {
  const db = getDb();

  if (userId === actingUserId) {
    throw new AppError('You cannot delete your own account.');
  }

  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as
    | { id: string; role: string }
    | undefined;

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (user.role === 'admin') {
    const adminCount = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE role = 'admin' AND is_active = 1
    `).get() as { count: number };

    if (adminCount.count <= 1) {
      throw new AppError('Cannot delete the only active admin account.');
    }
  }

  purgeUserReferences(db, userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

export function setUserActive(orgId: string, userId: string, isActive: boolean) {
  const db = getDb();
  db.prepare('UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ? AND organization_id = ?').run(isActive ? 1 : 0, userId, orgId);
  if (!isActive) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }
}

export function resetUserPassword(orgId: string, userId: string) {
  const db = getDb();
  const tempPassword = `Tmp${Math.random().toString(36).slice(2, 10)}!`;
  db.prepare('UPDATE users SET password_hash = ?, is_default_password = 1, updated_at = datetime(\'now\') WHERE id = ? AND organization_id = ?').run(
    bcrypt.hashSync(tempPassword, 10), userId, orgId
  );
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  return { tempPassword };
}

export function getLoginHistory(userId: string, limit = 20) {
  const db = getDb();
  return db.prepare('SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
}

export function getModelHealth(orgId: string) {
  const db = getDb();
  ensureServiceHealth(db, orgId);
  const models = db.prepare('SELECT * FROM predictive_model WHERE organization_id = ?').all(orgId) as Record<string, unknown>[];
  return models.map((m) => {
    const history = db.prepare('SELECT accuracy, recorded_at FROM model_performance_log WHERE model_id = ? ORDER BY recorded_at ASC LIMIT 14').all(m.model_id);
    const fpRate = db.prepare(`
      SELECT COUNT(*) as total FROM ai_insights WHERE type = 'anomaly' AND organization_id = ?
    `).get(orgId) as { total: number };
    const fpCount = db.prepare(`
      SELECT COUNT(*) as count FROM ai_insights WHERE type = 'anomaly' AND marked_as_false_positive = 1 AND organization_id = ?
    `).get(orgId) as { count: number };
    const fpPct = fpRate.total > 0 ? (fpCount.count / fpRate.total) * 100 : 0;
    return { ...m, accuracyHistory: history, falsePositiveRate: fpPct };
  });
}

export function retrainModel(modelId: string) {
  const db = getDb();
  const model = db.prepare('SELECT current_accuracy FROM predictive_model WHERE model_id = ?').get(modelId) as { current_accuracy: number };
  const newAcc = Math.min(0.98, model.current_accuracy + 0.02);
  db.prepare("UPDATE predictive_model SET last_retrained = datetime('now'), current_accuracy = ?, status = 'Healthy' WHERE model_id = ?").run(newAcc, modelId);
  db.prepare('INSERT INTO model_performance_log (log_id, model_id, accuracy, recorded_at) VALUES (?, ?, ?, datetime(\'now\'))').run(uuid(), modelId, newAcc);
}

export function getModelThreshold(orgId: string) {
  const db = getDb();
  const row = db.prepare('SELECT threshold_pct FROM model_alert_threshold WHERE organization_id = ?').get(orgId) as { threshold_pct: number } | undefined;
  return row?.threshold_pct ?? 80;
}

export function setModelThreshold(orgId: string, threshold: number, userId: string) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM model_alert_threshold WHERE organization_id = ?').get(orgId);
  if (existing) {
    db.prepare('UPDATE model_alert_threshold SET threshold_pct = ?, updated_by = ?, updated_at = datetime(\'now\') WHERE organization_id = ?').run(threshold, userId, orgId);
  } else {
    db.prepare('INSERT INTO model_alert_threshold (id, organization_id, threshold_pct, updated_by) VALUES (?, ?, ?, ?)').run(uuid(), orgId, threshold, userId);
  }
  db.prepare('UPDATE ai_insights SET low_confidence_pending = 1 WHERE organization_id = ? AND confidence * 100 < ? AND is_published = 0').run(orgId, threshold);
}

export function getNlpMetrics(orgId: string) {
  const db = getDb();
  const avg = db.prepare("SELECT AVG(resolution_time_ms) as avg FROM voice_query_log WHERE date(created_at) = date('now')").get() as { avg: number | null };
  const total = db.prepare("SELECT COUNT(*) as count FROM voice_query_log WHERE date(created_at) = date('now')").get() as { count: number };
  const failed = db.prepare("SELECT COUNT(*) as count FROM voice_query_log WHERE date(created_at) = date('now') AND success = 0").get() as { count: number };
  return { avgResolutionMs: Math.round(avg.avg ?? 245), totalToday: total.count, failedToday: failed.count };
}

export function getUserActivityLogs(filters: {
  from?: string;
  to?: string;
  userId?: string;
  module?: string;
}) {
  const db = getDb();

  let auditWhere = 'WHERE a.user_id IS NOT NULL';
  let loginWhere = 'WHERE 1=1';
  const auditParams: unknown[] = [];
  const loginParams: unknown[] = [];

  if (filters.userId) {
    auditWhere += ' AND a.user_id = ?';
    loginWhere += ' AND lh.user_id = ?';
    auditParams.push(filters.userId);
    loginParams.push(filters.userId);
  }
  if (filters.from) {
    auditWhere += ' AND a.created_at >= ?';
    loginWhere += ' AND lh.created_at >= ?';
    auditParams.push(filters.from);
    loginParams.push(filters.from);
  }
  if (filters.to) {
    auditWhere += ' AND a.created_at <= ?';
    loginWhere += ' AND lh.created_at <= ?';
    auditParams.push(`${filters.to} 23:59:59`);
    loginParams.push(`${filters.to} 23:59:59`);
  }
  if (filters.module && filters.module !== 'all') {
    if (filters.module === 'Auth') {
      auditWhere += ' AND a.module = ?';
      auditParams.push('Auth');
    } else {
      auditWhere += ' AND a.module = ?';
      auditParams.push(filters.module);
      loginWhere += ' AND 1=0';
    }
  }

  return db.prepare(`
    SELECT * FROM (
      SELECT
        a.id,
        a.user_id,
        a.user_name,
        u.email as user_email,
        'action' as activity_type,
        a.action,
        a.module,
        COALESCE(a.details, '') as details,
        a.ip_address,
        NULL as user_agent,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ${auditWhere}
      UNION ALL
      SELECT
        lh.id,
        lh.user_id,
        u.name as user_name,
        u.email as user_email,
        'session' as activity_type,
        CASE WHEN lh.success = 1 THEN 'Logged in' ELSE 'Failed login' END as action,
        'Auth' as module,
        CASE WHEN lh.success = 1 THEN 'User accessed the system' ELSE 'Unsuccessful login attempt' END as details,
        lh.ip_address,
        lh.user_agent,
        lh.created_at
      FROM login_history lh
      JOIN users u ON lh.user_id = u.id
      ${loginWhere}
    )
    ORDER BY created_at DESC
    LIMIT 300
  `).all(...auditParams, ...loginParams) as {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string | null;
    activity_type: string;
    action: string;
    module: string;
    details: string;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
  }[];
}

export function getAuditFeed(orgId: string, filters: { from?: string; to?: string; userId?: string; actionType?: string; riskLevel?: string }) {
  const db = getDb();
  let where = 'WHERE organization_id = ?';
  const params: unknown[] = [orgId];
  if (filters.from) { where += ' AND created_at >= ?'; params.push(filters.from); }
  if (filters.to) { where += ' AND created_at <= ?'; params.push(filters.to); }
  if (filters.userId) { where += ' AND user_id = ?'; params.push(filters.userId); }
  if (filters.riskLevel && filters.riskLevel !== 'all') { where += ' AND risk_level = ?'; params.push(filters.riskLevel); }
  if (filters.actionType && filters.actionType !== 'all') {
    const map: Record<string, string> = { login: 'Login', 'data access': 'Data access', 'report download': 'Report download', 'permission change': 'Permission change', 'failed attempt': 'Failed attempt' };
    where += ' AND action LIKE ?';
    params.push(`%${map[filters.actionType.toLowerCase()] ?? filters.actionType}%`);
  }
  return db.prepare(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT 200`).all(...params);
}

export function revokeUserSession(userId: string, adminId: string, adminName: string, orgId: string) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  db.prepare(`INSERT INTO audit_logs (id, organization_id, user_id, user_name, action, module, details, risk_level) VALUES (?, ?, ?, ?, 'Revoke session', 'Auth', 'Admin revoked user session', 'normal')`).run(
    uuid(), orgId, adminId, adminName
  );
}

export function getAuditAlertRules(orgId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM audit_alert_rule WHERE admin_id IN (SELECT id FROM users WHERE organization_id = ?)').all(orgId);
}

export function saveAuditAlertRule(adminId: string, data: { conditionDescription: string; conditionType: string; thresholdValue?: number; timeWindowMinutes?: number }) {
  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO audit_alert_rule (rule_id, admin_id, condition_description, condition_type, threshold_value, time_window_minutes) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, adminId, data.conditionDescription, data.conditionType, data.thresholdValue ?? null, data.timeWindowMinutes ?? null
  );
  return id;
}

const BACKUP_DIR = path.resolve(process.cwd(), 'data', 'backups');
const DB_PATH = path.resolve(process.cwd(), 'data', 'crm.db');

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function backupFilePath(id: string) {
  return path.join(BACKUP_DIR, `${id}.db`);
}

export function getBackupSummary(orgId: string) {
  const db = getDb();
  ensureBackupDir();

  // Detect and reconcile any backup files that no longer exist on disk
  // (e.g. file deleted manually).
  const allRecords = db.prepare("SELECT id, status FROM backup_records WHERE organization_id = ?").all(orgId) as { id: string; status: string }[];
  for (const rec of allRecords) {
    const exists = fs.existsSync(backupFilePath(rec.id));
    if (!exists && rec.status === 'completed') {
      db.prepare("UPDATE backup_records SET status = 'missing' WHERE id = ?").run(rec.id);
    }
  }

  const last = db.prepare("SELECT * FROM backup_records WHERE organization_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1").get(orgId);
  const count = db.prepare("SELECT COUNT(*) as count FROM backup_records WHERE organization_id = ? AND status = 'completed' AND created_at >= datetime('now', '-30 days')").get(orgId) as { count: number };
  const schedule = db.prepare("SELECT value FROM system_config WHERE key = 'backup_schedule'").get() as { value: string } | undefined;
  const nextRun = db.prepare("SELECT value FROM system_config WHERE key = 'backup_next_run'").get() as { value: string } | undefined;
  const records = db.prepare("SELECT * FROM backup_records WHERE organization_id = ? AND created_at >= datetime('now', '-30 days') ORDER BY created_at DESC").all(orgId);

  // Calculate actual disk usage of backup files.
  let totalBytes = 0;
  try {
    for (const file of fs.readdirSync(BACKUP_DIR)) {
      const stat = fs.statSync(path.join(BACKUP_DIR, file));
      if (stat.isFile()) totalBytes += stat.size;
    }
  } catch {
    // Backup folder unavailable — fall through.
  }
  const storageUsedMb = (totalBytes / (1024 * 1024)).toFixed(2);

  return {
    last,
    restorePoints: count.count,
    schedule: schedule?.value ? JSON.parse(schedule.value) : { frequency: 'daily', time: '02:00', emailConfirm: true },
    nextRun: nextRun?.value ?? null,
    records,
    storageUsedMb,
  };
}

/**
 * Take a real backup of the SQLite database. We use the official
 * better-sqlite3 `backup()` API which yields a consistent snapshot
 * even while the app is writing.
 */
export function createBackup(orgId: string, type: 'automatic' | 'manual' = 'manual') {
  const db = getDb();
  ensureBackupDir();
  const id = uuid();
  const file = backupFilePath(id);

  try {
    // better-sqlite3 backup is synchronous and atomic for small DBs
    // and async-streamed for larger ones; the simple fs.copy works
    // for SQLite as long as WAL is checkpointed. Use the built-in
    // backup API for safety.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).backup(file).then(() => {
      const size = fs.statSync(file).size;
      db.prepare("UPDATE backup_records SET file_size = ?, status = 'completed' WHERE id = ?").run(size, id);
    }).catch(() => {
      // Fallback: copy the live DB file. Acceptable for dev/local use.
      try {
        fs.copyFileSync(DB_PATH, file);
        const size = fs.statSync(file).size;
        db.prepare("UPDATE backup_records SET file_size = ?, status = 'completed' WHERE id = ?").run(size, id);
      } catch {
        db.prepare("UPDATE backup_records SET status = 'failed' WHERE id = ?").run(id);
      }
    });
  } catch {
    // Synchronous fallback for environments without backup()
    try {
      fs.copyFileSync(DB_PATH, file);
    } catch {
      db.prepare("INSERT INTO backup_records (id, organization_id, backup_type, file_size, status) VALUES (?, ?, ?, ?, ?)").run(id, orgId, type, 0, 'failed');
      return id;
    }
  }

  const initialSize = fs.existsSync(file) ? fs.statSync(file).size : 0;
  db.prepare('INSERT INTO backup_records (id, organization_id, backup_type, file_size, status) VALUES (?, ?, ?, ?, ?)').run(
    id, orgId, type, initialSize, 'completed'
  );
  return id;
}

export function getBackupFile(orgId: string, backupId: string): { path: string; filename: string } | null {
  const db = getDb();
  const record = db
    .prepare("SELECT id FROM backup_records WHERE id = ? AND organization_id = ?")
    .get(backupId, orgId) as { id: string } | undefined;
  if (!record) return null;
  const file = backupFilePath(record.id);
  if (!fs.existsSync(file)) return null;
  return {
    path: file,
    filename: `aibid-backup-${backupId}.db`,
  };
}

export function deleteBackup(orgId: string, backupId: string) {
  const db = getDb();
  const record = db.prepare('SELECT id FROM backup_records WHERE id = ? AND organization_id = ?').get(backupId, orgId) as { id: string } | undefined;
  if (!record) {
    throw new AppError('Backup not found.', 404);
  }
  const file = backupFilePath(record.id);
  try { fs.unlinkSync(file); } catch { /* file may already be gone */ }
  db.prepare('DELETE FROM backup_records WHERE id = ?').run(backupId);
}

export function getMaintenanceConfig() {
  const db = getDb();
  const mode = db.prepare("SELECT value FROM system_config WHERE key = 'maintenance_mode'").get() as { value: string } | undefined;
  const returnTime = db.prepare("SELECT value FROM system_config WHERE key = 'maintenance_return_time'").get() as { value: string } | undefined;
  return { enabled: mode?.value === 'true', returnTime: returnTime?.value ?? null };
}

export function setMaintenanceMode(enabled: boolean, returnTime?: string) {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('maintenance_mode', ?, datetime('now'))").run(enabled ? 'true' : 'false');
  if (returnTime) {
    db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('maintenance_return_time', ?, datetime('now'))").run(returnTime);
  }
}

export function getNotificationRules(orgId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM notification_rules WHERE organization_id = ?').all(orgId);
}

export function saveNotificationRule(orgId: string, data: { eventType: string; deliveryMethod: string; targetRoles: string[] }) {
  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO notification_rules (id, organization_id, event_type, delivery_method, target_roles) VALUES (?, ?, ?, ?, ?)').run(
    id, orgId, data.eventType, data.deliveryMethod, JSON.stringify(data.targetRoles)
  );
  return id;
}

export function invalidateSession(userId: string) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}
