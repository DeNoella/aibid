import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/deals.service';

export const GET = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const deal = svc.getDealById(id, user.organizationId);
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  return NextResponse.json(deal);
});

export const PUT = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const body = await request.json();
  return NextResponse.json(svc.updateDeal(id, body, user.organizationId));
});

export const DELETE = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  svc.deleteDeal(id, user.organizationId);
  return NextResponse.json({ message: 'Deleted' });
});
