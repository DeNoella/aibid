'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, LogOut, Menu, Settings, User as UserIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { ProfileDialog } from '@/components/profile/ProfileDialog';
import { cn } from '@/components/ui/utils';

export const TopNav = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'details' | 'avatar'>('details');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openProfile = (tab: 'details' | 'avatar') => {
    setProfileTab(tab);
    setProfileOpen(true);
  };

  return (
    <>
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
                  {user && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-secondary/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                          aria-label="Open profile menu"
                        >
                          <div className="hidden text-right lg:block">
                            <p className="max-w-[140px] truncate text-sm font-medium text-foreground">{user.name}</p>
                            <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
                          </div>
                          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="h-9 w-9" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <div className="flex items-center gap-3 px-2 py-2.5">
                          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="h-10 w-10" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                          Account
                        </DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => openProfile('details')}>
                          <UserIcon className="h-4 w-4" />
                          View profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openProfile('avatar')}>
                          <Settings className="h-4 w-4" />
                          Change avatar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => router.push('/settings')}>
                          <Settings className="h-4 w-4" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={logout}>
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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
                    {user && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openProfile('details');
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary/70"
                      >
                        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="h-9 w-9" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </button>
                    )}
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

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} initialTab={profileTab} />
    </>
  );
};
