import bcrypt from 'bcryptjs';
import { initializeDatabase } from './db';

const EMAIL = 'mutesideno@gmail.com';
const PASSWORD = 'Business1!';

const db = initializeDatabase();
const hash = bcrypt.hashSync(PASSWORD, 10);
const result = db.prepare(
  `UPDATE users SET password_hash = ?, is_default_password = 0, updated_at = datetime('now')
   WHERE email = ? AND role = 'admin'`
).run(hash, EMAIL);

if (result.changes === 0) {
  console.error(`No admin user found with email ${EMAIL}`);
  process.exit(1);
}

db.prepare('DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(EMAIL);

console.log(`Password updated for ${EMAIL}`);
