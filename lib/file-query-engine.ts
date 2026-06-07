/**
 * In-memory file query engine.
 * Answers natural-language questions about tabular data (CSV / Excel / JSON)
 * by running direct, deterministic computations — no LLM call, instant results.
 *
 * IMPORTANT: every call is fully stateless. The result depends ONLY on the
 * literal question + the rows passed in. No conversation history, no caching,
 * no module-level state — so question N never bleeds into question N+1.
 */

type Row = Record<string, unknown>;

export interface FileQueryResult {
  answer: string;
  data: Row[];
  columns: string[];
  chartType: 'bar' | 'line' | 'pie';
  showChart: boolean;
  /** Headline number for dashboard cards (null when not a single metric) */
  primaryValue: number | null;
  /** What the headline number represents */
  primaryLabel: string;
}

// ── Column classification ────────────────────────────────────────────────────

function isNumeric(rows: Row[], col: string): boolean {
  const sample = rows.slice(0, 40).map(r => r[col]).filter(v => v != null && String(v).trim() !== '');
  if (!sample.length) return false;
  const num = sample.filter(v => !isNaN(Number(String(v).replace(/,/g, '')))).length;
  return num / sample.length > 0.65;
}

function numVal(v: unknown): number {
  return Number(String(v).replace(/,/g, ''));
}

function isTimeCol(col: string): boolean {
  return /year|quarter|month|date|period|day|week/i.test(col);
}

// Metrics that should be SUMMED across groups (additive), vs AVERAGED
const ADDITIVE_TERMS = [
  'revenue', 'cost', 'profit', 'sales', 'spend', 'budget', 'value', 'amount',
  'impression', 'click', 'conversion', 'beneficiary', 'count', 'contract',
  'arr', 'mrr', 'ebitda', 'income', 'total', 'photos', 'headcount', 'salary',
];
function isAdditive(col: string): boolean {
  const c = col.toLowerCase();
  return ADDITIVE_TERMS.some(t => c.includes(t));
}

// ── Column detection from the question ───────────────────────────────────────

const TOPIC_ALIASES: Record<string, string[]> = {
  salary:       ['salary', 'pay', 'compensation', 'wage', 'earn', 'paid', 'income', 'remuneration'],
  performance:  ['performance', 'score', 'rating', 'evaluation', 'appraisal', 'kpi'],
  training:     ['training', 'learning', 'course', 'development', 'upskill'],
  gender:       ['gender', 'sex', 'male', 'female', 'woman', 'man'],
  department:   ['department', 'dept', 'team', 'division', 'function'],
  location:     ['location', 'office', 'city', 'region', 'site', 'based', 'remote', 'kigali', 'huye', 'musanze'],
  education:    ['education', 'degree', 'qualification', 'bachelor', 'master', 'phd', 'diploma'],
  nationality:  ['nationality', 'country', 'origin', 'citizen', 'rwandan'],
  tenure:       ['tenure', 'years at', 'seniority'],
  age:          ['age'],
  sick:         ['sick', 'absence', 'medical'],
  project:      ['project', 'assignment'],
  status:       ['status', 'active', 'resigned', 'terminated', 'probation'],
  employment:   ['employment', 'contract', 'full-time', 'part-time', 'intern'],
  revenue:      ['revenue', 'sales', 'turnover'],
  cost:         ['cost', 'expense', 'spend', 'opex', 'cogs'],
  profit:       ['profit', 'margin', 'ebitda'],
  clients:      ['client', 'customer', 'churned'],
  mrr:          ['mrr', 'monthly recurring', 'recurring'],
  nps:          ['nps', 'satisfaction', 'promoter'],
  cac:          ['cac', 'acquisition cost'],
  ltv:          ['ltv', 'lifetime value'],
  product:      ['product line', 'product'],
  region:       ['region', 'geography', 'area', 'africa', 'mena'],
  quarter:      ['quarter', 'q1', 'q2', 'q3', 'q4'],
  year:         ['year', 'annual', '2021', '2022', '2023', '2024', '2025'],
  sector:       ['sector', 'industry'],
  nps_score:    ['nps'],
};

