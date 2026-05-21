import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';

export const POST = withAuth((request: NextRequest) => {
  return NextResponse.json({ message: 'Logged out successfully' });
});
