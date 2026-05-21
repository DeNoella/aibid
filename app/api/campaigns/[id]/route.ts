import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/campaigns.service';

export const GET = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const campaign = svc.getCampaignById(id, user.organizationId);
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  return NextResponse.json(campaign);
});

export const PUT = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const body = await request.json();
  return NextResponse.json(svc.updateCampaign(id, body, user.organizationId));
});

export const DELETE = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  svc.deleteCampaign(id, user.organizationId);
  return NextResponse.json({ message: 'Deleted' });
});
