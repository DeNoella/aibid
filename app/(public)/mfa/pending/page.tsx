'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type MfaStatus = 'pending' | 'approved' | 'expired' | 'used';

function MfaPendingContent() {
  const router = useRouter();
  const { setSession } = useAuth();
  const searchParams = useSearchParams();
  const attemptId = useMemo(() => searchParams.get('attemptId') ?? '', [searchParams]);
  const [status, setStatus] = useState<MfaStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!attemptId) {
      setError('Missing MFA attempt.');
      return;
    }

    let stopped = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      stopped = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const completeLogin = async () => {
      if (completedRef.current) return;
      completedRef.current = true;
      // Stop polling BEFORE we ask the server to consume the token, otherwise
      // a poll that returns after the token has been used will flash the
      // "no longer valid" message right before we redirect to the dashboard.
      stopPolling();
      setStatus('approved');
      setCompleting(true);
      try {
        const res = await fetch('/api/mfa/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || 'Could not complete login.');
          return;
        }

        if (data.token) {
          await setSession(data.token);
        }

        router.push(data.redirectPath || '/dashboard');
      } catch {
        setError('Could not complete login.');
      } finally {
        setCompleting(false);
      }
    };

    const checkStatus = async () => {
      // Bail out fast if we've already moved past the polling phase.
      if (stopped || completedRef.current) return;
      try {
        const res = await fetch(`/api/mfa/status?attemptId=${encodeURIComponent(attemptId)}`);
        const data = await res.json();

        if (stopped || completedRef.current) return;

        if (!res.ok) {
          setError(data?.error || 'Unable to check approval status.');
          return;
        }

        const nextStatus = data?.status as MfaStatus;

        if (nextStatus === 'approved') {
          // Stop the interval immediately so a parallel poll can't overwrite
          // the status with "used" the moment /api/mfa/complete consumes it.
          await completeLogin();
          return;
        }

        setStatus(nextStatus);
      } catch {
        if (!stopped && !completedRef.current) {
          setError('Unable to check approval status.');
        }
      }
    };

    void checkStatus();
    intervalId = setInterval(() => {
      void checkStatus();
    }, 2500);

    return () => {
      stopPolling();
    };
  }, [attemptId, router, setSession]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8 shadow-xl bg-card border border-border text-center">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MailCheck className="w-8 h-8 text-brand" />
          </div>

          <h1 className="font-serif text-2xl font-bold mb-2">Waiting for approval</h1>
          <p className="text-muted-foreground mb-6">
            We sent a link to your email. Open it and click <strong>Approve Login</strong>, then confirm on the next screen.
          </p>

          {!error && (status === 'pending' || completing) && (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {completing ? 'Signing you in...' : 'Checking approval status...'}
            </div>
          )}

          {!error && status === 'approved' && !completing && (
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Approval received — finishing login...
            </div>
          )}

          {!error && (status === 'expired' || status === 'used') && (
            <p className="text-sm text-destructive mb-4">
              This login approval link is no longer valid. Please sign in again.
            </p>
          )}

          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}

          {(error || status === 'expired' || status === 'used') && (
            <Button onClick={() => router.push('/login')} className="mt-2">
              Back to login
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function MfaPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MfaPendingContent />
    </Suspense>
  );
}
