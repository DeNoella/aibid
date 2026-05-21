import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/deals.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const stage = searchParams.get('stage') || undefined;
  const owner = searchParams.get('owner') || undefined;
  return NextResponse.json(svc.getDeals(user.organizationId, page, limit, stage, owner));
});

export const POST = withAuth(async (request: NextRequest, user) => {
  const body = await request.json();
  const deal = svc.createDeal(body, user.organizationId, user.userId);
  return NextResponse.json(deal, { status: 201 });
});
