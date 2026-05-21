import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getCampaignMetrics } from '@/lib/services/campaigns.service';

export const GET = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || undefined;
  return NextResponse.json(getCampaignMetrics(id, range));
});
