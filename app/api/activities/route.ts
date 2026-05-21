import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/activities.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('contactId') || undefined;
  const dealId = searchParams.get('dealId') || undefined;
  const type = searchParams.get('type') || undefined;
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  return NextResponse.json(svc.getActivities(user.organizationId, contactId, dealId, type, page, limit));
});

export const POST = withAuth(async (request: NextRequest, user) => {
  const body = await request.json();
  const activity = svc.createActivity(body, user.organizationId, user.userId);
  return NextResponse.json(activity, { status: 201 });
});
