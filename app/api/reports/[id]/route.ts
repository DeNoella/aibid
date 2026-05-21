import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getReportById } from '@/lib/services/reports.service';

export const GET = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const report = getReportById(id, user.organizationId);
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  return NextResponse.json(report);
});
