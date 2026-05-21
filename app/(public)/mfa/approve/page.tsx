'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MailCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function MfaApproveContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const attemptId = useMemo(() => searchParams.get('attemptId') ?? '', [searchParams]);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!token) {
      setError('This approval link is missing required information. Please sign in again and request a new email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, attemptId: attemptId || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Could not approve this login. The link may have expired.');
        return;
      }

      setApproved(true);
    } catch {
      setError('Could not approve this login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8 shadow-xl bg-card border border-border text-center">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            {approved ? (
              <CheckCircle2 className="w-8 h-8 text-brand" />
            ) : (
              <MailCheck className="w-8 h-8 text-brand" />
            )}
          </div>

          {approved ? (
            <>
              <h1 className="font-serif text-2xl font-bold mb-2">Login approved</h1>
              <p className="text-muted-foreground mb-4">
                Return to the browser tab where you signed in. It should continue automatically within a few seconds.
              </p>
              <p className="text-sm text-muted-foreground">You can close this page.</p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl font-bold mb-2">Approve your login</h1>
              <p className="text-muted-foreground mb-6">
                Someone requested access to your AIBID account. Click below only if this was you.
              </p>

              {error && (
                <p className="text-sm text-destructive mb-4">{error}</p>
              )}

              <Button
                className="w-full sm:w-auto"
                onClick={handleApprove}
                disabled={loading || !token}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Approve Login'
                )}
              </Button>

              {!token && (
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/login">Back to login</Link>
                </Button>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function MfaApprovePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MfaApproveContent />
    </Suspense>
  );
}
