import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { initializeDatabase } from './db';

const TARGET_EMAIL = 'mutesideno@gmail.com';

function resetToSingleAdmin() {
  const db = initializeDatabase();

  let target = db.prepare('SELECT * FROM users WHERE email = ?').get(TARGET_EMAIL) as {
    id: string;
    organization_id: string;
  } | undefined;

  let targetId: string;
  let orgId: string;
  let created = false;

  if (target) {
    targetId = target.id;
    orgId = target.organization_id;
    db.prepare(
      "UPDATE users SET role = 'admin', is_active = 1, subscription_status = 'premium', updated_at = datetime('now') WHERE id = ?"
    ).run(targetId);
  } else {
    const org = db.prepare('SELECT id FROM organizations LIMIT 1').get() as { id: string } | undefined;
    orgId = org?.id ?? uuid();
    if (!org) {
      db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(orgId, 'AIBID');
    }
    targetId = uuid();
    db.prepare(
      `INSERT INTO users (id, organization_id, email, password_hash, name, role, subscription_status, is_active)
       VALUES (?, ?, ?, ?, ?, 'admin', 'premium', 1)`
    ).run(targetId, orgId, TARGET_EMAIL, bcrypt.hashSync('password123', 10), 'System Admin');
    db.prepare('INSERT INTO user_preferences (id, user_id) VALUES (?, ?)').run(uuid(), targetId);
    created = true;
  }

  const otherUsers = db.prepare('SELECT id FROM users WHERE id != ?').all(targetId) as { id: string }[];

  const tx = db.transaction(() => {
    for (const { id } of otherUsers) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM mfa_attempts WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM login_history WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM pinned_metric WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM analyst_alert_rule WHERE analyst_id = ?').run(id);
      db.prepare('DELETE FROM ai_conversations WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM report_recipe WHERE analyst_id = ?').run(id);
      db.prepare('DELETE FROM scheduled_report WHERE created_by = ?').run(id);
      db.prepare('DELETE FROM audit_alert_rule WHERE admin_id = ?').run(id);

      db.prepare('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?').run(id);
      db.prepare('UPDATE ai_insights SET reviewed_by = NULL WHERE reviewed_by = ?').run(id);
      db.prepare('UPDATE companies SET created_by = NULL WHERE created_by = ?').run(id);
      db.prepare('UPDATE contacts SET created_by = NULL WHERE created_by = ?').run(id);
      db.prepare('UPDATE deals SET created_by = NULL WHERE created_by = ?').run(id);
      db.prepare('UPDATE deals SET owner_id = NULL WHERE owner_id = ?').run(id);
      db.prepare('UPDATE activities SET user_id = ? WHERE user_id = ?').run(targetId, id);
      db.prepare('UPDATE campaigns SET created_by = NULL WHERE created_by = ?').run(id);
      db.prepare('UPDATE reports SET created_by = NULL WHERE created_by = ?').run(id);
      db.prepare('UPDATE data_sources SET created_by = NULL WHERE created_by = ?').run(id);
      db.prepare('UPDATE model_alert_threshold SET updated_by = NULL WHERE updated_by = ?').run(id);
      db.prepare('UPDATE voice_query_log SET user_id = NULL WHERE user_id = ?').run(id);

      db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    }
  });

  tx();

  const remaining = db.prepare('SELECT email, name, role FROM users').all();
  console.log(JSON.stringify({ created, deleted: otherUsers.length, remaining }, null, 2));
}

resetToSingleAdmin();
