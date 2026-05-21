import { NextRequest, NextResponse } from 'next/server';
import { MfaService } from '@/lib/services/mfa.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const attemptId = searchParams.get('attemptId');

  if (!attemptId) {
    return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
  }

  const status = await MfaService.getMfaStatus(attemptId);
  if (!status) {
    return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 });
  }

  return NextResponse.json({ status: status.status });
}

