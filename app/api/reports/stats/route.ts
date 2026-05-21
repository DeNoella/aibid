import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getReportStats } from '@/lib/services/reports.service';

export const GET = withAuth((request: NextRequest, user) => {
  return NextResponse.json(getReportStats(user.organizationId));
});
