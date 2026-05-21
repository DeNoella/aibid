import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getNotifications, updateNotification, getAnalystAlertRules, createAnalystAlertRule, deleteAnalystAlertRule } from '@/lib/services/notifications.service';

export const GET = withAuth(async (req, user) => {
  const tab = new URL(req.url).searchParams.get('tab');
  if (tab === 'rules') {
    return NextResponse.json(getAnalystAlertRules(user.userId));
  }
  return NextResponse.json(getNotifications(user.userId));
});

export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  if (body.action === 'create-rule') {
    const id = createAnalystAlertRule(user.userId, body);
    return NextResponse.json({ id });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
});

export const PATCH = withAuth(async (req, user) => {
  const body = await req.json();
  updateNotification(body.id, user.userId, body.updates);
  return NextResponse.json({ success: true });
});

export const DELETE = withAuth(async (req, user) => {
  const { searchParams } = new URL(req.url);
  const ruleId = searchParams.get('ruleId');
  if (ruleId) {
    deleteAnalystAlertRule(ruleId, user.userId);
  }
  return NextResponse.json({ success: true });
});
