import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const MFA_TTL_MINUTES = 15;

type MfaAttempt = {
  id: string;
  user_id: string;
  token_hash: string;
  status: string;
  expires_at: string;
};

function parseExpiresAt(expiresAt: string): Date {
  if (expiresAt.includes('T')) {
    return new Date(expiresAt);
  }
  return new Date(`${expiresAt.replace(' ', 'T')}Z`);
}

function isExpired(attempt: MfaAttempt): boolean {
  return parseExpiresAt(attempt.expires_at).getTime() < Date.now();
}

export class MfaService {
  static async generateMfaToken(userId: string) {
    const db = getDb();

    db.prepare("UPDATE mfa_attempts SET status = 'expired' WHERE user_id = ? AND status = 'pending'").run(userId);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = bcrypt.hashSync(rawToken, 10);
    const expiresAt = new Date(Date.now() + MFA_TTL_MINUTES * 60 * 1000).toISOString();
    const attemptId = uuid();

    db.prepare(`
      INSERT INTO mfa_attempts (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(attemptId, userId, tokenHash, expiresAt);

    return { attemptId, rawToken };
  }

  static async approveMfaToken(token: string, attemptId?: string) {
    const db = getDb();

    let attempt: MfaAttempt | undefined;

    if (attemptId) {
      attempt = db.prepare('SELECT id, user_id, token_hash, status, expires_at FROM mfa_attempts WHERE id = ?').get(attemptId) as MfaAttempt | undefined;
    } else {
      const attempts = db.prepare(`
        SELECT id, user_id, token_hash, status, expires_at
        FROM mfa_attempts
        WHERE status IN ('pending', 'approved')
        ORDER BY created_at DESC
      `).all() as MfaAttempt[];

      for (const row of attempts) {
        if (bcrypt.compareSync(token, row.token_hash)) {
          attempt = row;
          break;
        }
      }
    }

    if (!attempt) {
      return { success: false as const, error: 'Invalid or expired token' };
    }

    if (isExpired(attempt)) {
      db.prepare("UPDATE mfa_attempts SET status = 'expired' WHERE id = ?").run(attempt.id);
      return { success: false as const, error: 'This approval link has expired' };
    }

    if (attempt.status === 'approved') {
      return { success: true as const, userId: attempt.user_id, attemptId: attempt.id };
    }

    if (attempt.status !== 'pending') {
      return { success: false as const, error: 'This approval link has already been used' };
    }

    if (!bcrypt.compareSync(token, attempt.token_hash)) {
      return { success: false as const, error: 'Invalid or expired token' };
    }

    db.prepare("UPDATE mfa_attempts SET status = 'approved' WHERE id = ?").run(attempt.id);
    return { success: true as const, userId: attempt.user_id, attemptId: attempt.id };
  }

  /** @deprecated Email scanners can consume GET links — use approveMfaToken via POST instead */
  static async verifyMfaToken(token: string) {
    return this.approveMfaToken(token);
  }

  static async completeMfaLogin(attemptId: string) {
    const db = getDb();
    const attempt = db.prepare('SELECT id, user_id, token_hash, status, expires_at FROM mfa_attempts WHERE id = ?').get(attemptId) as MfaAttempt | undefined;

    if (!attempt) {
      return { success: false as const, error: 'Invalid login attempt' };
    }

    if (isExpired(attempt)) {
      db.prepare("UPDATE mfa_attempts SET status = 'expired' WHERE id = ?").run(attemptId);
      return { success: false as const, error: 'This login approval has expired' };
    }

    if (attempt.status === 'used') {
      return { success: false as const, error: 'This login approval has already been used' };
    }

    if (attempt.status !== 'approved') {
      return { success: false as const, error: 'Login not approved yet' };
    }

    db.prepare("UPDATE mfa_attempts SET status = 'used' WHERE id = ?").run(attemptId);
    return { success: true as const, userId: attempt.user_id };
  }

  static async getMfaStatus(attemptId: string) {
    const db = getDb();
    const attempt = db.prepare('SELECT status, user_id, expires_at FROM mfa_attempts WHERE id = ?').get(attemptId) as {
      status: string;
      user_id: string;
      expires_at: string;
    } | undefined;

    if (!attempt) return null;

    if (attempt.status === 'pending' && isExpired(attempt as MfaAttempt)) {
      db.prepare("UPDATE mfa_attempts SET status = 'expired' WHERE id = ?").run(attemptId);
      return { status: 'expired', userId: attempt.user_id };
    }

    return { status: attempt.status, userId: attempt.user_id };
  }

  static async invalidateMfaToken(attemptId: string) {
    const db = getDb();
    db.prepare("UPDATE mfa_attempts SET status = 'used' WHERE id = ?").run(attemptId);
  }
}
