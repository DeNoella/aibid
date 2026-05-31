'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Check, Zap, Loader2 } from 'lucide-react';

const FREE_FEATURES = [
  'Basic dashboard access',
  'Limited AI queries per day',
  'View existing reports',
  'CRM access (contacts, deals, companies)',
  'Campaign tracking',
];

const PREMIUM_FEATURES = [
  'Unlimited dashboards',
  'Unlimited AI queries',
  'Automated report generation',
  'Predictive analytics & forecasts',
  'Priority support',
];

export default function UpgradePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [upgrading, setUpgrading] = useState(false);

  const isAlreadyPremium = user?.subscriptionStatus === 'premium' || user?.role === 'admin';

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await api.put('/auth/upgrade', {});
      await refreshUser();
      toast.success('Upgraded to Premium!', { description: 'Thank you for your payment. Enjoy the full experience.' });
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Upgrade failed. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Upgrade to Premium</h1>
          <p className="text-sm text-muted-foreground">Unlock more features and get the most out of AIBID</p>
        </div>
      </div>

      {isAlreadyPremium && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-300 font-medium">
          Your account already has Premium access.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4 border-2 border-neutral-200 dark:border-neutral-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Current Plan</p>
            <h2 className="text-xl font-bold text-foreground">Free Trial</h2>
          </div>
          <ul className="space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-neutral-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6 space-y-4 border-2 border-neutral-800 dark:border-neutral-300">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">Recommended</p>
            <h2 className="text-xl font-bold text-foreground">Premium</h2>
          </div>
          <ul className="space-y-2">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-green-600 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {!isAlreadyPremium && (
            <Button
              className="w-full bg-neutral-900 hover:bg-black text-white dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand/90 mt-2"
              onClick={handleUpgrade}
              disabled={upgrading}
            >
              {upgrading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Upgrading...
                </>
              ) : (
                'Upgrade to Premium'
              )}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
