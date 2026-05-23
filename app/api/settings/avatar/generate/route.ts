import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { saveGeneratedAvatar } from '@/lib/services/avatar.service';
import { getUserById } from '@/lib/services/auth.service';
import { getErrorMessage, getErrorStatus } from '@/lib/validation';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json().catch(() => ({}));
    const profile = getUserById(user.userId);
    if (!profile) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const seed = typeof body?.seed === 'string' && body.seed.trim() ? body.seed.trim() : `${profile.name}-${Date.now()}`;
    const avatarUrl = saveGeneratedAvatar(user.userId, profile.name, seed);
    return NextResponse.json({ avatarUrl, user: getUserById(user.userId) });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, 'Could not generate avatar.') },
      { status: getErrorStatus(err, 400) }
    );
  }
});
