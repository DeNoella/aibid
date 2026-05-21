import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { changePassword } from '@/lib/services/settings.service';

export const PUT = withAuth(async (request: NextRequest, user) => {
  const { currentPassword, newPassword } = await request.json();
  changePassword(user.userId, currentPassword, newPassword);
  return NextResponse.json({ message: 'Password updated' });
});
