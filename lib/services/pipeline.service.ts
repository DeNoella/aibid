import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getStages(organizationId: string) {
  const db = getDb();
  return db.prepare(`
    SELECT ps.*, (SELECT COUNT(*) FROM deals WHERE stage_id = ps.id) as deal_count,
      (SELECT COALESCE(SUM(value), 0) FROM deals WHERE stage_id = ps.id) as total_value
    FROM pipeline_stages ps
    WHERE ps.organization_id = ?
    ORDER BY ps.position
  `).all(organizationId);
}

export function createStage(data: any, organizationId: string) {
  const db = getDb();
  const id = uuid();
  const maxPos = db.prepare('SELECT MAX(position) as max FROM pipeline_stages WHERE organization_id = ?').get(organizationId) as { max: number };
  db.prepare('INSERT INTO pipeline_stages (id, organization_id, name, position, probability, color, is_won, is_lost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, organizationId, data.name, (maxPos.max || 0) + 1, data.probability || 0, data.color || '#6b7280', data.isWon ? 1 : 0, data.isLost ? 1 : 0
  );
  return db.prepare('SELECT * FROM pipeline_stages WHERE id = ?').get(id);
}

export function updateStage(id: string, data: any, organizationId: string) {
  const db = getDb();
  db.prepare('UPDATE pipeline_stages SET name = ?, probability = ?, color = ? WHERE id = ? AND organization_id = ?').run(
    data.name, data.probability, data.color, id, organizationId
  );
  return db.prepare('SELECT * FROM pipeline_stages WHERE id = ?').get(id);
}

export function deleteStage(id: string, organizationId: string) {
  const db = getDb();
  const dealCount = db.prepare('SELECT COUNT(*) as count FROM deals WHERE stage_id = ?').get(id) as { count: number };
  if (dealCount.count > 0) throw new Error('Cannot delete stage with existing deals');
  db.prepare('DELETE FROM pipeline_stages WHERE id = ? AND organization_id = ?').run(id, organizationId);
}
