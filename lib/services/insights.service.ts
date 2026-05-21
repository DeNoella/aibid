import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getInsights(orgId: string, tab: 'pending' | 'approved' | 'false_positive') {
  const db = getDb();
  let where = 'WHERE organization_id = ?';
  if (tab === 'pending') where += ' AND is_published = 0 AND marked_as_false_positive = 0';
  else if (tab === 'approved') where += ' AND is_published = 1';
  else where += ' AND marked_as_false_positive = 1';

  return db.prepare(`SELECT * FROM ai_insights ${where} ORDER BY created_at DESC`).all(orgId);
}

export function getPendingCount(orgId: string) {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM ai_insights WHERE organization_id = ? AND is_published = 0 AND marked_as_false_positive = 0').get(orgId) as { count: number };
  return row.count;
}

export function approveInsight(orgId: string, insightId: string, userId: string, note?: string) {
  const db = getDb();
  db.prepare(`UPDATE ai_insights SET is_published = 1, reviewed_by = ?, reviewed_at = datetime('now'), analyst_note = COALESCE(?, analyst_note) WHERE id = ? AND organization_id = ?`).run(
    userId, note ?? null, insightId, orgId
  );
  const insight = db.prepare('SELECT title, description FROM ai_insights WHERE id = ?').get(insightId) as { title: string; description: string };
  return insight;
}

export function markFalsePositive(orgId: string, insightId: string, userId: string, note?: string) {
  const db = getDb();
  db.prepare(`UPDATE ai_insights SET marked_as_false_positive = 1, reviewed_by = ?, reviewed_at = datetime('now'), analyst_note = COALESCE(?, analyst_note), is_published = 0 WHERE id = ? AND organization_id = ?`).run(
    userId, note ?? null, insightId, orgId
  );
}

export function requestDrillDown(orgId: string, parentId: string, question: string, userId: string) {
  const db = getDb();
  const parent = db.prepare('SELECT * FROM ai_insights WHERE id = ?').get(parentId) as Record<string, unknown> | undefined;
  if (!parent) throw new Error('Insight not found');
  const id = uuid();
  db.prepare(`INSERT INTO ai_insights (id, organization_id, type, title, description, confidence, impact, parent_insight_id, source_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, orgId, parent.type, `Drill-down: ${question.slice(0, 80)}`,
    `Follow-up analysis for "${parent.title}": ${question}. Based on available data patterns, this requires deeper investigation of the underlying metrics.`,
    Math.max(0.6, (parent.confidence as number) - 0.05), parent.impact, parentId, parent.source_data
  );
  return id;
}

export function getValidationThreshold(orgId: string) {
  const db = getDb();
  const row = db.prepare('SELECT auto_hold_threshold FROM insight_validation_config WHERE organization_id = ?').get(orgId) as { auto_hold_threshold: number } | undefined;
  return row?.auto_hold_threshold ?? 70;
}

export function setValidationThreshold(orgId: string, threshold: number) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM insight_validation_config WHERE organization_id = ?').get(orgId);
  if (existing) {
    db.prepare('UPDATE insight_validation_config SET auto_hold_threshold = ?, updated_at = datetime(\'now\') WHERE organization_id = ?').run(threshold, orgId);
  } else {
    db.prepare('INSERT INTO insight_validation_config (id, organization_id, auto_hold_threshold) VALUES (?, ?, ?)').run(uuid(), orgId, threshold);
  }
}

export function getLineage(orgId: string, insightId: string) {
  const db = getDb();
  const insight = db.prepare('SELECT * FROM ai_insights WHERE id = ? AND organization_id = ?').get(insightId, orgId) as Record<string, unknown> | undefined;
  if (!insight) return null;

  const sourceIds = insight.data_source_ids ? JSON.parse(insight.data_source_ids as string) : [];
  const sourceId = sourceIds[0] ?? db.prepare('SELECT id FROM data_sources WHERE organization_id = ? LIMIT 1').get(orgId) as { id: string } | undefined;
  const source = db.prepare('SELECT * FROM data_sources WHERE id = ?').get(typeof sourceId === 'string' ? sourceId : sourceId?.id);

  const model = db.prepare('SELECT * FROM predictive_model WHERE organization_id = ? LIMIT 1').get(orgId);

  return {
    insight,
    source: source ?? { name: 'CRM Database', type: 'database', last_synced_at: new Date().toISOString(), quality_score: 85 },
    cleaning: { steps: ['Null removal', 'Deduplication', 'Normalization'] },
    model: model ?? { name: 'Trend Detector', version: '1.0', current_accuracy: 0.9 },
  };
}

export function getRelatedInsights(orgId: string, insightId: string) {
  const db = getDb();
  const insight = db.prepare('SELECT data_source_ids FROM ai_insights WHERE id = ?').get(insightId) as { data_source_ids: string } | undefined;
  if (!insight?.data_source_ids) return [];
  return db.prepare('SELECT id, title, type, confidence FROM ai_insights WHERE organization_id = ? AND id != ? AND data_source_ids = ? LIMIT 20').all(orgId, insightId, insight.data_source_ids);
}

export function getInsightTitles(orgId: string) {
  const db = getDb();
  return db.prepare('SELECT id, title FROM ai_insights WHERE organization_id = ? ORDER BY created_at DESC').all(orgId);
}

export function getUnreviewedAnomalyCount(orgId: string) {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM ai_insights WHERE organization_id = ? AND type = 'anomaly' AND is_published = 0 AND marked_as_false_positive = 0").get(orgId) as { count: number };
  return row.count;
}
