import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/contacts.service';

export const GET = withAuth((request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const search = searchParams.get('search') || undefined;
  const stage = searchParams.get('stage') || undefined;
  return NextResponse.json(svc.getContacts(user.organizationId, page, limit, search, stage));
});

export const POST = withAuth(async (request: NextRequest, user) => {
  const body = await request.json();
  const contact = svc.createContact(body, user.organizationId, user.userId);
  return NextResponse.json(contact, { status: 201 });
});
