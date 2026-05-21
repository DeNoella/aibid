'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

export function PageLoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <p className="text-foreground font-medium mb-2">Something went wrong</p>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-foreground font-medium mb-2">{title}</p>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
