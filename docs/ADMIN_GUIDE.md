# AIBID Admin Guide

A defense-ready walkthrough of every feature on the admin side. Each
section explains **what it does**, **why it exists**, **how it works
under the hood** (file paths so you can find them quickly), and the
**questions a defense panel is likely to ask**.

> Demo admin account
> - Email: `mutesideno@gmail.com`
> - Password: `Business1!`

---

## How an admin signs in

1. POST to `/api/auth/login` (`app/api/auth/login/route.ts`).
2. Service `loginUser` (`lib/services/auth.service.ts`) verifies the
   password, then calls `MfaService.generateMfaToken` and sends a
   one-time approval link to the admin's inbox via
   `EmailService.sendMagicLink`.
3. The browser is redirected to `/mfa/pending` with the attempt ID.
4. The admin clicks the magic link in their email; `MfaService.approveMfaToken`
   marks the attempt as approved.
5. The pending page polls `/api/mfa/status` and, once approved, calls
   `/api/mfa/complete` which returns a JWT.

**Why MFA-by-email?** It avoids storing a TOTP secret and works on any
device with email — the simplest second factor that still beats
password-only login.

---

## 1. System Overview — `/admin/overview`

**Page:** `app/(protected)/admin/overview/page.tsx`
**API:** `app/api/admin/overview/route.ts`, `app/api/admin/tasks/route.ts`
**Service:** `getAdminOverview` and the admin-task helpers in `lib/services/admin.service.ts`

### What it shows
- **Active users** — count of users where `is_active = 1`.
- **New today** — accounts created since midnight.
- **Online last 24h** — users whose `last_login` is within 24h.
- **AI status** — green/amber/red based on the worst model accuracy.
- **Pending tasks** — both system-detected and admin-created.
- **Service status** — health of background services.
- **Recent activity** — last 8 audit log entries.
- **Critical alerts** — audit entries with `risk_level = 'critical'`.

### Live updates (real-time-ish)
The page calls `loadOverview` once on mount, then every **10 seconds**
in the background. If the user count changes between polls a toast
notification fires, so the admin sees "User count updated: +1 new"
within seconds of an analyst creating an account.

### Pending tasks CRUD
- **Storage:** new table `admin_tasks` (see `lib/migrations.ts`).
- **Auto-generated** tasks have `source = 'system'` and a stable
  `system_key`. `syncSystemTasks` upserts them when the underlying
  condition is true and auto-marks them `done` once the condition
  clears.
- **Manual** tasks can be created, edited, status-changed, and deleted.
  System tasks can only be status-changed (delete is blocked server-side).

The 4 system tasks currently watched:
| Key | Condition |
|---|---|
| `role_assignment` | Active analysts with `department IS NULL` |
| `stale_sources` | Data sources not synced in 24h |
| `failed_backups` | Failed backups in the last 7 days |
| `low_accuracy_models` | Models below 80% accuracy or not Healthy |

### Defense Q&A
- **Q: Why poll instead of push?** SQLite + Next.js doesn't ship a
  websocket layer; polling every 10s is good enough for an admin
  console and avoids extra infra. Easy to upgrade to SSE later.
- **Q: How do system tasks resolve?** Each call to
  `syncSystemTasks` flips them to `done` when the SQL condition
  returns 0; the UI hides them on the next refresh.

---

## 2. User Management — `/admin/users`

**Page:** `app/(protected)/admin/users/page.tsx`
**API:** `app/api/admin/users/route.ts`, `app/api/admin/users/[id]/route.ts`, `app/api/admin/users/[id]/reset-password/route.ts`
**Service:** `lib/services/admin.service.ts` (`getUsers`, `createUser`, `updateUser`, `deleteUser`, `resetUserPassword`, `setUserActive`)

### What it does
Full CRUD over user accounts with:
- Search by name/email + filter by role/activity.
- Create user (generates a temporary password shown once).
- Edit name/email/role/department.
- Delete user (blocked if it would leave zero active admins).
- Reset password (rotates `password_hash`, sets
  `is_default_password = 1`, kills active sessions).
- Activate/deactivate (logs out the user immediately).

### Safety guarantees
- `purgeUserReferences` first NULL-s or reassigns every foreign-key
  reference (sessions, MFA attempts, login history, notifications, AI
  conversations, scheduled reports, audit rules) so we never violate
  referential integrity.
- `deleteUser` refuses to delete the only remaining active admin.

### Defense Q&A
- **Q: What happens to data created by a deleted analyst?** Their FK
  in tables like `companies.created_by` becomes `NULL`. Audit logs
  keep the `user_name` snapshot so we still know who did what.

---

## 3. Notifications — `/notifications` (now visible to admins too)

**Page:** `app/(protected)/notifications/page.tsx`
**APIs:** `app/api/notifications/route.ts`, `app/api/notifications/unread-count/route.ts`
**Service:** `lib/services/notifications.service.ts`
**Email helper:** `EmailService.sendAdminAlert` in `lib/services/email.service.ts`

