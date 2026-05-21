'use client';

import { Badge } from '@/components/ui/badge';
import { toDisplayRole } from '@/utils/roleDisplay';

export function RoleBadge({ role }: { role: string }) {
  const display = toDisplayRole(role);
  const isAdmin = role === 'admin';
  return (
    <Badge
      variant="outline"
      className={
        isAdmin
          ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
          : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
      }
    >
      {display}
    </Badge>
  );
}
