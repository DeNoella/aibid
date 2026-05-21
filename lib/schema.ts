export const schema = `
-- ===========================
-- Core Auth & Identity
-- ===========================

CREATE TABLE IF NOT EXISTS organizations (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    domain          TEXT,
    industry        TEXT,
    size            TEXT CHECK(size IN ('1-10','11-50','51-200','201-500','500+')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL,
    role            TEXT NOT NULL CHECK(role IN ('admin','analyst')) DEFAULT 'analyst',
    subscription_status TEXT NOT NULL DEFAULT 'free_trial' CHECK(subscription_status IN ('free_trial','premium')),
    avatar_url      TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    two_factor_enabled INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    ip_address      TEXT,
    user_agent      TEXT,
    expires_at      TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

CREATE TABLE IF NOT EXISTS user_preferences (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme           TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light','dark','system')),
    language        TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en','fr','rw')),
    timezone        TEXT NOT NULL DEFAULT 'cat',
    date_format     TEXT NOT NULL DEFAULT 'mdy' CHECK(date_format IN ('mdy','dmy','ymd')),
    notify_email    INTEGER NOT NULL DEFAULT 1,
    notify_push     INTEGER NOT NULL DEFAULT 1,
    notify_reports  INTEGER NOT NULL DEFAULT 0,
    notify_insights INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===========================
-- CRM Core
-- ===========================

CREATE TABLE IF NOT EXISTS companies (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    domain          TEXT,
    industry        TEXT,
    size            TEXT CHECK(size IN ('1-10','11-50','51-200','201-500','500+')),
    phone           TEXT,
    address         TEXT,
    city            TEXT,
    country         TEXT,
    website         TEXT,
    notes           TEXT,
    created_by      TEXT REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_companies_org ON companies(organization_id);

CREATE TABLE IF NOT EXISTS contacts (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    company_id      TEXT REFERENCES companies(id) ON DELETE SET NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    job_title       TEXT,
    lifecycle_stage TEXT CHECK(lifecycle_stage IN ('subscriber','lead','mql','sql','opportunity','customer','evangelist')) DEFAULT 'lead',
    source          TEXT CHECK(source IN ('organic','paid','referral','social','email','direct','other')),
    notes           TEXT,
    created_by      TEXT REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    position        INTEGER NOT NULL DEFAULT 0,
    probability     REAL NOT NULL DEFAULT 0,
    color           TEXT DEFAULT '#6b7280',
    is_won          INTEGER NOT NULL DEFAULT 0,
    is_lost         INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON pipeline_stages(organization_id);

CREATE TABLE IF NOT EXISTS deals (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    contact_id      TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    company_id      TEXT REFERENCES companies(id) ON DELETE SET NULL,
    stage_id        TEXT NOT NULL REFERENCES pipeline_stages(id),
    title           TEXT NOT NULL,
    value           REAL NOT NULL DEFAULT 0,
    currency        TEXT NOT NULL DEFAULT 'USD',
    expected_close_date TEXT,
    actual_close_date TEXT,
    probability     REAL,
    notes           TEXT,
    owner_id        TEXT REFERENCES users(id),
    created_by      TEXT REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_deals_org ON deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals(owner_id);

CREATE TABLE IF NOT EXISTS activities (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    type            TEXT NOT NULL CHECK(type IN ('call','email','meeting','note','task','follow_up')),
    subject         TEXT NOT NULL,
    description     TEXT,
    contact_id      TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id         TEXT REFERENCES deals(id) ON DELETE SET NULL,
    company_id      TEXT REFERENCES companies(id) ON DELETE SET NULL,
    user_id         TEXT NOT NULL REFERENCES users(id),
    due_date        TEXT,
    completed_at    TEXT,
    is_completed    INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activities_org ON activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);

-- ===========================
-- Campaigns & Analytics
-- ===========================

CREATE TABLE IF NOT EXISTS campaigns (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    type            TEXT CHECK(type IN ('email','social','ppc','display','content','referral','other')),
    status          TEXT NOT NULL CHECK(status IN ('draft','active','paused','completed','archived')) DEFAULT 'draft',
    budget          REAL DEFAULT 0,
    spent           REAL DEFAULT 0,
    start_date      TEXT,
    end_date        TEXT,
    target_audience TEXT,
    notes           TEXT,
    created_by      TEXT REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

CREATE TABLE IF NOT EXISTS campaign_metrics (
    id              TEXT PRIMARY KEY,
    campaign_id     TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date            TEXT NOT NULL,
    impressions     INTEGER NOT NULL DEFAULT 0,
    clicks          INTEGER NOT NULL DEFAULT 0,
    conversions     INTEGER NOT NULL DEFAULT 0,
    revenue         REAL NOT NULL DEFAULT 0,
    cost            REAL NOT NULL DEFAULT 0,
    leads_generated INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON campaign_metrics(date);

CREATE TABLE IF NOT EXISTS contact_campaign (
    contact_id      TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    campaign_id     TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    status          TEXT CHECK(status IN ('targeted','engaged','converted','unsubscribed')) DEFAULT 'targeted',
    added_at        TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (contact_id, campaign_id)
);

-- ===========================
-- Reports & AI
-- ===========================

CREATE TABLE IF NOT EXISTS report_templates (
    id              TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    name            TEXT NOT NULL,
    description     TEXT,
    type            TEXT NOT NULL CHECK(type IN ('weekly','monthly','quarterly','campaign','custom','executive')),
    config_json     TEXT,
    is_system       INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    template_id     TEXT REFERENCES report_templates(id),
    title           TEXT NOT NULL,
    type            TEXT NOT NULL,
    status          TEXT NOT NULL CHECK(status IN ('ready','generating','scheduled','failed')) DEFAULT 'generating',
    file_path       TEXT,
    file_size       INTEGER,
    config_json     TEXT,
    scheduled_at    TEXT,
    generated_at    TEXT,
    created_by      TEXT REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_org ON reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

CREATE TABLE IF NOT EXISTS ai_conversations (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT DEFAULT 'New Conversation',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);

CREATE TABLE IF NOT EXISTS ai_messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content         TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);

CREATE TABLE IF NOT EXISTS ai_insights (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    type            TEXT NOT NULL CHECK(type IN ('trend','anomaly','prediction','recommendation')),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    confidence      REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
    impact          TEXT NOT NULL CHECK(impact IN ('high','medium','low')),
    is_dismissed    INTEGER NOT NULL DEFAULT 0,
    source_data     TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_insights_org ON ai_insights(organization_id);

-- ===========================
-- Data Management & Audit
-- ===========================

CREATE TABLE IF NOT EXISTS data_sources (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('csv','database','api','json','excel')),
    connection_config TEXT,
    record_count    INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL CHECK(status IN ('active','syncing','error','disconnected')) DEFAULT 'active',
    sync_frequency  TEXT CHECK(sync_frequency IN ('realtime','hourly','daily','weekly','manual')),
    last_synced_at  TEXT,
    created_by      TEXT REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_data_sources_org ON data_sources(organization_id);

CREATE TABLE IF NOT EXISTS audit_logs (
    id              TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name       TEXT NOT NULL,
    action          TEXT NOT NULL,
    module          TEXT NOT NULL CHECK(module IN ('Dashboard','Reports','AI Analytics','Data Management','Settings','Auth','CRM')),
    details         TEXT,
    ip_address      TEXT,
    entity_type     TEXT,
    entity_id       TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS mfa_attempts (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    status          TEXT NOT NULL CHECK(status IN ('pending','approved','expired','used')) DEFAULT 'pending',
    expires_at      TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_user ON mfa_attempts(user_id);
`;
