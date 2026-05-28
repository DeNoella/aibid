import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { getDb } from '@/lib/db';

/**
 * Lightweight directory of every active AIBID user. Used to populate the
 * recipient picker for direct messages, so messaging works across
 * organizations.
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim();
  const includeSelf = searchParams.get('includeSelf') === '1';

  const db = getDb();
  let where = 'WHERE u.is_active = 1';
  const params: unknown[] = [];
  if (!includeSelf) {
    where += ' AND u.id != ?';
    params.push(user.userId);
  }
  if (search) {
    where += ' AND (u.name LIKE ? OR u.email LIKE ? OR o.name LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.avatar_url,
           u.organization_id, o.name AS organization_name
    FROM users u
    LEFT JOIN organizations o ON o.id = u.organization_id
    ${where}
    ORDER BY u.name
  `).all(...params);

  return NextResponse.json(rows);
});
