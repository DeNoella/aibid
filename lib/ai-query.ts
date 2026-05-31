import { createQueryGenerator, type QueryResult, type TableSchema } from 'text-db-query-ai';
import { getDb } from './db';
import { runFileQuery } from './file-query-engine';

// Define the CRM database schema for the AI query generator
const crmTables: TableSchema[] = [
  {
    name: 'organizations',
    description: 'Organizations/companies that use the CRM platform',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'name', type: 'TEXT', description: 'Organization name' },
      { name: 'domain', type: 'TEXT' },
      { name: 'industry', type: 'TEXT' },
      { name: 'size', type: 'TEXT', description: 'Company size range' },
      { name: 'created_at', type: 'TEXT' },
    ],
  },
  {
    name: 'users',
    description: 'Users of the CRM system',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'organization_id', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'password_hash', type: 'TEXT', sensitive: true },
      { name: 'name', type: 'TEXT' },
      { name: 'role', type: 'TEXT', description: 'admin or analyst' },
      { name: 'is_active', type: 'INTEGER' },
      { name: 'created_at', type: 'TEXT' },
    ],
    foreignKeys: [{ column: 'organization_id', referencedTable: 'organizations', referencedColumn: 'id' }],
  },
  {
    name: 'contacts',
    description: 'CRM contacts - people the organization is in touch with',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'organization_id', type: 'TEXT' },
      { name: 'company_id', type: 'TEXT' },
      { name: 'first_name', type: 'TEXT' },
      { name: 'last_name', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'job_title', type: 'TEXT' },
      { name: 'lifecycle_stage', type: 'TEXT', description: 'subscriber, lead, mql, sql, opportunity, customer, evangelist' },
      { name: 'source', type: 'TEXT', description: 'organic, paid, referral, social, email, direct, other' },
      { name: 'notes', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
    ],
    foreignKeys: [
      { column: 'organization_id', referencedTable: 'organizations', referencedColumn: 'id' },
      { column: 'company_id', referencedTable: 'companies', referencedColumn: 'id' },
    ],
  },
  {
    name: 'companies',
    description: 'Companies in the CRM that contacts belong to',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'organization_id', type: 'TEXT' },
      { name: 'name', type: 'TEXT' },
      { name: 'domain', type: 'TEXT' },
      { name: 'industry', type: 'TEXT' },
      { name: 'size', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'city', type: 'TEXT' },
      { name: 'country', type: 'TEXT' },
      { name: 'website', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
    ],
    foreignKeys: [{ column: 'organization_id', referencedTable: 'organizations', referencedColumn: 'id' }],
  },
  {
    name: 'deals',
    description: 'Sales deals/opportunities in the pipeline',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'organization_id', type: 'TEXT' },
      { name: 'contact_id', type: 'TEXT' },
      { name: 'company_id', type: 'TEXT' },
      { name: 'stage_id', type: 'TEXT' },
      { name: 'title', type: 'TEXT' },
      { name: 'value', type: 'REAL', description: 'Deal monetary value' },
      { name: 'currency', type: 'TEXT' },
      { name: 'expected_close_date', type: 'TEXT' },
      { name: 'actual_close_date', type: 'TEXT' },
      { name: 'probability', type: 'REAL' },
      { name: 'notes', type: 'TEXT' },
      { name: 'owner_id', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
    ],
    foreignKeys: [
      { column: 'organization_id', referencedTable: 'organizations', referencedColumn: 'id' },
      { column: 'contact_id', referencedTable: 'contacts', referencedColumn: 'id' },
      { column: 'company_id', referencedTable: 'companies', referencedColumn: 'id' },
      { column: 'stage_id', referencedTable: 'pipeline_stages', referencedColumn: 'id' },
    ],
  },
  {
    name: 'pipeline_stages',
    description: 'Stages in the sales pipeline (e.g. Lead, Qualified, Proposal, Negotiation, Won, Lost)',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'organization_id', type: 'TEXT' },
      { name: 'name', type: 'TEXT' },
      { name: 'position', type: 'INTEGER' },
      { name: 'probability', type: 'REAL' },
      { name: 'is_won', type: 'INTEGER' },
      { name: 'is_lost', type: 'INTEGER' },
    ],
    foreignKeys: [{ column: 'organization_id', referencedTable: 'organizations', referencedColumn: 'id' }],
  },
  {
    name: 'activities',
    description: 'CRM activities like calls, emails, meetings, tasks',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'organization_id', type: 'TEXT' },
      { name: 'type', type: 'TEXT', description: 'call, email, meeting, note, task, follow_up' },
      { name: 'subject', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'contact_id', type: 'TEXT' },
      { name: 'deal_id', type: 'TEXT' },
      { name: 'user_id', type: 'TEXT' },
      { name: 'due_date', type: 'TEXT' },
      { name: 'is_completed', type: 'INTEGER' },
      { name: 'created_at', type: 'TEXT' },
    ],
    foreignKeys: [
      { column: 'organization_id', referencedTable: 'organizations', referencedColumn: 'id' },
      { column: 'contact_id', referencedTable: 'contacts', referencedColumn: 'id' },
      { column: 'deal_id', referencedTable: 'deals', referencedColumn: 'id' },
    ],
  },
  {
    name: 'campaigns',
    description: 'Marketing campaigns',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'organization_id', type: 'TEXT' },
      { name: 'name', type: 'TEXT' },
      { name: 'type', type: 'TEXT', description: 'email, social, ppc, display, content, referral, other' },
      { name: 'status', type: 'TEXT', description: 'draft, active, paused, completed, archived' },
      { name: 'budget', type: 'REAL' },
      { name: 'spent', type: 'REAL' },
      { name: 'start_date', type: 'TEXT' },
      { name: 'end_date', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
    ],
    foreignKeys: [{ column: 'organization_id', referencedTable: 'organizations', referencedColumn: 'id' }],
  },
  {
    name: 'campaign_metrics',
    description: 'Daily performance metrics for campaigns (impressions, clicks, conversions, revenue, cost)',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'campaign_id', type: 'TEXT' },
      { name: 'date', type: 'TEXT' },
      { name: 'impressions', type: 'INTEGER' },
      { name: 'clicks', type: 'INTEGER' },
      { name: 'conversions', type: 'INTEGER' },
      { name: 'revenue', type: 'REAL' },
      { name: 'cost', type: 'REAL' },
      { name: 'leads_generated', type: 'INTEGER' },
    ],
    foreignKeys: [{ column: 'campaign_id', referencedTable: 'campaigns', referencedColumn: 'id' }],
  },
  {
    name: 'reports',
    description: 'Generated reports',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'organization_id', type: 'TEXT' },
      { name: 'title', type: 'TEXT' },
      { name: 'type', type: 'TEXT' },
      { name: 'status', type: 'TEXT', description: 'ready, generating, scheduled, failed' },
      { name: 'created_at', type: 'TEXT' },
    ],
    foreignKeys: [{ column: 'organization_id', referencedTable: 'organizations', referencedColumn: 'id' }],
  },
  {
    name: 'data_sources',
    description: 'External data sources connected to the CRM',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'organization_id', type: 'TEXT' },
      { name: 'name', type: 'TEXT' },
      { name: 'type', type: 'TEXT', description: 'csv, database, api, json, excel' },
      { name: 'record_count', type: 'INTEGER' },
      { name: 'status', type: 'TEXT', description: 'active, syncing, error, disconnected' },
      { name: 'last_synced_at', type: 'TEXT' },
    ],
    foreignKeys: [{ column: 'organization_id', referencedTable: 'organizations', referencedColumn: 'id' }],
  },
  {
    name: 'audit_logs',
    description: 'Audit trail of user actions in the system',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'organization_id', type: 'TEXT' },
      { name: 'user_id', type: 'TEXT' },
      { name: 'user_name', type: 'TEXT' },
      { name: 'action', type: 'TEXT' },
      { name: 'module', type: 'TEXT' },
      { name: 'details', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT' },
    ],
    foreignKeys: [{ column: 'organization_id', referencedTable: 'organizations', referencedColumn: 'id' }],
  },
];

