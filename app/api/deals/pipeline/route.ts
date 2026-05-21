import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getDealsPipeline } from '@/lib/services/deals.service';

export const GET = withAuth((request: NextRequest, user) => {
  return NextResponse.json(getDealsPipeline(user.organizationId));
});
