import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { saveGeneratedAvatar, saveUploadedAvatar } from '@/lib/services/avatar.service';
import { getUserById } from '@/lib/services/auth.service';
import { getErrorMessage, getErrorStatus } from '@/lib/validation';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const avatarUrl = saveUploadedAvatar(user.userId, buffer, file.type || 'image/jpeg');
      return NextResponse.json({ avatarUrl, user: getUserById(user.userId) });
    }

    const body = await request.json();
    if (body?.imageData && typeof body.imageData === 'string') {
      const match = body.imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: 'Invalid image data.' }, { status: 400 });
      }

      const mimeType = match[1];
      const buffer = Buffer.from(match[2], 'base64');
      const avatarUrl = saveUploadedAvatar(user.userId, buffer, mimeType);
      return NextResponse.json({ avatarUrl, user: getUserById(user.userId) });
    }

    return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err, 'Could not upload profile picture.') },
      { status: getErrorStatus(err, 400) }
    );
  }
});
