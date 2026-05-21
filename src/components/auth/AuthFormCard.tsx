'use client';

import { cn } from '@/components/ui/utils';

type AuthTab = 'signin' | 'signup';

interface AuthFormCardProps {
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  children: React.ReactNode;
}

export function AuthFormCard({ activeTab, onTabChange, children }: AuthFormCardProps) {
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-border bg-card/95 p-6 sm:p-8 shadow-xl">
      <div className="text-center mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Welcome Back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access your analytics platform
        </p>
      </div>

      <div className="rounded-xl bg-secondary/60 p-1 mb-6 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onTabChange('signin')}
          className={cn(
            'rounded-lg py-2.5 text-sm font-medium transition-all',
            activeTab === 'signin'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => onTabChange('signup')}
          className={cn(
            'rounded-lg py-2.5 text-sm font-medium transition-all',
            activeTab === 'signup'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Sign Up
        </button>
      </div>

      {children}
    </div>
  );
}
