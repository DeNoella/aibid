import Database from 'better-sqlite3';
import path from 'path';
import { schema } from './schema';
import { runMigrations } from './migrations';

let db: Database.Database;

export function initializeDatabase(): Database.Database {
  const dbPath = path.resolve(process.cwd(), 'data/crm.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(schema);

  // Migration: add subscription_status if it doesn't exist yet
  try {
    db.exec("ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'free_trial' CHECK(subscription_status IN ('free_trial','premium'))");
  } catch {
    // Column already exists — safe to ignore
  }

  runMigrations(db);

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}
