import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/services/auth.service';
import { getErrorMessage, getErrorStatus } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }
    const result = await loginUser(email, password);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, 'Login failed') },
      { status: getErrorStatus(err, 401) }
    );
  }
}
