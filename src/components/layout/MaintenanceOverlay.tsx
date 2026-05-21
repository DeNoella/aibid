'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Wrench } from 'lucide-react';

export function MaintenanceOverlay() {
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; returnTime: string | null } | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') return;
    api.get<{ enabled: boolean; returnTime: string | null }>('/system/maintenance')
      .then(setMaintenance)
      .catch(() => {});
  }, [user]);

  if (!maintenance?.enabled || user?.role === 'admin') return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <Wrench className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">System under maintenance</h1>
        <p className="text-muted-foreground">
          We are performing scheduled maintenance. Please check back
          {maintenance.returnTime ? ` around ${maintenance.returnTime}` : ' soon'}.
        </p>
      </div>
    </div>
  );
}
