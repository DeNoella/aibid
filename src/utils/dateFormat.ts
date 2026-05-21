import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns';

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  try {
    const date = parseISO(dateStr.replace(' ', 'T'));
    if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function getUserActivityStatus(lastLogin: string | null | undefined): 'active' | 'idle' | 'inactive' {
  if (!lastLogin) return 'inactive';
  try {
    const date = parseISO(lastLogin.replace(' ', 'T'));
    const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 7) return 'active';
    if (days <= 30) return 'idle';
    return 'inactive';
  } catch {
    return 'inactive';
  }
}
