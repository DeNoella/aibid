import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getInsights } from '@/lib/services/ai.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || undefined;
  const impact = searchParams.get('impact') || undefined;
  const insights = getInsights(user.organizationId, type, impact);
  return NextResponse.json(insights);
});