// Determine which LLM provider and key to use
function getLLMConfig() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    return { provider: 'claude' as const, apiKey: anthropicKey };
  }
  if (openaiKey) {
    return { provider: 'openai' as const, apiKey: openaiKey };
  }

  return null;
}

let generatorInstance: ReturnType<typeof createQueryGenerator> | null = null;

function getGenerator() {
  if (generatorInstance) return generatorInstance;

  const llmConfig = getLLMConfig();
  if (!llmConfig) {
    throw new Error('No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env.local');
  }

  generatorInstance = createQueryGenerator({
    llm: llmConfig,
    database: {
      databaseType: 'sqlite',
      tables: crmTables,
    },
    security: {
      allowedOperations: ['SELECT'],
      restrictedColumns: ['password_hash'],
      maxRowLimit: 100,
    },
  });

  return generatorInstance;
}

export interface AskResult {
  question: string;
  answer: string;
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
}

// Columns to hide from user-facing results
const HIDDEN_COLUMNS = new Set([
  'id', 'organization_id', 'company_id', 'contact_id', 'stage_id',
  'owner_id', 'created_by', 'user_id', 'template_id', 'campaign_id',
  'deal_id', 'conversation_id', 'password_hash',
]);

/** Strip internal IDs and return only meaningful columns */
function cleanRow(row: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (HIDDEN_COLUMNS.has(key)) continue;
    // Pretty-print column names: created_at -> Created At
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    clean[label] = value;
  }
  return clean;
}

