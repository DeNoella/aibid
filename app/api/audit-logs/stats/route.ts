import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getAuditStats } from '@/lib/services/audit-logs.service';

export const GET = withAuth((request: NextRequest, user) => {
  return NextResponse.json(getAuditStats(user.organizationId));
});
