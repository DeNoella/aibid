'use client';

import { RoleGuard } from '@/components/layout/RoleGuard';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith('/admin') && pathname !== '/admin/users') {
      router.replace('/admin/users');
    }
  }, [pathname, router]);

  return (
    <RoleGuard allowedRoles={['admin']} redirectTo="/admin/users">
      {children}
    </RoleGuard>
  );
}
