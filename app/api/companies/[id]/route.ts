import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import * as svc from '@/lib/services/companies.service';

export const GET = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const company = svc.getCompanyById(id, user.organizationId);
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  return NextResponse.json(company);
});

export const PUT = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  const body = await request.json();
  return NextResponse.json(svc.updateCompany(id, body, user.organizationId));
});

export const DELETE = withAuth(async (request: NextRequest, user, context) => {
  const { id } = await context.params;
  svc.deleteCompany(id, user.organizationId);
  return NextResponse.json({ message: 'Deleted' });
});
