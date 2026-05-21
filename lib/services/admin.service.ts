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

export function getAdminOverview(orgId: string) {
  const db = getDb();
  ensureServiceHealth(db, orgId);

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

  const pendingRoleAssignment = db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE organization_id = ? AND role = 'analyst' AND department IS NULL
  `).get(orgId) as { count: number };

  const staleSources = db.prepare(`
    SELECT COUNT(*) as count FROM data_sources
    WHERE organization_id = ? AND (last_synced_at IS NULL OR last_synced_at < datetime('now', '-24 hours'))
  `).get(orgId) as { count: number };

  const failedBackups = db.prepare(`
    SELECT COUNT(*) as count FROM backup_records
    WHERE organization_id = ? AND status = 'failed' AND created_at >= datetime('now', '-7 days')
  `).get(orgId) as { count: number };

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

  const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as { size: number };
  const storageGb = (dbSize.size / (1024 ** 3)).toFixed(2);
  const storagePct = Math.min(95, Math.round((dbSize.size / (5 * 1024 ** 3)) * 100));

  return {
    uptimePct: 99.7,
    activeUsers: activeUsers.count,
    aiStatus,
    aiStatusColor,
    storageUsedPct: storagePct,
    storageUsedGb: storageGb,
    services,
    criticalAlerts,
    pendingTasks: {
      roleAssignment: pendingRoleAssignment.count,
      staleSources: staleSources.count,
      failedBackups: failedBackups.count,
    },
  };
}

export function getUsers(orgId: string, search?: string, role?: string, status?: string) {
  const db = getDb();
  let where = 'WHERE organization_id = ?';
  const params: unknown[] = [orgId];
  if (search) {
    where += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role) { where += ' AND role = ?'; params.push(role === 'SYSTEM_ADMIN' ? 'admin' : 'analyst'); }
  const rows = db.prepare(`SELECT id, name, email, role, department, last_login, is_active, created_at FROM users ${where} ORDER BY last_login IS NULL, last_login DESC`).all(...params) as Record<string, unknown>[];
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

export function updateUser(orgId: string, userId: string, data: { name?: string; email?: string; role?: string; department?: string }) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE id = ? AND organization_id = ?').get(userId, orgId);
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
  db.prepare(`UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), department = COALESCE(?, department), updated_at = datetime('now') WHERE id = ? AND organization_id = ?`).run(
    data.name?.trim(), emailToSave, role, data.department, userId, orgId
  );
}

export function getUser(orgId: string, userId: string) {
  const db = getDb();
  const user = db.prepare(`
    SELECT id, name, email, role, department, last_login, is_active, created_at
    FROM users WHERE id = ? AND organization_id = ?
  `).get(userId, orgId) as AdminUserRow | undefined;

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

export function deleteUser(orgId: string, userId: string, actingUserId: string) {
  const db = getDb();

  if (userId === actingUserId) {
    throw new AppError('You cannot delete your own account.');
  }

  const user = db.prepare('SELECT id, role FROM users WHERE id = ? AND organization_id = ?').get(userId, orgId) as
    | { id: string; role: string }
    | undefined;

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  if (user.role === 'admin') {
    const adminCount = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE organization_id = ? AND role = 'admin' AND is_active = 1
    `).get(orgId) as { count: number };

    if (adminCount.count <= 1) {
      throw new AppError('Cannot delete the only active admin account.');
    }
  }

  purgeUserReferences(db, userId);
  db.prepare('DELETE FROM users WHERE id = ? AND organization_id = ?').run(userId, orgId);
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

export function getBackupSummary(orgId: string) {
  const db = getDb();
  const last = db.prepare('SELECT * FROM backup_records WHERE organization_id = ? ORDER BY created_at DESC LIMIT 1').get(orgId);
  const count = db.prepare("SELECT COUNT(*) as count FROM backup_records WHERE organization_id = ? AND created_at >= datetime('now', '-30 days')").get(orgId) as { count: number };
  const schedule = db.prepare("SELECT value FROM system_config WHERE key = 'backup_schedule'").get() as { value: string } | undefined;
  const nextRun = db.prepare("SELECT value FROM system_config WHERE key = 'backup_next_run'").get() as { value: string } | undefined;
  const records = db.prepare("SELECT * FROM backup_records WHERE organization_id = ? AND created_at >= datetime('now', '-30 days') ORDER BY created_at DESC").all(orgId);
  return { last, restorePoints: count.count, schedule: schedule?.value ? JSON.parse(schedule.value) : { frequency: 'daily', time: '02:00', emailConfirm: true }, nextRun: nextRun?.value ?? null, records, storageUsedGb: '2.4' };
}

export function createBackup(orgId: string, type: 'automatic' | 'manual' = 'manual') {
  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO backup_records (id, organization_id, backup_type, file_size, status) VALUES (?, ?, ?, ?, ?)').run(id, orgId, type, Math.floor(Math.random() * 500000000) + 100000000, 'completed');
  return id;
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

export function getPerformanceMetrics() {
  return {
    apiResponseMs: Math.round(45 + Math.random() * 30),
    dbQueryMs: Math.round(8 + Math.random() * 12),
    memoryPct: Math.round(55 + Math.random() * 15),
    activeConnections: Math.round(12 + Math.random() * 8),
    lastVacuum: new Date(Date.now() - 86400000 * 3).toISOString(),
    lastReindex: new Date(Date.now() - 86400000 * 7).toISOString(),
  };
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
