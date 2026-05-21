import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getAuditFeed, revokeUserSession, getAuditAlertRules, saveAuditAlertRule } from '@/lib/services/admin.service';
import { getUsers } from '@/lib/services/admin.service';

export const GET = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const { searchParams } = new URL(req.url);
  const events = getAuditFeed(user.organizationId, {
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    userId: searchParams.get('userId') ?? undefined,
    actionType: searchParams.get('actionType') ?? undefined,
    riskLevel: searchParams.get('riskLevel') ?? undefined,
  });
  const users = getUsers(user.organizationId);
  const rules = getAuditAlertRules(user.organizationId);
  return NextResponse.json({ events, users, rules });
});

export const POST = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const body = await req.json();
  if (body.action === 'revoke-session') {
    revokeUserSession(body.userId, user.userId, body.userName ?? 'Admin', user.organizationId);
    return NextResponse.json({ success: true });
  }
  if (body.action === 'save-rule') {
    const id = saveAuditAlertRule(user.userId, body);
    return NextResponse.json({ id });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
});