function findColumn(
  question: string,
  candidates: string[],
  rows: Row[],
  preferNumeric?: boolean,
): string | undefined {
  const q = question.toLowerCase();

  // 1. Topic aliases → matching column
  for (const terms of Object.values(TOPIC_ALIASES)) {
    if (terms.some(t => q.includes(t))) {
      const hit = candidates.find(c =>
        terms.some(t => c.toLowerCase().includes(t.split(' ')[0]))
      );
      if (hit && (!preferNumeric || isNumeric(rows, hit))) return hit;
    }
  }

  // 2. Direct overlap between question and column name parts
  const direct = candidates.find(c => {
    const parts = c.toLowerCase().replace(/_/g, ' ').split(/\s+/);
    return parts.some(p => p.length > 2 && q.includes(p));
  });
  if (direct && (!preferNumeric || isNumeric(rows, direct))) return direct;

  // 3. First applicable column of the right type
  if (preferNumeric) return candidates.find(c => isNumeric(rows, c));
  return candidates[0];
}

// ── Aggregations ─────────────────────────────────────────────────────────────

function groupAgg(rows: Row[], groupCol: string, metricCol: string, mode: 'sum' | 'avg') {
  const acc: Record<string, number[]> = {};
  for (const r of rows) {
    const k = String(r[groupCol] ?? '(blank)');
    const v = numVal(r[metricCol]);
    if (!isNaN(v)) { (acc[k] ??= []).push(v); }
  }
  return Object.entries(acc)
    .map(([key, vals]) => ({
      key,
      value: mode === 'sum'
        ? Math.round(vals.reduce((a, b) => a + b, 0))
        : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      count: vals.length,
    }))
    .sort((a, b) => b.value - a.value);
}

function groupCount(rows: Row[], groupCol: string) {
  const acc: Record<string, number> = {};
  for (const r of rows) { const k = String(r[groupCol] ?? '(blank)'); acc[k] = (acc[k] || 0) + 1; }
  return Object.entries(acc).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
}

const colSum = (rows: Row[], col: string) => rows.reduce((s, r) => s + (numVal(r[col]) || 0), 0);
const colAvg = (rows: Row[], col: string) => {
  const v = rows.map(r => numVal(r[col])).filter(n => !isNaN(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
};

function pearson(rows: Row[], c1: string, c2: string): number {
  const pairs = rows.map(r => [numVal(r[c1]), numVal(r[c2])]).filter(([a, b]) => !isNaN(a) && !isNaN(b));
  if (pairs.length < 2) return 0;
  const n = pairs.length;
  const x = pairs.map(p => p[0]); const y = pairs.map(p => p[1]);
  const mx = x.reduce((a, b) => a + b, 0) / n; const my = y.reduce((a, b) => a + b, 0) / n;
  const cov = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) / n;
  const sx = Math.sqrt(x.reduce((s, xi) => s + (xi - mx) ** 2, 0) / n);
  const sy = Math.sqrt(y.reduce((s, yi) => s + (yi - my) ** 2, 0) / n);
  return sx && sy ? Math.round((cov / (sx * sy)) * 100) / 100 : 0;
}

// ── Formatting ───────────────────────────────────────────────────────────────

function fmt(n: number, col = ''): string {
  const c = col.toLowerCase();
  if (c.includes('pct') || c.includes('rate') || c.includes('margin')) return `${n.toFixed(1)}%`;
  if (c.includes('score') || c.includes('ratio') || c.includes('nps')) return n.toFixed(2);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 10_000) return n.toLocaleString();
  return String(Math.round(n));
}

