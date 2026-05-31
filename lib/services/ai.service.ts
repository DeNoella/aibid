import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import { askQuestion, analyzeFileData, isAIQueryAvailable, type ConversationMessage } from '@/lib/ai-query';

export function getConversations(userId: string) {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, (SELECT content FROM ai_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM ai_conversations c
    WHERE c.user_id = ?
    ORDER BY c.updated_at DESC
  `).all(userId);
}

export function createConversation(userId: string, title?: string) {
  const db = getDb();
  const id = uuid();
  db.prepare('INSERT INTO ai_conversations (id, user_id, title) VALUES (?, ?, ?)').run(id, userId, title || 'New Conversation');
  return db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id);
}

export function getMessages(conversationId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId);
}

export async function sendMessage(conversationId: string, content: string, organizationId?: string, fileContext?: { filename: string; rows: Record<string, unknown>[]; columns: string[] }) {
  const db = getDb();
  const userMsgId = uuid();
  const assistantMsgId = uuid();

  const previousMessages = db.prepare(
    'SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(conversationId) as ConversationMessage[];

  db.prepare('INSERT INTO ai_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(userMsgId, conversationId, 'user', content);

  let responseContent: string;
  let queryData: { answer: string; data: Record<string, unknown>[]; columns: string[]; rowCount: number; fileData?: Record<string, unknown>[] } | null = null;

  if (fileContext?.rows?.length) {
    const result = await analyzeFileData(content, {
      filename: fileContext.filename,
      rows: fileContext.rows,
      columns: fileContext.columns ?? Object.keys(fileContext.rows[0] ?? {}),
    }, previousMessages);
    responseContent = result.answer;
    queryData = result;
  } else if (isAIQueryAvailable()) {
    try {
      const result = await askQuestion(content, organizationId, previousMessages);
      responseContent = result.answer;
      queryData = { answer: result.answer, data: result.data, columns: result.columns, rowCount: result.rowCount };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      responseContent = `I couldn't process that query: ${errMsg}. Try rephrasing your question.`;
    }
  } else {
    responseContent = 'AI query is not configured. Please set your OPENAI_API_KEY in .env.local to enable intelligent database queries.';
  }

  db.prepare('INSERT INTO ai_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(assistantMsgId, conversationId, 'assistant', responseContent);

  db.prepare("UPDATE ai_conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);

  return {
    userMessage: { id: userMsgId, conversation_id: conversationId, role: 'user', content, created_at: new Date().toISOString() },
    assistantMessage: { id: assistantMsgId, conversation_id: conversationId, role: 'assistant', content: responseContent, created_at: new Date().toISOString() },
    queryData,
  };
}

export function getInsights(organizationId: string, type?: string, impact?: string) {
  const db = getDb();
  let where = 'WHERE organization_id = ? AND is_dismissed = 0';
  const params: any[] = [organizationId];

  if (type) { where += ' AND type = ?'; params.push(type); }
  if (impact) { where += ' AND impact = ?'; params.push(impact); }

  return db.prepare(`SELECT * FROM ai_insights ${where} ORDER BY created_at DESC`).all(...params);
}

export function dismissInsight(id: string, organizationId: string) {
  const db = getDb();
  db.prepare('UPDATE ai_insights SET is_dismissed = 1 WHERE id = ? AND organization_id = ?').run(id, organizationId);
}
