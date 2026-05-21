import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/campaigns.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  return NextResponse.json(svc.getCampaigns(user.organizationId, status, page, limit));
});

export const POST = withAuth(async (request: NextRequest, user) => {
  const body = await request.json();
  const campaign = svc.createCampaign(body, user.organizationId, user.userId);
  return NextResponse.json(campaign, { status: 201 });
});
