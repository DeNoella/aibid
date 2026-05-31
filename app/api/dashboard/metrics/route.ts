import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getMetrics } from '@/lib/services/dashboard.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || undefined;
  const filter = searchParams.get('filter') || undefined;
  const customStart = searchParams.get('customStart') || undefined;
  const customEnd = searchParams.get('customEnd') || undefined;
  return NextResponse.json(getMetrics(user.organizationId, range, filter, customStart, customEnd));
});