const label = (col: string) => col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function uniqueCols(cols: string[]): string[] {
  const seen = new Set<string>();
  return cols.filter((c) => {
    if (!c || seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

function tableFromCols(rows: Row[], cols: string[], limit?: number): { data: Row[]; columns: string[] } {
  const keys = uniqueCols(cols);
  const seenLabels = new Map<string, number>();
  const displayColumns = keys.map((col) => {
    const base = label(col);
    const n = seenLabels.get(base) ?? 0;
    seenLabels.set(base, n + 1);
    return n === 0 ? base : `${base} (${n + 1})`;
  });
  const slice = limit != null ? rows.slice(0, limit) : rows;
  const data = slice.map((row) =>
    Object.fromEntries(keys.map((k, i) => [displayColumns[i], row[k]]))
  );
  return { data, columns: displayColumns };
}

// Decide chart type from the question + the grouping column
function decideChart(question: string, groupCol: string | null, categoryCount: number): 'bar' | 'line' | 'pie' {
  const q = question.toLowerCase();
  if (/trend|over time|growth|year over year|yoy|2021|2022|2023|2024|2025|progression/.test(q)) return 'line';
  if (groupCol && isTimeCol(groupCol)) return 'line';
  if (/distribution|share|percentage|proportion|split|makeup|composition/.test(q) && categoryCount <= 7) return 'pie';
  return 'bar';
}

// ── Main engine ──────────────────────────────────────────────────────────────

export function runFileQuery(rawQuestion: string, rows: Row[], columns: string[]): FileQueryResult {
  const empty: FileQueryResult = {
    answer: 'The dataset appears to be empty.', data: [], columns: [],
    chartType: 'bar', showChart: false, primaryValue: null, primaryLabel: '',
  };
  if (!rows.length || !columns.length) return empty;

  const q = rawQuestion.toLowerCase();
  const numCols = columns.filter(c => isNumeric(rows, c));
  const catCols = columns.filter(c => !isNumeric(rows, c));

  // ── TOP / HIGHEST / LOWEST / BEST / WORST ────────────────────────────────
  const topRx = q.match(/top\s+(\d+)/);
  const isBottom = /lowest|worst|least|bottom|minimum|fewest/.test(q);
  const isTop = !!topRx || /highest|best|most|maximum|leading/.test(q);

  if (isTop || (topRx && isBottom)) {
    const n = topRx ? parseInt(topRx[1]) : 5;
    const metricCol = findColumn(q, numCols, rows, true) || numCols[0];
    const nameCol = columns.find(c => /name|title/i.test(c)) || catCols[0];

    if (metricCol && nameCol) {
      const sorted = [...rows]
        .sort((a, b) => isBottom ? numVal(a[metricCol]) - numVal(b[metricCol]) : numVal(b[metricCol]) - numVal(a[metricCol]))
        .slice(0, n);
      const ml = label(metricCol);
      const lines = sorted.map((r, i) => `${i + 1}. ${r[nameCol] ?? '—'}: ${fmt(numVal(r[metricCol]), metricCol)}`).join('\n');
      return {
        answer: `Top ${n} by ${isBottom ? 'lowest' : 'highest'} ${ml}:\n${lines}`,
        data: sorted.map(r => ({ [label(nameCol)]: r[nameCol], [ml]: numVal(r[metricCol]) })),
        columns: [label(nameCol), ml],
        chartType: 'bar',
        showChart: sorted.length >= 2,
        primaryValue: sorted.length ? numVal(sorted[0][metricCol]) : null,
        primaryLabel: ml,
      };
    }
    if (catCols.length) {
      const catCol = findColumn(q, catCols, rows) || catCols[0];
      const result = groupCount(rows, catCol).slice(0, n);
      return {
        answer: `Top ${n} ${label(catCol)}:\n${result.map((r, i) => `${i + 1}. ${r.key}: ${r.value}`).join('\n')}`,
        data: result.map(r => ({ [label(catCol)]: r.key, Count: r.value })),
        columns: [label(catCol), 'Count'],
        chartType: 'bar', showChart: result.length >= 2,
        primaryValue: result.length ? result[0].value : null,
        primaryLabel: label(catCol),
      };
    }
  }

  // ── CORRELATION / RELATIONSHIP ───────────────────────────────────────────
  if (/correlation|relationship|related|impact|influence|effect on|link between/.test(q)) {
    const c1 = findColumn(q, numCols, rows, true);
    const remaining = numCols.filter(c => c !== c1);
    const c2 = findColumn(q.replace(c1 ? c1.replace(/_/g, ' ') : '', ''), remaining, rows, true) || remaining[0];
    if (c1 && c2) {
      const r = pearson(rows, c1, c2);
      const strength = Math.abs(r) > 0.7 ? 'strong' : Math.abs(r) > 0.4 ? 'moderate' : 'weak';
      const dir = r > 0 ? 'positive' : 'negative';
      const c1l = label(c1); const c2l = label(c2);
      const interp = Math.abs(r) > 0.3
        ? `${r > 0 ? 'Higher' : 'Lower'} ${c1l} tends to come with ${r > 0 ? 'higher' : 'lower'} ${c2l}.`
        : 'No meaningful linear relationship was found.';
      return {
        answer: `Correlation between **${c1l}** and **${c2l}**: r = **${r}** (${strength} ${dir}).\n\n${interp}`,
        data: rows.slice(0, 20).map(r2 => ({ [c1l]: numVal(r2[c1]), [c2l]: numVal(r2[c2]) })),
        columns: [c1l, c2l],
        chartType: 'line', showChart: true, primaryValue: r, primaryLabel: 'Correlation',
      };
    }
  }

  // ── TOTAL / SUM ───────────────────────────────────────────────────────────
  if (/\btotal\b|\bsum\b|\boverall\b|\bcombined\b|\bspend\b/.test(q) && !/how many|count/.test(q)) {
    const metricCol = findColumn(q, numCols, rows, true) || numCols[0];
    // Optionally break the total down by a time/category dimension
    const groupCol = findColumn(q, catCols, rows);
    if (metricCol && groupCol && /by |per |across|each/.test(q)) {
      const result = groupAgg(rows, groupCol, metricCol, 'sum');
      const chart = decideChart(q, groupCol, result.length);
      const ml = label(metricCol); const cl = label(groupCol);
      return {
        answer: `Total ${ml} by ${cl}:\n${result.map(r => `• ${r.key}: ${fmt(r.value, metricCol)}`).join('\n')}`,
        data: result.map(r => ({ [cl]: r.key, [ml]: r.value })),
        columns: [cl, ml],
        chartType: chart, showChart: result.length >= 2,
        primaryValue: colSum(rows, metricCol), primaryLabel: ml,
      };
    }
    if (metricCol) {
      const total = Math.round(colSum(rows, metricCol));
      const ml = label(metricCol);
      return {
        answer: `The total ${ml} across all ${rows.length} records is **${fmt(total, metricCol)}**.`,
        data: [{ Metric: ml, Total: total }],
        columns: ['Metric', 'Total'],
        chartType: 'bar', showChart: false, primaryValue: total, primaryLabel: ml,
      };
    }
  }

  // ── COUNT / HOW MANY / DISTRIBUTION ──────────────────────────────────────
  if (/how many|count|distribution|breakdown|number of|frequency|proportion/.test(q)) {
    // If a specific category value is named, count just those (filter)
    for (const catCol of catCols) {
      const vals = [...new Set(rows.map(r => String(r[catCol] ?? '')))].filter(Boolean);
      const matched = vals.find(v => v.length > 1 && q.includes(v.toLowerCase()));
      if (matched) {
        const filtered = rows.filter(r => String(r[catCol]) === matched);
        return {
          answer: `There are **${filtered.length}** records where ${label(catCol)} = **${matched}** (out of ${rows.length}).`,
          data: [{ [label(catCol)]: matched, Count: filtered.length }],
          columns: [label(catCol), 'Count'],
          chartType: 'bar', showChart: false, primaryValue: filtered.length, primaryLabel: `${matched} count`,
        };
      }
    }
    const catCol = findColumn(q, catCols, rows);
    if (catCol) {
      const result = groupCount(rows, catCol);
      const cl = label(catCol);
      const chart = decideChart(q, catCol, result.length);
      return {
        answer: `Distribution by ${cl} (${rows.length} records total):\n`
          + result.map(r => `• ${r.key}: ${r.value} (${Math.round(r.value / rows.length * 100)}%)`).join('\n'),
        data: result.map(r => ({ [cl]: r.key, Count: r.value })),
        columns: [cl, 'Count'],
        chartType: chart === 'line' ? 'bar' : chart, showChart: result.length >= 2,
        primaryValue: rows.length, primaryLabel: 'Total records',
      };
    }
    return {
      answer: `There are **${rows.length}** total records in this dataset.`,
      data: [{ 'Total Records': rows.length }], columns: ['Total Records'],
      chartType: 'bar', showChart: false, primaryValue: rows.length, primaryLabel: 'Total records',
    };
  }

  // ── AVERAGE / COMPARE / BY / TREND / GROUPED ─────────────────────────────
  if (/average|avg|mean|\bby\b|equity|compar|across|\bper\b|gap|trend|growth|over time|analysis|versus|\bvs\b/.test(q)) {
    const catCol = findColumn(q, catCols, rows);
    const metricCol = findColumn(q, numCols, rows, true) || numCols[0];

    if (catCol && metricCol) {
      const mode: 'sum' | 'avg' = (isAdditive(metricCol) && !/average|avg|mean/.test(q)) ? 'sum' : 'avg';
      const result = groupAgg(rows, catCol, metricCol, mode);
      const cl = label(catCol); const ml = label(metricCol);
      const chart = decideChart(q, catCol, result.length);
      // For time-based grouping, sort chronologically instead of by value
      const ordered = isTimeCol(catCol) ? [...result].sort((a, b) => a.key.localeCompare(b.key)) : result;
      const hi = result[0]; const lo = result[result.length - 1];

      let answer = `${mode === 'sum' ? 'Total' : 'Average'} ${ml} by ${cl}:\n`
        + ordered.map(r => `• ${r.key}: ${fmt(r.value, metricCol)}`).join('\n');
      if (result.length >= 2 && hi && lo) {
        const diff = Math.abs(hi.value - lo.value);
        const pct = hi.value ? Math.round(diff / hi.value * 100) : 0;
        answer += `\n\n**${hi.key}** is highest (${fmt(hi.value, metricCol)}), **${lo.key}** is lowest (${fmt(lo.value, metricCol)}) — a ${pct}% gap.`;
      }
      return {
        answer,
        data: ordered.map(r => ({ [cl]: r.key, [ml]: r.value })),
        columns: [cl, ml],
        chartType: chart, showChart: ordered.length >= 2,
        primaryValue: mode === 'sum' ? Math.round(colSum(rows, metricCol)) : Math.round(colAvg(rows, metricCol)),
        primaryLabel: ml,
      };
    }
    if (metricCol) {
      const avg = Math.round(colAvg(rows, metricCol));
      const ml = label(metricCol);
      return {
        answer: `The average ${ml} is **${fmt(avg, metricCol)}** across ${rows.length} records.`,
        data: [{ Metric: ml, Average: avg }], columns: ['Metric', 'Average'],
        chartType: 'bar', showChart: false, primaryValue: avg, primaryLabel: ml,
      };
    }
  }

  // ── FILTER by numeric threshold ──────────────────────────────────────────
  const aboveRx = q.match(/(?:more than|above|over|greater than|at least|exceed(?:s|ing)?)\s*(\d+(?:\.\d+)?)/);
  const belowRx = q.match(/(?:less than|below|under|at most|fewer than)\s*(\d+(?:\.\d+)?)/);
  if (aboveRx || belowRx) {
    const threshold = parseFloat((aboveRx ?? belowRx)![1]);
    const dir = aboveRx ? 'above' : 'below';
    const filterCol = findColumn(q, numCols, rows, true) || numCols[0];
    if (filterCol) {
      const filtered = rows.filter(r =>
        dir === 'above' ? numVal(r[filterCol]) > threshold : numVal(r[filterCol]) < threshold);
      const nameCol = columns.find(c => /name|title/i.test(c)) || catCols[0];
      const showCols = [nameCol, filterCol, ...catCols.slice(0, 1)].filter(Boolean) as string[];
      const { data, columns: displayColumns } = tableFromCols(filtered, showCols, 15);
      return {
        answer: `Found **${filtered.length}** records where ${label(filterCol)} is ${dir} ${fmt(threshold, filterCol)} (of ${rows.length} total).`,
        data,
        columns: displayColumns,
        chartType: 'bar', showChart: false, primaryValue: filtered.length, primaryLabel: 'Matching records',
      };
    }
  }

  // ── FILTER by named category value (e.g. "employees in Kigali", "who resigned") ──
  for (const catCol of catCols) {
    const vals = [...new Set(rows.map(r => String(r[catCol] ?? '')))].filter(Boolean);
    const matched = vals.find(v => v.length > 1 && q.includes(v.toLowerCase()));
    if (matched) {
      const filtered = rows.filter(r => String(r[catCol]) === matched);
      const nameCol = columns.find(c => /name|title/i.test(c)) || catCols[0];
      const showCols = [nameCol, catCol, ...numCols.slice(0, 2)].filter(Boolean) as string[];
      const { data, columns: displayColumns } = tableFromCols(filtered, showCols, 15);
      return {
        answer: `Found **${filtered.length}** records where ${label(catCol)} = **${matched}**.`,
        data,
        columns: displayColumns,
        chartType: 'bar', showChart: false, primaryValue: filtered.length, primaryLabel: `${matched} count`,
      };
    }
  }

  // ── FALLBACK ─────────────────────────────────────────────────────────────
  const defaultCat = catCols.find(c => /department|gender|status|sector|region|product|country/i.test(c)) || catCols[0];
  const defaultNum = numCols[0];
  if (defaultCat && defaultNum) {
    const mode: 'sum' | 'avg' = isAdditive(defaultNum) ? 'sum' : 'avg';
    const result = groupAgg(rows, defaultCat, defaultNum, mode);
    const cl = label(defaultCat); const ml = label(defaultNum);
    return {
      answer: `Here is the ${mode === 'sum' ? 'total' : 'average'} ${ml} grouped by ${cl}:\n`
        + result.map(r => `• ${r.key}: ${fmt(r.value, defaultNum)}`).join('\n'),
      data: result.map(r => ({ [cl]: r.key, [ml]: r.value })),
      columns: [cl, ml],
      chartType: decideChart(q, defaultCat, result.length), showChart: result.length >= 2,
      primaryValue: mode === 'sum' ? Math.round(colSum(rows, defaultNum)) : Math.round(colAvg(rows, defaultNum)),
      primaryLabel: ml,
    };
  }

  const showCols = [columns.find(c => /name|title/i.test(c)), ...catCols.slice(0, 2), ...numCols.slice(0, 2)]
    .filter(Boolean) as string[];
  const { data, columns: displayColumns } = tableFromCols(rows, showCols, 10);
  return {
    answer: `Here are the first ${Math.min(rows.length, 10)} records from your dataset:`,
    data,
    columns: displayColumns,
    chartType: 'bar', showChart: false, primaryValue: rows.length, primaryLabel: 'Total records',
  };
}
