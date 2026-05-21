import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/reports.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  return NextResponse.json(svc.getReports(user.organizationId, status));
});

export const POST = withAuth(async (request: NextRequest, user) => {
  const body = await request.json();
  const report = svc.createReport(body, user.organizationId, user.userId);
  return NextResponse.json(report, { status: 201 });
});
