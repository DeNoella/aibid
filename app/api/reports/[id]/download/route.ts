import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getDb } from '@/lib/db';
import { createAuditLog } from '@/lib/services/audit-logs.service';
import { notifyAdmins } from '@/lib/services/notifications.service';
import { AppError } from '@/lib/validation';

interface ReportRow {
  id: string;
  title: string;
  type: string;
  status: string;
  config_json: string | null;
  generated_at: string | null;
  created_at: string;
  organization_id: string;
}

function recordDownload(report: ReportRow, userId: string, userName: string, role: string, orgId: string) {
  createAuditLog(
    orgId,
    userId,
    userName,
    'Report download',
    'Reports',
    `Downloaded report "${report.title}"`,
    'report',
    report.id
  );
  if (role !== 'admin') {
    notifyAdmins(orgId, {
      priority: 'LOW',
      title: 'Report downloaded',
      message: `${userName} downloaded the report "${report.title}".`,
      linkUrl: '/admin/audit',
      actorName: userName,
      actionLabel: 'Report download',
    });
  }
}

function reportToCsv(report: ReportRow): string {
  let config: Record<string, unknown> | null = null;
  try {
    config = report.config_json ? JSON.parse(report.config_json) : null;
  } catch {
    config = null;
  }

  const lines: string[] = [];
  lines.push('Field,Value');
  lines.push(`Title,"${report.title.replace(/"/g, '""')}"`);
  lines.push(`Type,${report.type}`);
  lines.push(`Status,${report.status}`);
  lines.push(`Generated,${report.generated_at ?? report.created_at}`);
  lines.push('');

  // Best-effort: include any tabular config (`charts`, `data`, `rows`).
  const tables: { name: string; rows: Record<string, unknown>[] }[] = [];
  if (config && Array.isArray(config.charts)) {
    for (const chart of config.charts as { title?: string; data?: Record<string, unknown>[] }[]) {
      if (Array.isArray(chart.data)) tables.push({ name: chart.title || 'Chart', rows: chart.data });
    }
  }
  if (config && Array.isArray(config.rows)) tables.push({ name: 'Data', rows: config.rows as Record<string, unknown>[] });

  for (const table of tables) {
    if (table.rows.length === 0) continue;
    lines.push('');
    lines.push(`# ${table.name}`);
    const headers = Object.keys(table.rows[0]);
    lines.push(headers.join(','));
    for (const row of table.rows) {
      lines.push(headers.map((h) => {
        const v = row[h];
        const s = v == null ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','));
    }
  }
  return lines.join('\n');
}

function safeFileName(title: string) {
  return title.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60) || 'report';
}

/**
 * Streams a CSV download of the report and logs the action.
 */
export const GET = withAuth(async (_req: NextRequest, user, context) => {
  const { id } = await context.params;
  const db = getDb();
  const report = db
    .prepare(
      'SELECT id, title, type, status, config_json, generated_at, created_at, organization_id FROM reports WHERE id = ? AND organization_id = ?'
    )
    .get(id, user.organizationId) as ReportRow | undefined;
  if (!report) throw new AppError('Report not found.', 404);

  const userRow = db.prepare('SELECT name FROM users WHERE id = ?').get(user.userId) as { name: string };
  recordDownload(report, user.userId, userRow.name, user.role, user.organizationId);

  const csv = reportToCsv(report);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeFileName(report.title)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});

/**
 * Older POST entry point retained for callers that just want to record
 * a download attempt without streaming the file.
 */
export const POST = withAuth(async (_req: NextRequest, user, context) => {
  const { id } = await context.params;
  const db = getDb();
  const report = db
    .prepare(
      'SELECT id, title, type, status, config_json, generated_at, created_at, organization_id FROM reports WHERE id = ? AND organization_id = ?'
    )
    .get(id, user.organizationId) as ReportRow | undefined;
  if (!report) throw new AppError('Report not found.', 404);
  const userRow = db.prepare('SELECT name FROM users WHERE id = ?').get(user.userId) as { name: string };
  recordDownload(report, user.userId, userRow.name, user.role, user.organizationId);
  return NextResponse.json({ success: true });
});
