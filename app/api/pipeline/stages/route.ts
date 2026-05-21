import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import * as svc from '@/lib/services/pipeline.service';

export const GET = withAuth((request: NextRequest, user) => {
  return NextResponse.json(svc.getStages(user.organizationId));
});

export const POST = withAuth(async (request: NextRequest, user) => {
  requireRole(user, 'admin');
  const body = await request.json();
  const stage = svc.createStage(body, user.organizationId);
  return NextResponse.json(stage, { status: 201 });
});
