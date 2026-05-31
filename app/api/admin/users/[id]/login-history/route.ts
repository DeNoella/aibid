import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getLoginHistory } from '@/lib/services/admin.service';

export const GET = withAuth(async (_req, user, ctx) => {
  requireRole(user, 'admin');
  const { id } = await ctx.params;
  return NextResponse.json(getLoginHistory(id, 20));
});
