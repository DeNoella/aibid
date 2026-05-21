'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'analyst';

interface RoleGuardProps {
  allowedRoles: AppRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

export function RoleGuard({ allowedRoles, children, redirectTo }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.replace(redirectTo ?? (user.role === 'admin' ? '/admin/users' : '/dashboard'));
    }
  }, [user, loading, allowedRoles, router, redirectTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
