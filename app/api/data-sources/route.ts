import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/data-sources.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || undefined;
  return NextResponse.json(svc.getDataSources(user.organizationId, search));
});

export const POST = withAuth(async (request: NextRequest, user) => {
  const body = await request.json();
  const ds = svc.createDataSource(body, user.organizationId, user.userId);
  return NextResponse.json(ds, { status: 201 });
});
