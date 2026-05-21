import { NextRequest, NextResponse } from 'next/server';
import { MfaService } from '@/lib/services/mfa.service';

export async function POST(request: NextRequest) {
  try {
    const { token, attemptId } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const result = await MfaService.approveMfaToken(token, attemptId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, attemptId: result.attemptId });
  } catch {
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 });
  }
}

/** Legacy email links — redirect to the human confirmation page */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const attemptId = request.nextUrl.searchParams.get('attemptId');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const params = new URLSearchParams({ token });
  if (attemptId) params.set('attemptId', attemptId);

  return NextResponse.redirect(new URL(`/mfa/approve?${params.toString()}`, request.url));
}
