import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import {
  getBackupSummary,
  createBackup,
  getBackupFile,
  deleteBackup,
} from '@/lib/services/admin.service';
import { createAuditLog } from '@/lib/services/audit-logs.service';
import { getDb } from '@/lib/db';

export const GET = withAuth(async (req: NextRequest, user) => {
  requireRole(user, 'admin');
  const { searchParams } = new URL(req.url);
  const downloadId = searchParams.get('download');

  if (downloadId) {
    const file = getBackupFile(user.organizationId, downloadId);
    if (!file) {
      return NextResponse.json({ error: 'Backup file not found.' }, { status: 404 });
    }
    const buffer = fs.readFileSync(file.path);
    const db = getDb();
    const adminRow = db.prepare('SELECT name FROM users WHERE id = ?').get(user.userId) as { name: string };
    createAuditLog(
      user.organizationId,
      user.userId,
      adminRow?.name ?? 'Admin',
      'Backup download',
      'Settings',
      `Downloaded backup ${downloadId}`,
      'backup',
      downloadId
    );
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  }

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
    // For a self-hosted SQLite app, a true automatic restore requires
    // taking the app offline and swapping the DB file. We keep the
    // backup files on disk and instruct the admin to download + replace
    // manually (or run the bundled CLI). The action still logs an
    // audit entry.
    const db = getDb();
    const adminRow = db.prepare('SELECT name FROM users WHERE id = ?').get(user.userId) as { name: string };
    createAuditLog(
      user.organizationId,
      user.userId,
      adminRow?.name ?? 'Admin',
      'Restore requested',
      'Settings',
      `Requested restore from backup ${body.backupId}`,
      'backup',
      body.backupId
    );
    return NextResponse.json({
      success: true,
      message:
        'Restore request logged. Download the backup file from this page and stop the app before swapping it with data/crm.db.',
    });
  }
  const id = createBackup(user.organizationId, 'manual');
  const db = getDb();
  const adminRow = db.prepare('SELECT name FROM users WHERE id = ?').get(user.userId) as { name: string };
  createAuditLog(
    user.organizationId,
    user.userId,
    adminRow?.name ?? 'Admin',
    'Backup created',
    'Settings',
    'Manual backup created',
    'backup',
    id
  );
  return NextResponse.json({ id });
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  requireRole(user, 'admin');
  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Backup id is required.' }, { status: 400 });
  }
  deleteBackup(user.organizationId, id);
  return NextResponse.json({ success: true });
});
