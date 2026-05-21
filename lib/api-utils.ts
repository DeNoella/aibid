import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from './api-auth';
import type { JwtPayload } from './auth';
import { AppError } from './validation';

type RouteContext = { params: Promise<Record<string, string>> };

type AuthenticatedHandler = (
  request: NextRequest,
  user: JwtPayload,
  context: RouteContext
) => NextResponse | Promise<NextResponse>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      const user = requireAuth(request);
      return await handler(request, user, context);
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      if (error instanceof AppError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      console.error('API Error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
