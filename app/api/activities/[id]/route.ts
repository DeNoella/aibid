import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/activities.service';

export const PUT = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const body = await request.json();
  return NextResponse.json(svc.updateActivity(id, body, user.organizationId));
});

export const DELETE = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  svc.deleteActivity(id, user.organizationId);
  return NextResponse.json({ message: 'Deleted' });
});
