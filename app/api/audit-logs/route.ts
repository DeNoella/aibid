import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getAuditLogs } from '@/lib/services/audit-logs.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const search = searchParams.get('search') || undefined;
  const module = searchParams.get('module') || undefined;
  const userId = searchParams.get('userId') || undefined;
  return NextResponse.json(getAuditLogs(user.organizationId, page, limit, search, module, userId));
});
