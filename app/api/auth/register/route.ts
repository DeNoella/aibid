import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/services/auth.service';
import { getErrorMessage, getErrorStatus } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, organization } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }
    const result = await registerUser(name, email, password, organization || 'My Organization');
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, 'Registration failed') },
      { status: getErrorStatus(err, 400) }
    );
  }
}
