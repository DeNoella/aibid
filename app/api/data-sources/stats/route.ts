import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getDataSourceStats } from '@/lib/services/data-sources.service';

export const GET = withAuth((request: NextRequest, user) => {
  return NextResponse.json(getDataSourceStats(user.organizationId));
});
