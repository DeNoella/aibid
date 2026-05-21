import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getMaintenanceConfig, setMaintenanceMode, getPerformanceMetrics, getNotificationRules, saveNotificationRule } from '@/lib/services/admin.service';
import { getDb } from '@/lib/db';

export const GET = withAuth(async (_req, user) => {
  requireRole(user, 'admin');
  return NextResponse.json({
    maintenance: getMaintenanceConfig(),
    performance: getPerformanceMetrics(),
    notificationRules: getNotificationRules(user.organizationId),
  });
});

export const POST = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const body = await req.json();
  if (body.action === 'maintenance') {
    setMaintenanceMode(body.enabled, body.returnTime);
    return NextResponse.json({ success: true });
  }
  if (body.action === 'optimize') {
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, datetime('now'), datetime('now'))").run(`last_${body.task}`, new Date().toISOString());
    return NextResponse.json({ success: true });
  }
  if (body.action === 'notification-rule') {
    const id = saveNotificationRule(user.organizationId, body);
    return NextResponse.json({ id });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
});
