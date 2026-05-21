import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { approveInsight, markFalsePositive, requestDrillDown } from '@/lib/services/insights.service';
import { createNotification } from '@/lib/services/notifications.service';
import { getDb } from '@/lib/db';

export const POST = withAuth(async (req, user, ctx) => {
  requireRole(user, 'analyst');
  const { id } = await ctx.params;
  const body = await req.json();

  if (body.action === 'approve') {
    approveInsight(user.organizationId, id, user.userId, body.note);
    const db = getDb();
    const analysts = db.prepare("SELECT id FROM users WHERE organization_id = ? AND role = 'analyst'").all(user.organizationId) as { id: string }[];
    for (const a of analysts) {
      createNotification(user.organizationId, a.id, { priority: 'MEDIUM', title: 'Insight published', message: 'An AI insight has been approved and published.', linkUrl: '/insights/validate' });
    }
    return NextResponse.json({ success: true });
  }
  if (body.action === 'false-positive') {
    markFalsePositive(user.organizationId, id, user.userId, body.note);
    return NextResponse.json({ success: true });
  }
  if (body.action === 'drill-down') {
    const childId = requestDrillDown(user.organizationId, id, body.question, user.userId);
    return NextResponse.json({ childId });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
});
