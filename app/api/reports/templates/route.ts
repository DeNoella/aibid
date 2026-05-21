import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getReportTemplates } from '@/lib/services/reports.service';

export const GET = withAuth((request: NextRequest) => {
  return NextResponse.json(getReportTemplates());
});
