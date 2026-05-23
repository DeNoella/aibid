import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { saveGeneratedAvatar } from '@/lib/services/avatar.service';
import { getUserById } from '@/lib/services/auth.service';
import { getErrorMessage, getErrorStatus } from '@/lib/validation';
import type { AvatarGender } from '@/lib/utils/avatar-generator';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json().catch(() => ({}));
    const profile = getUserById(user.userId);
    if (!profile) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const gender: AvatarGender = body?.gender === 'male' ? 'male' : 'female';
    const seed = typeof body?.seed === 'string' && body.seed.trim()
      ? body.seed.trim()
      : `${profile.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const avatarUrl = saveGeneratedAvatar(user.userId, { gender, seed });
    return NextResponse.json({ avatarUrl, user: { ...profile, avatarUrl } });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, 'Could not generate avatar.') },
      { status: getErrorStatus(err, 400) }
    );
  }
});
