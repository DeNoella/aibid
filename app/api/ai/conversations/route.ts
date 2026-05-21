import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/ai.service';

export const GET = withAuth((request: NextRequest, user) => {
  return NextResponse.json(svc.getConversations(user.userId));
});

export const POST = withAuth(async (request: NextRequest, user) => {
  const { title } = await request.json();
  const conversation = svc.createConversation(user.userId, title);
  return NextResponse.json(conversation, { status: 201 });
});
