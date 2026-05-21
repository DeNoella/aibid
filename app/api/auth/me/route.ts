import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getUserById } from '@/lib/services/auth.service';

export const GET = withAuth((request: NextRequest, user) => {
  const profile = getUserById(user.userId);
  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json(profile);
});
