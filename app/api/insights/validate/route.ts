import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getInsights, getPendingCount, getValidationThreshold, setValidationThreshold } from '@/lib/services/insights.service';

export const GET = withAuth(async (req, user) => {
  requireRole(user, 'analyst', 'admin');
  const tab = (new URL(req.url).searchParams.get('tab') ?? 'pending') as 'pending' | 'approved' | 'false_positive';
  return NextResponse.json({
    insights: getInsights(user.organizationId, tab),
    pendingCount: getPendingCount(user.organizationId),
    threshold: getValidationThreshold(user.organizationId),
  });
});

export const PUT = withAuth(async (req, user) => {
  requireRole(user, 'analyst');
  const { threshold } = await req.json();
  setValidationThreshold(user.organizationId, threshold);
  return NextResponse.json({ success: true });
});
