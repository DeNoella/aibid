export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): void {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new AppError('Email address is required.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError('Please enter a valid email address.');
  }
}

export function validateName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new AppError('Full name is required.');
  }
  if (trimmed.length < 2) {
    throw new AppError('Full name must be at least 2 characters.');
  }
}

export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];
  if (!password) {
    errors.push('Password is required.');
    return errors;
  }
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must include at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must include at least one number.');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must include at least one special character (e.g. ! @ # $).');
  }
  return errors;
}

export function validatePassword(password: string): void {
  const errors = getPasswordErrors(password);
  if (errors.length > 0) {
    throw new AppError(errors[0]);
  }
}

export function validatePasswordChange(currentPassword: string, newPassword: string): void {
  if (!currentPassword) {
    throw new AppError('Current password is required.');
  }
  validatePassword(newPassword);
  if (currentPassword === newPassword) {
    throw new AppError('New password must be different from your current password.');
  }
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof AppError || error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function getErrorStatus(error: unknown, fallback = 400): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return fallback;
}

type DbLike = {
  prepare: (sql: string) => { get: (...args: any[]) => unknown };
};

export function assertEmailAvailable(db: DbLike, email: string, excludeUserId?: string): string {
  validateEmail(email);
  const normalized = normalizeEmail(email);
  const existing = excludeUserId
    ? db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(normalized, excludeUserId)
    : db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
  if (existing) {
    throw new AppError('An account with this email address already exists.');
  }
  return normalized;
}
