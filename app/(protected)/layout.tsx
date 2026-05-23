'use client';

import { useAuth } from '@/contexts/AuthContext';
import { TopNav } from '@/components/layout/TopNav';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MaintenanceOverlay } from '@/components/layout/MaintenanceOverlay';
import { motion, AnimatePresence } from 'motion/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isOnboarding = pathname.startsWith('/onboarding');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!loading && user && !user.profileSetupCompleted && !isOnboarding) {
      router.replace('/onboarding/profile');
    }
  }, [loading, user, isOnboarding, router]);

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  if (isOnboarding) {
    return <div className="min-h-screen bg-background overflow-x-hidden">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MaintenanceOverlay />
      <TopNav />
      <div className="flex min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] w-full">
        <AppSidebar />
        <main className="flex-1 min-w-0 w-full overflow-x-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
