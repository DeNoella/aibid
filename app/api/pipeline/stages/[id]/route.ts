import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import * as svc from '@/lib/services/pipeline.service';

export const PUT = withAuth(async (request: NextRequest, user, context) => {
  requireRole(user, 'admin');
  const { id } = await context.params;
  const body = await request.json();
  return NextResponse.json(svc.updateStage(id, body, user.organizationId));
});

export const DELETE = withAuth(async (request: NextRequest, user, context) => {
  requireRole(user, 'admin');
  const { id } = await context.params;
  svc.deleteStage(id, user.organizationId);
  return NextResponse.json({ message: 'Deleted' });
});
