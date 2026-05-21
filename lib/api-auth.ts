import { NextRequest } from 'next/server';
import { verifyToken, type JwtPayload } from './auth';

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
  }
}

export function getAuthUser(request: NextRequest): JwtPayload | null {
  const header = request.headers.get('authorization');
  const bearer =
    header && header.startsWith('Bearer ')
      ? header.split(' ')[1]
      : null;

  const cookieToken = request.cookies.get('auth_token')?.value ?? null;
  const token = bearer ?? cookieToken;

  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireAuth(request: NextRequest): JwtPayload {
  const user = getAuthUser(request);
  if (!user) {
    throw new AuthError('Authentication required');
  }
  return user;
}

export function requireRole(user: JwtPayload, ...roles: string[]): void {
  if (!roles.includes(user.role)) {
    throw new AuthError('Insufficient permissions', 403);
  }
}
