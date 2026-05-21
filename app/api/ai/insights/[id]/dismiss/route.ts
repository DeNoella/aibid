import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { dismissInsight } from '@/lib/services/ai.service';

export const POST = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  dismissInsight(id, user.organizationId);
  return NextResponse.json({ message: 'Dismissed' });
});
