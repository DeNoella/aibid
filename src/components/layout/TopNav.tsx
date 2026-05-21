'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { AppSidebar } from '@/components/layout/AppSidebar';

export const TopNav = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link
            href={user?.role === 'admin' ? '/admin/users' : '/dashboard'}
            className="flex items-center gap-2 min-w-0"
          >
            <span className="font-serif text-lg sm:text-xl font-bold tracking-wide text-foreground shrink-0">
              AIBID
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">
              Analytics Platform
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-brand/15 text-brand border border-brand/30">
              {user?.role === 'admin' ? 'SYSTEM_ADMIN' : 'DATA_ANALYST'}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" className="relative hidden md:flex text-muted-foreground" asChild>
              <Link href="/notifications">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full" />
              </Link>
            </Button>

            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-secondary text-foreground text-xs">
                  {user?.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border bg-card overflow-hidden lg:hidden"
          >
            <div className="px-4 py-4 space-y-3 max-h-[75vh] overflow-y-auto">
              <AppSidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
              <div className="pt-3 border-t border-border space-y-2">
                <Link
                  href="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Bell className="w-4 h-4" />
                  Notifications
                </Link>
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-secondary text-foreground text-xs">
                      {user?.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-destructive"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
