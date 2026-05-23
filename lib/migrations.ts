import type Database from 'better-sqlite3';

function safeExec(db: Database.Database, sql: string) {
  try {
    db.exec(sql);
  } catch {
    // Column/table already exists
  }
}

export function runMigrations(db: Database.Database) {
  // User fields
  safeExec(db, "ALTER TABLE users ADD COLUMN department TEXT");
  safeExec(db, "ALTER TABLE users ADD COLUMN last_login TEXT");
  safeExec(db, "ALTER TABLE users ADD COLUMN is_default_password INTEGER NOT NULL DEFAULT 0");
  safeExec(db, "ALTER TABLE users ADD COLUMN profile_setup_completed INTEGER NOT NULL DEFAULT 1");

  // AI insights review fields
  safeExec(db, "ALTER TABLE ai_insights ADD COLUMN marked_as_false_positive INTEGER NOT NULL DEFAULT 0");
  safeExec(db, "ALTER TABLE ai_insights ADD COLUMN analyst_note TEXT");
  safeExec(db, "ALTER TABLE ai_insights ADD COLUMN is_published INTEGER NOT NULL DEFAULT 0");
  safeExec(db, "ALTER TABLE ai_insights ADD COLUMN reviewed_by TEXT REFERENCES users(id)");
  safeExec(db, "ALTER TABLE ai_insights ADD COLUMN reviewed_at TEXT");
  safeExec(db, "ALTER TABLE ai_insights ADD COLUMN parent_insight_id TEXT REFERENCES ai_insights(id)");
  safeExec(db, "ALTER TABLE ai_insights ADD COLUMN low_confidence_pending INTEGER NOT NULL DEFAULT 0");
  safeExec(db, "ALTER TABLE ai_insights ADD COLUMN data_source_ids TEXT");

  // Data source extensions
  safeExec(db, "ALTER TABLE data_sources ADD COLUMN quality_score INTEGER NOT NULL DEFAULT 85");
  safeExec(db, "ALTER TABLE data_sources ADD COLUMN role_access TEXT DEFAULT '[\"analyst\"]'");
  safeExec(db, "ALTER TABLE data_sources ADD COLUMN sync_paused INTEGER NOT NULL DEFAULT 0");
  safeExec(db, "ALTER TABLE data_sources ADD COLUMN completeness REAL DEFAULT 95");
  safeExec(db, "ALTER TABLE data_sources ADD COLUMN duplicate_pct REAL DEFAULT 2");
  safeExec(db, "ALTER TABLE data_sources ADD COLUMN missing_values INTEGER DEFAULT 0");

  // Reports extensions
  safeExec(db, "ALTER TABLE reports ADD COLUMN natural_language_prompt TEXT");
  safeExec(db, "ALTER TABLE reports ADD COLUMN data_sources_used TEXT");
  safeExec(db, "ALTER TABLE reports ADD COLUMN recipe_id TEXT");
  safeExec(db, "ALTER TABLE reports ADD COLUMN export_format TEXT");
  safeExec(db, "ALTER TABLE reports ADD COLUMN expires_at TEXT");

  // Audit log extensions
  safeExec(db, "ALTER TABLE audit_logs ADD COLUMN severity TEXT DEFAULT 'normal'");
  safeExec(db, "ALTER TABLE audit_logs ADD COLUMN risk_level TEXT DEFAULT 'normal'");
  safeExec(db, "ALTER TABLE audit_logs ADD COLUMN user_agent TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS service_health (
      id              TEXT PRIMARY KEY,
      service_name    TEXT NOT NULL,
      status          TEXT NOT NULL CHECK(status IN ('UP','DEGRADED','DOWN')),
      last_checked    TEXT NOT NULL DEFAULT (datetime('now')),
      response_time_ms REAL,
      notes           TEXT
    );

    CREATE TABLE IF NOT EXISTS predictive_model (
      model_id        TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      name            TEXT NOT NULL,
      model_type      TEXT NOT NULL CHECK(model_type IN ('TREND','ANOMALY','PREDICTION','NLP')),
      current_accuracy REAL NOT NULL DEFAULT 0.9,
      last_retrained  TEXT,
      status          TEXT NOT NULL DEFAULT 'Healthy' CHECK(status IN ('Healthy','Watch','Critical')),
      version         TEXT DEFAULT '1.0',
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS model_performance_log (
      log_id          TEXT PRIMARY KEY,
      model_id        TEXT NOT NULL REFERENCES predictive_model(model_id),
      accuracy        REAL NOT NULL,
      false_positive_rate REAL,
      avg_processing_time_ms REAL,
      recorded_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS report_recipe (
      recipe_id       TEXT PRIMARY KEY,
      analyst_id      TEXT NOT NULL REFERENCES users(id),
      recipe_name     TEXT NOT NULL,
      natural_language_prompt TEXT NOT NULL,
      last_run        TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_report (
      schedule_id     TEXT PRIMARY KEY,
      recipe_id       TEXT NOT NULL REFERENCES report_recipe(recipe_id),
      frequency       TEXT NOT NULL CHECK(frequency IN ('DAILY','WEEKLY')),
      next_run        TEXT NOT NULL,
      recipients      TEXT NOT NULL,
      created_by      TEXT NOT NULL REFERENCES users(id),
      is_active       INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS analyst_alert_rule (
      rule_id         TEXT PRIMARY KEY,
      analyst_id      TEXT NOT NULL REFERENCES users(id),
      metric_name     TEXT NOT NULL,
      condition_type  TEXT NOT NULL CHECK(condition_type IN ('DROPS_BY','EXCEEDS','FALLS_BELOW')),
      threshold_value REAL NOT NULL,
      time_window     TEXT NOT NULL CHECK(time_window IN ('DAILY','WEEKLY')),
      delivery_method TEXT NOT NULL CHECK(delivery_method IN ('IN_APP','EMAIL','BOTH')),
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pinned_metric (
      pin_id          TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id),
      metric_key      TEXT NOT NULL,
      display_order   INTEGER NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_alert_rule (
      rule_id         TEXT PRIMARY KEY,
      admin_id        TEXT NOT NULL REFERENCES users(id),
      condition_description TEXT NOT NULL,
      condition_type  TEXT NOT NULL,
      threshold_value REAL,
      time_window_minutes INTEGER,
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      priority        TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH','URGENT')),
      title           TEXT NOT NULL,
      message         TEXT NOT NULL,
      link_url        TEXT,
      is_read         INTEGER NOT NULL DEFAULT 0,
      is_dismissed    INTEGER NOT NULL DEFAULT 0,
      needs_follow_up INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

    CREATE TABLE IF NOT EXISTS login_history (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip_address      TEXT,
      user_agent      TEXT,
      success         INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);

    CREATE TABLE IF NOT EXISTS data_source_sync_log (
      id              TEXT PRIMARY KEY,
      data_source_id  TEXT NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
      status          TEXT NOT NULL CHECK(status IN ('success','failure')),
      message         TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backup_records (
      id              TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      backup_type     TEXT NOT NULL CHECK(backup_type IN ('automatic','manual')),
      file_size       INTEGER NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'completed',
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key             TEXT PRIMARY KEY,
      value           TEXT NOT NULL,
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notification_rules (
      id              TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      event_type      TEXT NOT NULL,
      delivery_method TEXT NOT NULL CHECK(delivery_method IN ('IN_APP','EMAIL','BOTH')),
      target_roles    TEXT NOT NULL,
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS model_alert_threshold (
      id              TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      threshold_pct   REAL NOT NULL DEFAULT 80,
      updated_by      TEXT REFERENCES users(id),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS insight_validation_config (
      id              TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      auto_hold_threshold REAL NOT NULL DEFAULT 70,
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS voice_query_log (
      id              TEXT PRIMARY KEY,
      user_id         TEXT REFERENCES users(id),
      query_text      TEXT,
      resolution_time_ms REAL,
      success         INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
