'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="w-9 h-9 px-0" aria-label="Toggle theme">
        <span className="w-5 h-5" />
      </Button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-9 h-9 px-0 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 transition-transform duration-200 rotate-0 scale-100" />
      ) : (
        <Moon className="w-5 h-5 transition-transform duration-200 rotate-0 scale-100" />
      )}
    </Button>
  );
};
