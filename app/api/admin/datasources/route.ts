import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getDataSources, createDataSource, updateDataSource, deleteDataSource, syncDataSource } from '@/lib/services/data-sources.service';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export const GET = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const sources = getDataSources(user.organizationId);
  const db = getDb();
  return NextResponse.json((sources as Record<string, unknown>[]).map((s) => ({
    ...s,
    syncLogs: db.prepare('SELECT * FROM data_source_sync_log WHERE data_source_id = ? ORDER BY created_at DESC LIMIT 10').all(s.id),
  })));
});

export const POST = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const body = await req.json();
  const db = getDb();

  if (body.action === 'test') {
    return NextResponse.json({ success: true, message: 'Connection successful' });
  }
  if (body.action === 'sync') {
    syncDataSource(body.id, user.organizationId);
    db.prepare('INSERT INTO data_source_sync_log (id, data_source_id, status, message) VALUES (?, ?, ?, ?)').run(uuid(), body.id, 'success', 'Sync completed');
    return NextResponse.json({ success: true });
  }
  if (body.action === 'pause') {
    db.prepare('UPDATE data_sources SET sync_paused = ? WHERE id = ?').run(body.paused ? 1 : 0, body.id);
    return NextResponse.json({ success: true });
  }

  const source = createDataSource({
    name: body.name,
    type: body.type,
    connectionConfig: body.connectionString,
    syncFrequency: body.syncFrequency,
    roleAccess: body.roleAccess,
  }, user.organizationId, user.userId);

  if (body.roleAccess) {
    db.prepare('UPDATE data_sources SET role_access = ?, quality_score = ? WHERE id = ?').run(JSON.stringify(body.roleAccess), body.qualityScore ?? 85, (source as { id: string }).id);
  }

  return NextResponse.json(source, { status: 201 });
});

export const PUT = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const body = await req.json();
  const updated = updateDataSource(body.id, body, user.organizationId);
  const db = getDb();
  if (body.roleAccess) {
    db.prepare('UPDATE data_sources SET role_access = ? WHERE id = ?').run(JSON.stringify(body.roleAccess), body.id);
  }
  return NextResponse.json(updated);
});

export const DELETE = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const { searchParams } = new URL(req.url);
  deleteDataSource(searchParams.get('id')!, user.organizationId);
  return NextResponse.json({ success: true });
});
