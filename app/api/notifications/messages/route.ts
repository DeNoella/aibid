import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { sendDirectMessage } from '@/lib/services/notifications.service';
import { createAuditLog } from '@/lib/services/audit-logs.service';

/**
 * Send a direct user-to-user message. Body shape:
 *   {
 *     recipientIds: string[],
 *     subject: string,
 *     body: string,
 *     priority?: 'LOW' | 'MEDIUM' | 'HIGH'
 *   }
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json();
  const db = getDb();
  const sender = db
    .prepare('SELECT name FROM users WHERE id = ?')
    .get(user.userId) as { name: string } | undefined;
  if (!sender) {
    return NextResponse.json({ error: 'Sender not found.' }, { status: 404 });
  }

  const result = sendDirectMessage(
    user.organizationId,
    { id: user.userId, name: sender.name },
    {
      recipientIds: body.recipientIds,
      subject: body.subject,
      body: body.body,
      priority: body.priority,
    }
  );

  createAuditLog(
    user.organizationId,
    user.userId,
    sender.name,
    'Direct message sent',
    'Settings',
    `Sent "${String(body.subject).slice(0, 80)}" to ${result.delivered} recipient(s)`
  );

  return NextResponse.json(result, { status: 201 });
});
