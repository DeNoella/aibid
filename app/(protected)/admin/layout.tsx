'use client';

import { RoleGuard } from '@/components/layout/RoleGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']} redirectTo="/admin/overview">
      {children}
    </RoleGuard>
  );
}
