import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getChartData } from '@/lib/services/dashboard.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || undefined;
  return NextResponse.json(getChartData(user.organizationId, range));
});
