import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import { createAuditLog } from '@/lib/services/audit-logs.service';

export const GET = withAuth(async (req, user) => {
  requireRole(user, 'analyst');
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  let where = 'WHERE organization_id = ? AND created_by = ?';
  const params: unknown[] = [user.organizationId, user.userId];
  if (search) { where += ' AND title LIKE ?'; params.push(`%${search}%`); }
  const reports = db.prepare(`SELECT * FROM reports ${where} ORDER BY created_at DESC`).all(...params);
  const recipes = db.prepare('SELECT * FROM report_recipe WHERE analyst_id = ? ORDER BY created_at DESC').all(user.userId);
  const scheduled = db.prepare(`
    SELECT sr.*, rr.recipe_name FROM scheduled_report sr
    JOIN report_recipe rr ON rr.recipe_id = sr.recipe_id
    WHERE sr.created_by = ?
  `).all(user.userId);
  return NextResponse.json({ reports, recipes, scheduled });
});

export const POST = withAuth(async (req, user) => {
  requireRole(user, 'analyst');
  const body = await req.json();
  const db = getDb();

  if (body.action === 'save-recipe') {
    const id = uuid();
    db.prepare('INSERT INTO report_recipe (recipe_id, analyst_id, recipe_name, natural_language_prompt) VALUES (?, ?, ?, ?)').run(
      id, user.userId, body.name, body.prompt
    );
    return NextResponse.json({ recipeId: id });
  }

  if (body.action === 'generate') {
    const id = uuid();
    const title = body.title ?? `Report — ${new Date().toLocaleDateString()}`;
    db.prepare(`INSERT INTO reports (id, organization_id, title, type, status, natural_language_prompt, data_sources_used, created_by, generated_at, file_size, config_json, expires_at) VALUES (?, ?, ?, ?, 'ready', ?, ?, ?, datetime('now'), ?, ?, datetime('now', '+30 days'))`).run(
      id, user.organizationId, title, body.reportType ?? 'custom', body.prompt, JSON.stringify(body.dataSources ?? []), user.userId,
      Math.floor(Math.random() * 5000000) + 100000, JSON.stringify(body.preview ?? {})
    );
    const userRow = db.prepare('SELECT name FROM users WHERE id = ?').get(user.userId) as { name: string };
    createAuditLog(user.organizationId, user.userId, userRow.name, 'Report download', 'Reports', `Generated report: ${title}`);
    return NextResponse.json({ reportId: id, preview: body.preview });
  }

  if (body.action === 'schedule') {
    const id = uuid();
    db.prepare('INSERT INTO scheduled_report (schedule_id, recipe_id, frequency, next_run, recipients, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, body.recipeId, body.frequency, body.nextRun, JSON.stringify(body.recipients), user.userId
    );
    return NextResponse.json({ scheduleId: id });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
});
