import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getSessions } from '@/lib/services/settings.service';

export const GET = withAuth((request: NextRequest, user) => {
  return NextResponse.json(getSessions(user.userId));
});
