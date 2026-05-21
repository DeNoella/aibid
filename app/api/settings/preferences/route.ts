import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/settings.service';

export const GET = withAuth((request: NextRequest, user) => {
  return NextResponse.json(svc.getPreferences(user.userId));
});

export const PUT = withAuth(async (request: NextRequest, user) => {
  const body = await request.json();
  return NextResponse.json(svc.updatePreferences(user.userId, body));
});
