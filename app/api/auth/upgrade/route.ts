import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { upgradeToPremiun, getSubscriptionStatus } from '@/lib/services/auth.service';

export const PUT = withAuth((request: NextRequest, user) => {
  if (user.role === 'admin') {
    return NextResponse.json({ error: 'Admin accounts do not use subscription tiers' }, { status: 400 });
  }
  const current = getSubscriptionStatus(user.userId);
  if (current === 'premium') {
    return NextResponse.json({ error: 'Account is already Premium' }, { status: 400 });
  }
  upgradeToPremiun(user.userId);
  return NextResponse.json({ subscriptionStatus: 'premium' });
});
