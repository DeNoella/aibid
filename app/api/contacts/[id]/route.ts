import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/contacts.service';

export const GET = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const contact = svc.getContactById(id, user.organizationId);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  return NextResponse.json(contact);
});

export const PUT = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const body = await request.json();
  return NextResponse.json(svc.updateContact(id, body, user.organizationId));
});

export const DELETE = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  svc.deleteContact(id, user.organizationId);
  return NextResponse.json({ message: 'Deleted' });
});
