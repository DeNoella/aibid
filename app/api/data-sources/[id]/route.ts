import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/data-sources.service';

export const GET = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const ds = svc.getDataSourceById(id, user.organizationId);
  if (!ds) return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
  return NextResponse.json(ds);
});

export const PUT = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const body = await request.json();
  return NextResponse.json(svc.updateDataSource(id, body, user.organizationId));
});

export const DELETE = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  svc.deleteDataSource(id, user.organizationId);
  return NextResponse.json({ message: 'Deleted' });
});
