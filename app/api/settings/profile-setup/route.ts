import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { markProfileSetupComplete } from '@/lib/services/avatar.service';
import { getUserById } from '@/lib/services/auth.service';

export const POST = withAuth(async (_request: NextRequest, user) => {
  markProfileSetupComplete(user.userId);
  const profile = getUserById(user.userId);
  return NextResponse.json({ success: true, user: profile });
});
