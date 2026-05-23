'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils/avatar-generator';
import { cn } from '@/components/ui/utils';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ name, avatarUrl, className, fallbackClassName }: UserAvatarProps) {
  const initials = getInitials(name);

  return (
    <Avatar className={cn('border border-border/60', className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className={cn('bg-secondary text-xs text-foreground', fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