/** Format a single value for display */
function fmt(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value > 1000) return value.toLocaleString();
    if (!Number.isInteger(value)) return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return String(value);
  }
  return String(value);
}

/** Build a human-readable answer from query results */
function buildAnswer(_question: string, rows: Record<string, unknown>[], columns: string[]): string {
  if (rows.length === 0) return 'No results found for your query.';

  // Single aggregate result (e.g. COUNT, SUM)
  if (rows.length === 1 && columns.length <= 2) {
    const row = rows[0];
    const entries = Object.entries(row);
    if (entries.length === 1) {
      const [col, val] = entries[0];
      const colLower = col.toLowerCase();
      if (colLower.includes('count')) return `There are **${fmt(val)}** in total.`;
      if (colLower.includes('sum') || colLower.includes('total') || colLower.includes('revenue'))
        return `The total is **${fmt(val)}**.`;
      if (colLower.includes('avg') || colLower.includes('average'))
        return `The average is **${fmt(val)}**.`;
      return `The result is **${fmt(val)}**.`;
    }
    // Two columns (e.g. label + value)
    const parts = entries.map(([k, v]) => `**${k.replace(/_/g, ' ')}**: ${fmt(v)}`);
    return parts.join(' | ');
  }

  // List of results
  const count = rows.length;
  return `Found **${count}** result${count !== 1 ? 's' : ''}:`;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Ask a natural language question about the CRM database.
 * Generates SQL via AI, executes it against SQLite, and returns well-structured data.
 * Pass conversationHistory to enable context-aware follow-up questions.
 */
export async function askQuestion(
  question: string,
  organizationId?: string,
  conversationHistory?: ConversationMessage[]
): Promise<AskResult> {
  const generator = getGenerator();
  const db = getDb();

  // Build context-enriched question from conversation history
  let enrichedQuestion = question;
  if (conversationHistory && conversationHistory.length > 0) {
    const contextLines = conversationHistory.slice(-6).map(m =>
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 200)}`
    );
    enrichedQuestion = `Given this conversation context:\n${contextLines.join('\n')}\n\nNow answer this question: ${question}`;
  }

  // Generate SQL from natural language
  const queryResult: QueryResult = await generator.generateQueryWithExplanation(enrichedQuestion, organizationId ? {
    userId: organizationId,
    role: 'admin',
    metadata: { organizationId },
  } : undefined);

  const originalSql = queryResult.query;
  let sql = originalSql;

  // Apply organization scoping if provided and query doesn't already filter
  if (organizationId && !sql.toLowerCase().includes('organization_id')) {
    const tables = queryResult.metadata?.tables || [];
    const orgTable = tables.find(t =>
      crmTables.find(ct => ct.name === t && ct.columns.some(c => c.name === 'organization_id'))
    );
    if (orgTable) {
      if (sql.toLowerCase().includes('where')) {
        sql = sql.replace(/WHERE/i, `WHERE ${orgTable}.organization_id = '${organizationId}' AND`);
      } else {
        const orderMatch = sql.match(/ORDER BY/i);
        const limitMatch = sql.match(/LIMIT/i);
        const groupMatch = sql.match(/GROUP BY/i);
        const insertPoint = groupMatch || orderMatch || limitMatch;
        if (insertPoint) {
          const idx = sql.indexOf(insertPoint[0]);
          sql = sql.slice(0, idx) + `WHERE ${orgTable}.organization_id = '${organizationId}' ` + sql.slice(idx);
        } else {
          sql += ` WHERE ${orgTable}.organization_id = '${organizationId}'`;
        }
      }
    }
  }

  // Execute the generated SQL
  let rawResults: Record<string, unknown>[];
  try {
    rawResults = db.prepare(sql).all() as Record<string, unknown>[];
    // If org-scoped query returns nothing, retry once without org scope so
    // users in unseeded orgs can still query available dataset records.
    if (rawResults.length === 0 && organizationId && sql !== originalSql) {
      rawResults = db.prepare(originalSql).all() as Record<string, unknown>[];
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'SQL execution failed';
    throw new Error(`Failed to execute generated query: ${message}\nSQL: ${sql}`);
  }

  const rawColumns = rawResults.length > 0 ? Object.keys(rawResults[0]) : [];

  // Clean results: strip IDs, format column names
  const data = rawResults.map(cleanRow);
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const answer = buildAnswer(question, rawResults, rawColumns);

  return { question, answer, data, columns, rowCount: rawResults.length };
}

/**
 * Check if AI query functionality is available (API key is set)
 */
export function isAIQueryAvailable(): boolean {
  return getLLMConfig() !== null;
}

// ─── File data analysis ───────────────────────────────────────────────────────

function computeFileStats(rows: Record<string, unknown>[], columns: string[]): Record<string, unknown> {
  const numericCols: string[] = [];
  const categoricalCols: string[] = [];

  for (const col of columns) {
    const sample = rows.slice(0, 30).map(r => r[col]).filter(v => v != null && v !== '');
    const numCount = sample.filter(v => !isNaN(Number(v)) && String(v).trim() !== '').length;
    if (numCount > sample.length * 0.65) numericCols.push(col);
    else categoricalCols.push(col);
  }

  const result: Record<string, unknown> = { numericColumns: numericCols, categoricalColumns: categoricalCols };

  for (const col of numericCols) {
    const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
    if (!vals.length) continue;
    const sum = vals.reduce((a, b) => a + b, 0);
    result[`${col}_summary`] = {
      avg: Math.round(sum / vals.length),
      min: Math.min(...vals),
      max: Math.max(...vals),
      total: Math.round(sum),
      count: vals.length,
    };
  }

  for (const col of categoricalCols) {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const val = String(row[col] ?? '(blank)');
      counts[val] = (counts[val] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
    result[`${col}_distribution`] = Object.fromEntries(sorted);
  }

  // Cross-tabulations: avg of numeric grouped by categorical (the core of analytical questions)
  const crossTabs: Record<string, unknown> = {};
  for (const catCol of categoricalCols) {
    const uniqueVals = [...new Set(rows.map(r => String(r[catCol] ?? '')))].filter(Boolean);
    if (uniqueVals.length > 20) continue; // skip high-cardinality columns like names
    for (const numCol of numericCols) {
      const grouped: Record<string, number[]> = {};
      for (const row of rows) {
        const key = String(row[catCol] ?? '');
        const val = Number(row[numCol]);
        if (key && !isNaN(val)) {
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(val);
        }
      }
      const avgByGroup: Record<string, number> = {};
      for (const [k, vals] of Object.entries(grouped)) {
        avgByGroup[k] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
      crossTabs[`avg_${numCol}_by_${catCol}`] = avgByGroup;
    }
  }
  result['cross_tabulations'] = crossTabs;

  return result;
}

async function callLLMForAnalysis(prompt: string, config: { provider: 'claude' | 'openai'; apiKey: string }): Promise<string> {
  if (config.provider === 'claude') {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const json = await resp.json();
    return json.content?.[0]?.text ?? '';
  } else {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const json = await resp.json();
    return json.choices?.[0]?.message?.content ?? '';
  }
}

/** Build chart data from computed stats as a fallback when AI parsing fails */
function buildFallbackChartData(
  question: string,
  rows: Record<string, unknown>[],
  stats: Record<string, unknown>
): { data: Record<string, unknown>[]; columns: string[] } {
  const cross = stats['cross_tabulations'] as Record<string, Record<string, number>> | undefined;
  if (cross) {
    // Find the most relevant cross-tabulation for the question
    const q = question.toLowerCase();
    const entry = Object.entries(cross).find(([key]) => {
      const parts = key.split('_by_');
      return parts.some(p => q.includes(p.replace(/_/g, ' ')));
    }) || Object.entries(cross)[0];

    if (entry) {
      const [, groups] = entry;
      const data = Object.entries(groups)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => (b.value as number) - (a.value as number));
      return { data, columns: ['label', 'value'] };
    }
  }
  // Last resort: return first 10 rows with their columns
  return { data: rows.slice(0, 10), columns: rows.length > 0 ? Object.keys(rows[0]) : [] };
}

/**
 * Analyze an uploaded file by running the in-memory query engine.
 * No external API call — fast, accurate, always returns specific numbers.
 * previousMessages are included so follow-up questions get proper context.
 */
export async function analyzeFileData(
  question: string,
  fileContext: { filename: string; rows: Record<string, unknown>[]; columns: string[] },
  previousMessages?: ConversationMessage[]
): Promise<{
  answer: string;
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  fileData: Record<string, unknown>[];
}> {
  const { rows, columns } = fileContext;

  // Enrich the question with context from previous turns so follow-ups work
  let enrichedQuestion = question;
  if (previousMessages?.length) {
    const recent = previousMessages.slice(-4)
      .filter(m => m.role === 'user')
      .map(m => m.content.slice(0, 120))
      .join(' | ');
    if (recent) enrichedQuestion = `${question} (context: ${recent})`;
  }

  const result = runFileQuery(enrichedQuestion, rows, columns);

  return {
    answer: result.answer,
    data: result.data,
    columns: result.columns,
    rowCount: rows.length,
    fileData: rows,
  };
}
