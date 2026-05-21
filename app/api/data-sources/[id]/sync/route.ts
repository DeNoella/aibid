import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { syncDataSource } from '@/lib/services/data-sources.service';

export const POST = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const ds = syncDataSource(id, user.organizationId);
  return NextResponse.json(ds);
});
