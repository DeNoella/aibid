'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { cn } from '@/components/ui/utils';

export const TopNav = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 px-3 sm:px-4 pt-2 sm:pt-3">
      <nav
        className={cn(
          'mx-auto max-w-7xl rounded-2xl border transition-all duration-300',
          scrolled
            ? 'border-border/80 bg-background/90 shadow-lg shadow-black/25 backdrop-blur-xl'
            : 'border-border/50 bg-background/70 shadow-md shadow-black/10 backdrop-blur-md'
        )}
      >
        <div className="px-3 sm:px-5">
          <div className="flex h-12 sm:h-14 items-center justify-between gap-2">
            <Link
              href={user?.role === 'admin' ? '/admin/overview' : '/dashboard'}
              className="group flex min-w-0 items-center"
            >
              <div className="min-w-0">
                <span className="block truncate font-serif text-base font-bold tracking-wide text-foreground transition-colors group-hover:text-brand sm:text-lg">
                  AIBID
                </span>
                <span className="hidden truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
                  Analytics Platform
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center">
              <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-brand">
                {user?.role === 'admin' ? 'System Admin' : 'Data Analyst'}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="relative hidden h-9 w-9 rounded-xl text-muted-foreground hover:bg-secondary/80 hover:text-foreground md:flex"
                asChild
              >
                <Link href="/notifications">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />
                </Link>
              </Button>

              <div className="hidden items-center gap-2 border-l border-border/60 pl-2 md:flex">
                <div className="hidden text-right lg:block">
                  <p className="max-w-[140px] truncate text-sm font-medium text-foreground">{user?.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
                </div>
                <Avatar className="h-8 w-8 border border-border/60">
                  <AvatarFallback className="bg-secondary text-xs text-foreground">
                    {user?.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-xl md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
              className="overflow-hidden border-t border-border/60 md:hidden"
            >
              <div className="max-h-[75vh] space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
                <AppSidebar mobile onNavigate={() => setMobileMenuOpen(false)} />
                <div className="space-y-2 border-t border-border/60 pt-3">
                  <Link
                    href="/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
                  >
                    <Bell className="h-4 w-4" />
                    Notifications
                  </Link>
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                    <Avatar className="h-8 w-8 border border-border/60">
                      <AvatarFallback className="bg-secondary text-xs text-foreground">
                        {user?.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};
