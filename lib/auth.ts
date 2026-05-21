import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET || 'aibid-crm-secret-key-change-in-production';
const EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
