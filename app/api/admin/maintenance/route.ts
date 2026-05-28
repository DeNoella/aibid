import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import {
  getMaintenanceConfig,
  setMaintenanceMode,
  getNotificationRules,
  saveNotificationRule,
} from '@/lib/services/admin.service';

export const GET = withAuth(async (_req, user) => {
  requireRole(user, 'admin');
  return NextResponse.json({
    maintenance: getMaintenanceConfig(),
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
  if (body.action === 'notification-rule') {
    const id = saveNotificationRule(user.organizationId, body);
    return NextResponse.json({ id });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
});
