import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import {
  listAdminTasks,
  createAdminTask,
  updateAdminTask,
  deleteAdminTask,
} from '@/lib/services/admin.service';

export const GET = withAuth(async (req: NextRequest, user) => {
  requireRole(user, 'admin');
  const status = (new URL(req.url).searchParams.get('status') ?? 'all') as
    | 'open'
    | 'in_progress'
    | 'done'
    | 'all';
  return NextResponse.json(listAdminTasks(user.organizationId, status));
});

export const POST = withAuth(async (req: NextRequest, user) => {
  requireRole(user, 'admin');
  const body = await req.json();
  const id = createAdminTask(user.organizationId, user.userId, {
    title: body.title,
    description: body.description,
    priority: body.priority,
    dueDate: body.dueDate,
  });
  return NextResponse.json({ id }, { status: 201 });
});

export const PATCH = withAuth(async (req: NextRequest, user) => {
  requireRole(user, 'admin');
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: 'Task id is required.' }, { status: 400 });
  }
  updateAdminTask(user.organizationId, body.id, {
    title: body.title,
    description: body.description,
    priority: body.priority,
    status: body.status,
    dueDate: body.dueDate,
  });
  return NextResponse.json({ success: true });
});

export const DELETE = withAuth(async (req: NextRequest, user) => {
  requireRole(user, 'admin');
  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Task id is required.' }, { status: 400 });
  }
  deleteAdminTask(user.organizationId, id);
  return NextResponse.json({ success: true });
});