### What an admin sees here
A live inbox of system events triggered by users:
| Event | Triggered by |
|---|---|
| New analyst account created | `registerUser` in `auth.service.ts` |
| New data uploaded | `app/api/data/upload/route.ts` |
| Report generated | `app/api/reports/builder/route.ts` (`generate` action) |
| Report downloaded | `app/api/reports/[id]/download/route.ts` |

All of these call the central `notifyAdmins(orgId, …)` helper.

### Two delivery channels, one call
`notifyAdmins` does two things for every active admin:
1. Inserts a row in `notifications` (so the bell badge updates).
2. Fires `EmailService.sendAdminAlert` via `setImmediate` so the
   originating request stays fast. If SMTP isn't configured the email
   silently no-ops, so the in-app inbox always still works.

### Bell badge in the top nav
`src/components/layout/TopNav.tsx` calls
`GET /api/notifications/unread-count` on mount and every 15 seconds
and renders the number (capped at "99+"). Opening the notifications
page calls `POST /api/notifications/unread-count` which marks
everything read so the badge clears.

### Defense Q&A
- **Q: What if SMTP is down?** Email failure is swallowed; the in-app
  inbox + bell badge still works.
- **Q: How do you avoid spamming admins on bulk events?** Each event
  is a separate row, but the UI shows them collapsed by priority.
  This is a deliberate trade-off — easy to add a "digest" later but
  more useful for a defense to show real-time per-event arrivals.

---

## 4. AI Model Health — `/admin/ai-health`

**Page:** `app/(protected)/admin/ai-health/page.tsx`
**API:** `app/api/admin/ai-health/route.ts`
**Service:** `getModelHealth`, `retrainModel`, `getModelThreshold`, `setModelThreshold`, `getNlpMetrics`

### What it does
Tracks 4 predictive models stored in `predictive_model`:
- **Trend Detector** (TREND) — spots upward/downward changes.
- **Anomaly Detector** (ANOMALY) — flags unusual spikes/drops.
- **Forecasting Model** (PREDICTION) — estimates future numbers.
- **NLP Query Parser** (NLP) — understands natural-language questions.

Each card now shows accuracy as **"correct N out of every 100 times"**
with a plain-language status (Healthy / Keep an eye on it / Needs
retraining) so a non-technical reviewer can read the page without
knowing what "accuracy" means.

The **alert threshold** slider sets the confidence below which AI
insights are quarantined for analyst review (see
`setModelThreshold` → `UPDATE ai_insights SET low_confidence_pending = 1`).

### Real-time behaviour
Polls every 15 seconds. If a model's accuracy changes by ≥ 2 pp
between polls a toast announces "Trend Detector accuracy changed:
91.0% → 93.5%".

### Defense Q&A
- **Q: Are the models real ML?** They are placeholder models with
  simulated retraining (accuracy bumps up by ~0.02 when retrained).
  The infrastructure — `model_performance_log`,
  threshold-based quarantine, false positive tracking — is real and
  can drop in scikit-learn / Python services without UI changes.
- **Q: What is the "false positive rate"?** Out of all anomaly
  insights generated, the share an analyst explicitly marked as a
  false positive (`ai_insights.marked_as_false_positive`).

---

## 5. Audit & Governance — `/admin/audit`

**Page:** `app/(protected)/admin/audit/page.tsx`
**API:** `app/api/admin/audit/route.ts`, `app/api/admin/audit/export/route.ts`
**Service:** `getAuditFeed`, `getUserActivityLogs`, `revokeUserSession`, `getAuditAlertRules`, `saveAuditAlertRule`

### Two tabs
- **Log management** — every audit log + every login attempt, merged
  in chronological order, filterable by user, module, date.
- **Security audit** — only events with a `risk_level` (critical / high
  / normal). Critical events get a "Revoke session" button that runs
  `DELETE FROM sessions WHERE user_id = ?`.

### CSV export
`/admin/audit/export` streams a CSV download honoring the same
filters as the page. Useful for compliance exports.

### Where audit entries come from
Every state-changing endpoint (data upload, report generation, report
download, backup creation/restore request, user CRUD, session revoke,
maintenance toggle) writes an `audit_logs` row via
`createAuditLog` in `lib/services/audit-logs.service.ts`.

### Defense Q&A
- **Q: How tamper-resistant is the audit trail?** Soft only — admins
  have DB access. Production would push to an append-only log
  (Postgres + row-level security, or an external SIEM).

---

## 6. Backup & Restore — `/admin/backup`

**Page:** `app/(protected)/admin/backup/page.tsx`
**API:** `app/api/admin/backup/route.ts`
**Service:** `getBackupSummary`, `createBackup`, `getBackupFile`, `deleteBackup`

### Why it exists
The whole platform lives in one SQLite file (`data/crm.db`). A backup
is a copy of that file at a moment in time. Without it, a corruption
or accidental delete is unrecoverable.

### How a backup actually works
1. `createBackup` uses better-sqlite3's `db.backup(file)` API, which
   produces an internally consistent copy even while the DB is being
   written to (no need to stop the app).
2. Falls back to `fs.copyFileSync` if the backup API is unavailable.
3. Inserts a row in `backup_records` with the resulting file size and
   `status = 'completed'`. Failures land as `'failed'`.

