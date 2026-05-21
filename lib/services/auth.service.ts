import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import { hashPassword, comparePassword } from '@/lib/auth';
import { signToken } from '@/lib/auth';
import { MfaService } from '@/lib/services/mfa.service';
import { EmailService } from '@/lib/services/email.service';
import {
  AppError,
  assertEmailAvailable,
  normalizeEmail,
  validateEmail,
  validateName,
  validatePassword,
} from '@/lib/validation';

export function registerUser(name: string, email: string, password: string, organization: string) {
  const db = getDb();
  const role = 'analyst';
  const subscriptionStatus = 'free_trial';

  validateName(name);
  const normalizedEmail = assertEmailAvailable(db, email);
  validatePassword(password);

  const orgId = uuid();
  const userId = uuid();

  db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(orgId, organization.trim() || 'My Organization');
  db.prepare('INSERT INTO users (id, organization_id, email, password_hash, name, role, subscription_status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    userId, orgId, normalizedEmail, hashPassword(password), name.trim(), role, subscriptionStatus
  );
  db.prepare('INSERT INTO user_preferences (id, user_id) VALUES (?, ?)').run(uuid(), userId);

  const stages = [
    ['Lead', 0, 0.10, '#6b7280', 0, 0],
    ['Qualified', 1, 0.25, '#3b82f6', 0, 0],
    ['Proposal', 2, 0.50, '#8b5cf6', 0, 0],
    ['Negotiation', 3, 0.75, '#f59e0b', 0, 0],
    ['Closed Won', 4, 1.00, '#22c55e', 1, 0],
    ['Closed Lost', 5, 0.00, '#ef4444', 0, 1],
  ];
  const stageStmt = db.prepare('INSERT INTO pipeline_stages (id, organization_id, name, position, probability, color, is_won, is_lost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const s of stages) stageStmt.run(uuid(), orgId, ...s);

  const token = signToken({ userId, email: normalizedEmail, role, organizationId: orgId });
  return {
    token,
    user: { id: userId, name: name.trim(), email: normalizedEmail, role, subscriptionStatus, organizationId: orgId }
  };
}

export async function loginUser(email: string, password: string) {
  const db = getDb();

  validateEmail(email);
  const normalizedEmail = normalizeEmail(email);

  if (!password) {
    throw new AppError('Password is required.', 400);
  }

  const user = db.prepare('SELECT id, email, password_hash, name, role, organization_id FROM users WHERE email = ? AND is_active = 1').get(normalizedEmail) as {
    id: string;
    email: string;
    password_hash: string;
    name: string;
    role: string;
    organization_id: string;
  } | undefined;

  if (!user) {
    const inactive = db.prepare('SELECT id FROM users WHERE email = ? AND is_active = 0').get(normalizedEmail);
    if (inactive) {
      throw new AppError('This account has been deactivated. Contact your administrator.', 403);
    }
    throw new AppError('No account found with this email address.', 401);
  }

  if (!comparePassword(password, user.password_hash)) {
    throw new AppError('Incorrect password. Please try again.', 401);
  }

  const { attemptId, rawToken } = await MfaService.generateMfaToken(user.id);

  await EmailService.sendMagicLink(user.email, rawToken, attemptId);

  db.prepare('INSERT INTO audit_logs (id, organization_id, user_id, user_name, action, module, details) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    uuid(), user.organization_id, user.id, user.name, 'Login pending approval', 'Auth', 'Magic link approval required'
  );

  return { mfaRequired: true as const, attemptId };
}

export function getUserById(userId: string) {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, role, subscription_status, organization_id, avatar_url, two_factor_enabled, created_at FROM users WHERE id = ?').get(userId) as any;
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    subscriptionStatus: user.subscription_status as 'free_trial' | 'premium',
    organizationId: user.organization_id,
    avatarUrl: user.avatar_url,
    twoFactorEnabled: !!user.two_factor_enabled,
    createdAt: user.created_at
  };
}

export function getSubscriptionStatus(userId: string): 'free_trial' | 'premium' {
  const db = getDb();
  const row = db.prepare('SELECT subscription_status FROM users WHERE id = ?').get(userId) as any;
  return (row?.subscription_status ?? 'free_trial') as 'free_trial' | 'premium';
}

export function upgradeToPremiun(userId: string) {
  const db = getDb();
  db.prepare("UPDATE users SET subscription_status = 'premium', updated_at = datetime('now') WHERE id = ?").run(userId);
}
