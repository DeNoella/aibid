import { initializeDatabase } from './db';
import { deleteUser } from './services/admin.service';

const EMAIL = 'angenoella1771@gmail.com';

const db = initializeDatabase();
const user = db.prepare('SELECT id, organization_id FROM users WHERE email = ?').get(EMAIL) as
  | { id: string; organization_id: string }
  | undefined;

if (!user) {
  console.log(`User ${EMAIL} not found — nothing to delete.`);
  process.exit(0);
}

const admin = db.prepare("SELECT id FROM users WHERE organization_id = ? AND role = 'admin' LIMIT 1").get(user.organization_id) as
  | { id: string }
  | undefined;

if (!admin) {
  console.error('No admin found in organization to perform cleanup.');
  process.exit(1);
}

deleteUser(user.id, admin.id);

const remaining = db.prepare('SELECT email, name, role FROM users').all();
console.log(`Deleted ${EMAIL}`);
console.log(JSON.stringify({ remaining }, null, 2));
