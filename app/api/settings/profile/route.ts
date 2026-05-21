import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/settings.service';

export const GET = withAuth((request: NextRequest, user) => {
  const profile = svc.getProfile(user.userId);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  return NextResponse.json(profile);
});

export const PUT = withAuth(async (request: NextRequest, user) => {
  const body = await request.json();
  return NextResponse.json(svc.updateProfile(user.userId, body));
});
