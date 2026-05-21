import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getAdminOverview } from '@/lib/services/admin.service';

export const GET = withAuth(async (_req, user) => {
  requireRole(user, 'admin');
  return NextResponse.json(getAdminOverview(user.organizationId));
});
