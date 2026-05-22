import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { updateUser, getUser, deleteUser } from '@/lib/services/admin.service';

export const GET = withAuth(async (_req, user, ctx) => {
  requireRole(user, 'admin');
  const { id } = await ctx.params;
  const profile = getUser(id);
  return NextResponse.json(profile);
});

export const PUT = withAuth(async (req, user, ctx) => {
  requireRole(user, 'admin');
  const { id } = await ctx.params;
  const body = await req.json();
  updateUser(id, body);
  return NextResponse.json({ success: true });
});

export const DELETE = withAuth(async (_req, user, ctx) => {
  requireRole(user, 'admin');
  const { id } = await ctx.params;
  deleteUser(id, user.userId);
  return NextResponse.json({ success: true });
});
