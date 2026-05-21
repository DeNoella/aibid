import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';

export function getDataSources(organizationId: string, search?: string) {
  const db = getDb();
  let where = 'WHERE organization_id = ?';
  const params: any[] = [organizationId];

  if (search) {
    where += " AND (name LIKE ? OR type LIKE ?)";
    const s = `%${search}%`;
    params.push(s, s);
  }

  return db.prepare(`SELECT * FROM data_sources ${where} ORDER BY created_at DESC`).all(...params);
}

export function getDataSourceById(id: string, organizationId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM data_sources WHERE id = ? AND organization_id = ?').get(id, organizationId);
}

export function createDataSource(data: any, organizationId: string, userId: string) {
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO data_sources (id, organization_id, name, type, connection_config, record_count, status, sync_frequency, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, organizationId, data.name, data.type, data.connectionConfig, data.recordCount || 0, data.status || 'active', data.syncFrequency || 'manual', userId);
  return db.prepare('SELECT * FROM data_sources WHERE id = ?').get(id);
}

export function updateDataSource(id: string, data: any, organizationId: string) {
  const db = getDb();
  db.prepare(`
    UPDATE data_sources SET name = ?, type = ?, status = ?, sync_frequency = ?, updated_at = datetime('now')
    WHERE id = ? AND organization_id = ?
  `).run(data.name, data.type, data.status, data.syncFrequency, id, organizationId);
  return db.prepare('SELECT * FROM data_sources WHERE id = ?').get(id);
}

export function deleteDataSource(id: string, organizationId: string) {
  const db = getDb();
  db.prepare('DELETE FROM data_sources WHERE id = ? AND organization_id = ?').run(id, organizationId);
}

export function syncDataSource(id: string, organizationId: string) {
  const db = getDb();
  db.prepare("UPDATE data_sources SET status = 'syncing', updated_at = datetime('now') WHERE id = ? AND organization_id = ?").run(id, organizationId);
  // Simulate sync completing
  setTimeout(() => {
    try {
      db.prepare("UPDATE data_sources SET status = 'active', last_synced_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);
    } catch { /* ignore */ }
  }, 2000);
  return db.prepare('SELECT * FROM data_sources WHERE id = ?').get(id);
}

export function getDataSourceStats(organizationId: string) {
  const db = getDb();
  const totalRecords = db.prepare('SELECT COALESCE(SUM(record_count), 0) as total FROM data_sources WHERE organization_id = ?').get(organizationId) as { total: number };
  const sourceCount = db.prepare('SELECT COUNT(*) as count FROM data_sources WHERE organization_id = ?').get(organizationId) as { count: number };

  return {
    totalRecords: totalRecords.total,
    dataSources: sourceCount.count,
    processingQueue: Math.floor(Math.random() * 20) + 5,
    storageUsed: '2.4 GB'
  };
}
