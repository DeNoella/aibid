import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getAuditFeed } from '@/lib/services/admin.service';

export const GET = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const { searchParams } = new URL(req.url);
  const events = getAuditFeed(user.organizationId, {
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    userId: searchParams.get('userId') ?? undefined,
    actionType: searchParams.get('actionType') ?? undefined,
    riskLevel: searchParams.get('riskLevel') ?? undefined,
  }) as Record<string, unknown>[];

  const header = 'Timestamp,User,Action,Module,Details,IP,Risk Level\n';
  const rows = events.map((e) =>
    [e.created_at, e.user_name, e.action, e.module, e.details, e.ip_address, e.risk_level]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  ).join('\n');

  return new NextResponse(header + rows, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="audit-log.csv"',
    },
  });
});
