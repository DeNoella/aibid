import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { createAuditLog } from '@/lib/services/audit-logs.service';
import { notifyAdmins } from '@/lib/services/notifications.service';
import { AppError } from '@/lib/validation';

/**
 * Records that a user downloaded (or attempted to download) a report.
 * The actual file download happens client-side; this endpoint exists so
 * the admin gets notified and the action is logged for audit.
 */
export const POST = withAuth(async (req: NextRequest, user, context) => {
  const { id } = await context.params;
  const db = getDb();
  const report = db
    .prepare('SELECT id, title, organization_id FROM reports WHERE id = ? AND organization_id = ?')
    .get(id, user.organizationId) as { id: string; title: string; organization_id: string } | undefined;
  if (!report) {
    throw new AppError('Report not found.', 404);
  }
  const userRow = db.prepare('SELECT name FROM users WHERE id = ?').get(user.userId) as { name: string };

  createAuditLog(
    user.organizationId,
    user.userId,
    userRow.name,
    'Report download',
    'Reports',
    `Downloaded report "${report.title}"`,
    'report',
    report.id
  );

  if (user.role !== 'admin') {
    notifyAdmins(user.organizationId, {
      priority: 'LOW',
      title: 'Report downloaded',
      message: `${userRow.name} downloaded the report "${report.title}".`,
      linkUrl: '/admin/audit',
      actorName: userRow.name,
      actionLabel: 'Report download',
    });
  }

  return NextResponse.json({ success: true });
});
