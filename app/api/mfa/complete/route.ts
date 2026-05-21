import { v4 as uuid } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';
import { MfaService } from '@/lib/services/mfa.service';
import { getDb } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { attemptId } = await request.json();

    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId is required' }, { status: 400 });
    }

    const result = await MfaService.completeMfaLogin(attemptId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const db = getDb();
    const user = db
      .prepare('SELECT id, email, name, role, organization_id FROM users WHERE id = ? AND is_active = 1')
      .get(result.userId) as {
        id: string;
        email: string;
        name: string;
        role: string;
        organization_id: string;
      } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User account is unavailable' }, { status: 400 });
    }

    const jwt = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id,
    });

    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
    db.prepare('INSERT INTO login_history (id, user_id, ip_address, user_agent, success) VALUES (?, ?, ?, ?, 1)').run(
      uuid(),
      user.id,
      request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      request.headers.get('user-agent')
    );

    const redirectPath = user.role === 'admin' ? '/admin/overview' : '/dashboard';

    const response = NextResponse.json({
      token: jwt,
      redirectPath,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set('auth_token', jwt, {
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Could not complete login' }, { status: 500 });
  }
}
