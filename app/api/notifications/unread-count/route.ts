import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getUnreadCount, markAllRead } from '@/lib/services/notifications.service';

export const GET = withAuth(async (_req, user) => {
  return NextResponse.json({ count: getUnreadCount(user.userId) });
});

export const POST = withAuth(async (_req, user) => {
  markAllRead(user.userId);
  return NextResponse.json({ success: true });
});
