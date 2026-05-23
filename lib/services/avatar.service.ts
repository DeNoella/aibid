import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import {
  AvatarGender,
  buildMemojiSvg,
  svgToDataUrl,
} from '@/lib/utils/avatar-generator';

const AVATAR_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function ensureAvatarDir() {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

function removeExistingAvatars(userId: string) {
  if (!fs.existsSync(AVATAR_DIR)) return;
  for (const file of fs.readdirSync(AVATAR_DIR)) {
    if (file.startsWith(`${userId}.`) || file.startsWith(`${userId}-`)) {
      try {
        fs.unlinkSync(path.join(AVATAR_DIR, file));
      } catch {
        // Ignore - file may have already been removed
      }
    }
  }
}

function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

function persistAvatarUrl(userId: string, avatarUrl: string) {
  const db = getDb();
  db.prepare("UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?").run(avatarUrl, userId);
}

/**
 * Generate a system avatar and store it as a data URL directly in the database.
 * This avoids any filesystem I/O so it is instant even on slow disks (e.g. OneDrive).
 */
export function saveGeneratedAvatar(
  userId: string,
  options: { gender?: AvatarGender; seed?: string } = {}
): string {
  const svg = buildMemojiSvg({
    gender: options.gender ?? 'female',
    seed: options.seed ?? userId,
  });
  const avatarUrl = svgToDataUrl(svg);

  // Stored avatars from previous file-based generation are still cleaned up so
  // we never leave orphaned files behind.
  removeExistingAvatars(userId);
  persistAvatarUrl(userId, avatarUrl);
  return avatarUrl;
}

export function saveUploadedAvatar(userId: string, buffer: Buffer, mimeType: string) {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error('Unsupported image type. Use JPG, PNG, WEBP, or GIF.');
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('Image must be 5MB or smaller.');
  }

  ensureAvatarDir();
  removeExistingAvatars(userId);

  const ext = extensionForMime(mimeType);
  const filename = `${userId}.${ext}`;
  fs.writeFileSync(path.join(AVATAR_DIR, filename), buffer);

  const avatarUrl = `/uploads/avatars/${filename}?v=${Date.now()}`;
  persistAvatarUrl(userId, avatarUrl);
  return avatarUrl;
}

export function markProfileSetupComplete(userId: string) {
  const db = getDb();
  db.prepare("UPDATE users SET profile_setup_completed = 1, updated_at = datetime('now') WHERE id = ?").run(userId);
}

export function isProfileSetupComplete(userId: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT profile_setup_completed FROM users WHERE id = ?').get(userId) as { profile_setup_completed?: number } | undefined;
  return !!row?.profile_setup_completed;
}
