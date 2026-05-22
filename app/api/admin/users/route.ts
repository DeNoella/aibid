import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { requireRole } from '@/lib/api-auth';
import { getUsers, createUser } from '@/lib/services/admin.service';

export const GET = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const { searchParams } = new URL(req.url);
  const users = getUsers(
    searchParams.get('search') ?? undefined,
    searchParams.get('role') ?? undefined,
    searchParams.get('status') ?? undefined
  );
  return NextResponse.json(users);
});

export const POST = withAuth(async (req, user) => {
  requireRole(user, 'admin');
  const body = await req.json();
  const result = createUser(user.organizationId, body);
  return NextResponse.json(result, { status: 201 });
});
