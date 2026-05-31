'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';

interface ThemeToggleProps {
  className?: string;
  /** When true, renders a full-width labeled button suitable for the mobile menu. */
  variant?: 'icon' | 'menu';
  onToggle?: () => void;
}

/**
 * Compact light/dark mode switcher. Dark is the default theme; clicking
 * flips between light and dark and persists the choice via next-themes.
 *
 * Uses a mounted flag so the icon doesn't hydrate-mismatch on first paint.
 */
export function ThemeToggle({ className, variant = 'icon', onToggle }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme !== 'light' : true;
  const nextLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
    onToggle?.();
  };

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground',
          className
        )}
        aria-label={nextLabel}
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          <Sun
            className={cn(
              'absolute h-4 w-4 transition-all',
              mounted && !isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
            )}
          />
          <Moon
            className={cn(
              'absolute h-4 w-4 transition-all',
              mounted && isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
            )}
          />
        </span>
        <span className="flex-1 text-left">{isDark ? 'Light mode' : 'Dark mode'}</span>
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      aria-label={nextLabel}
      title={nextLabel}
      className={cn(
        'relative h-9 w-9 rounded-xl text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
        className
      )}
    >
      <Sun
        className={cn(
          'absolute h-4 w-4 transition-all',
          mounted && !isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        )}
      />
      <Moon
        className={cn(
          'absolute h-4 w-4 transition-all',
          mounted && isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
        )}
      />
    </Button>
  );
}