### How a restore actually works
SQLite isn't a swap-it-online database, so a real restore needs the
app to stop briefly:
1. The admin clicks **Download** to save the backup file to their
   computer.
2. Stops the app (`Ctrl+C` in the dev server).
3. Replaces `data/crm.db` with the downloaded file.
4. Restarts the app.

The UI explains these steps directly in plain English. The "Restore"
button still records an audit log entry so any restore attempt is
traceable.

### What changed for non-technical users
- The dashboard text now says **why** backups matter, not just lists
  numbers.
- Real disk usage from `data/backups/` replaces the previous fake
  "2.4 GB" placeholder.
- Auto-refresh every 20 seconds.
- Missing files are auto-detected and flipped to `status = 'missing'`.

### Defense Q&A
- **Q: Why isn't restore one-click?** SQLite serializes writes to a
  single file; replacing it while the process holds it open is
  unsafe. The honest answer (download → stop → swap → start) is what
  every real SQLite deployment uses.
- **Q: How do you prevent malicious restore?** The download endpoint
  is admin-only, audit-logged, and the file lives inside
  `data/backups/` which isn't web-served.

---

## 7. Maintenance — `/admin/maintenance`

**Page:** `app/(protected)/admin/maintenance/page.tsx`
**API:** `app/api/admin/maintenance/route.ts`
**Service:** `getMaintenanceConfig`, `setMaintenanceMode`, `getNotificationRules`, `saveNotificationRule`

### What it does (post-cleanup)
Two focused features:
1. **Maintenance mode** — when on, only admins can sign in. Reads
   `system_config['maintenance_mode']` in `middleware.ts` and shows a
   blocking overlay (`MaintenanceOverlay.tsx`) to analysts. Has an
   expected return time so analysts know when to come back.
2. **Notification rules** — admin chooses what system events
   (maintenance window starts / backup fails / AI drops below
   threshold) trigger email or in-app notifications.

### What was removed and why
- **Database optimization** (vacuum / reindex / clear cache) — these
  were placeholders that only wrote a timestamp; they didn't actually
  vacuum SQLite. Cutting them removed misleading buttons.
- **Performance metrics** (API/DB latency, memory, connections) —
  these were `Math.random()` numbers. Misleading on a capstone demo,
  so they're gone.

### Defense Q&A
- **Q: Why not real performance metrics?** A production deployment
  would source those from Next.js telemetry / Prometheus / Datadog.
  Faking them in the UI hurts trust, so we removed the fake numbers
  rather than pretend.

---

## 8. Data Sources — `/admin/datasources`

**Page:** `app/(protected)/admin/datasources/page.tsx`
**API:** `app/api/admin/datasources/route.ts`
**Service:** `lib/services/data-sources.service.ts`

Lets the admin see all configured data sources, their quality score,
last sync time, and per-source sync logs. Pausing / resuming a sync
flips `data_sources.sync_paused`. Quality is a composite of
completeness, duplicate %, and missing values stored on each row.

When an analyst uploads new data through `/data/upload`, the row
counts and quality scores end up here.

---

## Cross-cutting building blocks

### `withAuth` (lib/api-utils.ts)
Every admin route wraps its handler in `withAuth` which:
- Verifies the JWT.
- Catches `AuthError`, `AppError`, and unknown exceptions; maps them
  to clean JSON responses.

### `requireRole` (lib/api-auth.ts)
After `withAuth` validates the JWT, `requireRole(user, 'admin')`
guards admin-only endpoints. The check is `user.role === 'admin'` and
throws an `AuthError(403)` otherwise.

### `RoleGuard` (src/components/layout/RoleGuard.tsx)
Client-side role guard for pages. The admin layout
(`app/(protected)/admin/layout.tsx`) wraps everything in
`<RoleGuard allowedRoles={['admin']}>` so analysts get redirected to
`/dashboard` if they navigate manually.

### Database
- SQLite via better-sqlite3 (`lib/db.ts`).
- Schema in `lib/schema.ts`, schema upgrades in `lib/migrations.ts`.
- Created lazily on first request — `data/crm.db` is auto-created if
  the folder is missing.

### Email
- Single `EmailService` (lib/services/email.service.ts) with three
  templates: magic-link, welcome, admin alert.
- SMTP creds come from `.env`. If the env vars are missing every
  method short-circuits (no email sent) without throwing — the rest of
  the app keeps working.

---

## What I'd say in a defense in one paragraph

> The admin side of AIBID is built around five real concerns: who is
> in the system, what the AI is doing, what users are doing, how to
> recover when things break, and how to take the app offline cleanly.
> Each concern has its own page, its own SQLite-backed service, and
> its own audit trail. The dashboard auto-refreshes every 10 seconds
> and pushes admin-targeted in-app + email notifications whenever
> users upload data, generate reports, download reports, or create
> accounts. Backups are real SQLite snapshots; restores are explicit
> because SQLite holds the file exclusively while running. The whole
> admin surface uses one `withAuth + requireRole('admin')` pattern
> for authorization and one `notifyAdmins` helper for cross-cutting
> alerts, which is what makes it easy to extend.
