import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { resetUserPassword } from '@/lib/services/admin.service';

export const POST = withAuth(async (_req, user, ctx) => {
  requireRole(user, 'admin');
  const { id } = await ctx.params;
  const result = resetUserPassword(user.organizationId, id);
  return NextResponse.json(result);
});
