import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getBackupSummary, createBackup } from '@/lib/services/admin.service';
import { getDb } from '@/lib/db';

export const GET = withAuth(async (_req, user) => {
  requireRole(user, 'admin');
  return NextResponse.json(getBackupSummary(user.organizationId));
});

export const POST = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const body = await req.json();
  if (body.action === 'schedule') {
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('backup_schedule', ?, datetime('now'))").run(JSON.stringify(body.schedule));
    return NextResponse.json({ success: true });
  }
  if (body.action === 'restore') {
    return NextResponse.json({ success: true, message: 'Restore initiated' });
  }
  const id = createBackup(user.organizationId, 'manual');
  return NextResponse.json({ id });
});
