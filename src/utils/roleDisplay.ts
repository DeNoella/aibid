export type ApiRole = 'admin' | 'analyst';
export type DisplayRole = 'SYSTEM_ADMIN' | 'DATA_ANALYST';

export function toDisplayRole(role: string): DisplayRole {
  return role === 'admin' ? 'SYSTEM_ADMIN' : 'DATA_ANALYST';
}

export function toApiRole(role: string): ApiRole {
  return role === 'SYSTEM_ADMIN' ? 'admin' : 'analyst';
}
