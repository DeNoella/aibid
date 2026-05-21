import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getAuditTimeline } from '@/lib/services/audit-logs.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit')) || 5;
  return NextResponse.json(getAuditTimeline(user.organizationId, limit));
});
