import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getMaintenanceConfig } from '@/lib/services/admin.service';

export const GET = withAuth(async () => {
  return NextResponse.json(getMaintenanceConfig());
});
