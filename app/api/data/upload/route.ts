import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { notifyAdmins } from '@/lib/services/notifications.service';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export const POST = withAuth(async (req, user) => {
  requireRole(user, 'analyst');
  const body = await req.json();
  const db = getDb();
  const userRow = db.prepare('SELECT name FROM users WHERE id = ?').get(user.userId) as { name: string };

  notifyAdmins(user.organizationId, {
    priority: 'MEDIUM',
    title: 'New data uploaded',
    message: `${userRow.name} uploaded ${body.fileName ?? 'data'} (${body.rowCount ?? '?'} rows) to ${body.category}. Quality score: ${body.qualityScore}%`,
    linkUrl: '/admin/datasources',
    actorName: userRow.name,
    actionLabel: 'Data upload',
  });

  db.prepare(`INSERT INTO audit_logs (id, organization_id, user_id, user_name, action, module, details) VALUES (?, ?, ?, ?, 'Data upload', 'Data Management', ?)`).run(
    uuid(), user.organizationId, user.userId, userRow.name, `Uploaded ${body.fileName} (${body.rowCount} rows) to ${body.category}. Quality: ${body.qualityScore}%`
  );

  return NextResponse.json({ success: true });
});
