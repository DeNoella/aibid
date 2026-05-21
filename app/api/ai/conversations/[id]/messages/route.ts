import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/ai.service';

export const GET = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  return NextResponse.json(svc.getMessages(id));
});

export const POST = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const { content, fileContext } = await request.json();
  if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

  const messageContent = fileContext?.rows?.length
    ? `${content}\n\n[File context: ${fileContext.filename}, ${fileContext.rows.length} rows, columns: ${(fileContext.columns ?? []).join(', ')}]`
    : content;

  const result = await svc.sendMessage(id, messageContent, user.organizationId, fileContext);
  return NextResponse.json(result, { status: 201 });
});
