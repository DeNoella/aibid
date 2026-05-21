import { getDb } from '@/lib/db';
import { hashPassword, comparePassword } from '@/lib/auth';
import {
  AppError,
  assertEmailAvailable,
  validateName,
  validatePasswordChange,
} from '@/lib/validation';

export function getProfile(userId: string) {
  const db = getDb();
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.two_factor_enabled, u.created_at,
      o.name as organization_name, o.id as organization_id
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    WHERE u.id = ?
  `).get(userId) as any;
  return user;
}

export function updateProfile(userId: string, data: { name?: string; email?: string; organizationName?: string }) {
  const db = getDb();

  if (data.name !== undefined) {
    validateName(data.name);
  }

  let emailToSave: string | undefined;
  if (data.email !== undefined) {
    emailToSave = assertEmailAvailable(db, data.email, userId);
  }

  db.prepare("UPDATE users SET name = ?, email = ?, updated_at = datetime('now') WHERE id = ?").run(
    data.name?.trim(),
    emailToSave ?? data.email,
    userId
  );

  if (data.organizationName) {
    const user = db.prepare('SELECT organization_id FROM users WHERE id = ?').get(userId) as any;
    db.prepare("UPDATE organizations SET name = ?, updated_at = datetime('now') WHERE id = ?").run(data.organizationName.trim(), user.organization_id);
  }

  return getProfile(userId);
}

export function getPreferences(userId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
}

export function updatePreferences(userId: string, data: any) {
  const db = getDb();
  db.prepare(`
    UPDATE user_preferences SET theme = ?, language = ?, timezone = ?, date_format = ?,
    notify_email = ?, notify_push = ?, notify_reports = ?, notify_insights = ?,
    updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    data.theme, data.language, data.timezone, data.dateFormat,
    data.notifyEmail ? 1 : 0, data.notifyPush ? 1 : 0,
    data.notifyReports ? 1 : 0, data.notifyInsights ? 1 : 0,
    userId
  );
  return db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
}

export function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const db = getDb();
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined;
  if (!user) throw new AppError('User not found.', 404);
  if (!comparePassword(currentPassword, user.password_hash)) {
    throw new AppError('Current password is incorrect.');
  }

  validatePasswordChange(currentPassword, newPassword);

  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hashPassword(newPassword), userId);
}

export function getSessions(userId: string) {
  const db = getDb();
  return db.prepare("SELECT id, ip_address, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > datetime('now') ORDER BY created_at DESC").all(userId);
}
