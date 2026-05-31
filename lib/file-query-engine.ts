/**
 * In-memory file query engine.
 * Answers natural-language questions about tabular data (CSV / Excel / JSON)
 * by running direct computations — no LLM call, instant results.
 */

type Row = Record<string, unknown>;

export interface FileQueryResult {
  answer: string;
  data: Row[];
  columns: string[];
  chartType: 'bar' | 'line' | 'pie';
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

// ── Column detection ─────────────────────────────────────────────────────────

// Maps common question words to column name fragments
const TOPIC_ALIASES: Record<string, string[]> = {
  salary:       ['salary', 'pay', 'compensation', 'wage', 'earn', 'paid', 'income', 'remuneration'],
  performance:  ['performance', 'score', 'rating', 'evaluation', 'appraisal', 'kpi'],
  training:     ['training', 'learning', 'hours', 'course', 'certif', 'development', 'upskill'],
  gender:       ['gender', 'sex', 'male', 'female', 'woman', 'man'],
  department:   ['department', 'dept', 'team', 'division', 'function', 'unit'],
  location:     ['location', 'office', 'city', 'region', 'site', 'base', 'remote', 'kigali', 'huye', 'musanze'],
  education:    ['education', 'degree', 'qualification', 'bachelor', 'master', 'phd', 'diploma'],
  nationality:  ['nationality', 'country', 'origin', 'citizen', 'rwandan', 'african'],
  tenure:       ['tenure', 'years', 'experience', 'seniority', 'join', 'hire', 'long'],
  age:          ['age', 'old', 'young', 'age_group', 'age group'],
  sick:         ['sick', 'absence', 'ill', 'leave', 'medical'],
  project:      ['project', 'assignment', 'active project'],
  status:       ['status', 'active', 'resigned', 'terminated', 'probation'],
  employment:   ['employment', 'contract', 'full-time', 'part-time', 'intern'],
  revenue:      ['revenue', 'income', 'sales', 'turnover'],
  cost:         ['cost', 'expense', 'spend', 'opex', 'cogs'],
  profit:       ['profit', 'margin', 'ebitda', 'net income'],
  clients:      ['client', 'customer', 'new client', 'churned', 'active client'],
  mrr:          ['mrr', 'monthly recurring', 'recurring revenue'],
  nps:          ['nps', 'satisfaction', 'net promoter'],
  headcount:    ['headcount', 'employee count', 'staff'],
  cac:          ['cac', 'acquisition cost', 'cost to acquire'],
  ltv:          ['ltv', 'lifetime value'],
  product:      ['product', 'product line', 'product_line'],
  region:       ['region', 'country', 'geography', 'area', 'africa', 'mena', 'global'],
  quarter:      ['quarter', 'q1', 'q2', 'q3', 'q4', 'quarterly'],
  year:         ['year', 'annual', 'yearly', '2021', '2022', '2023', '2024'],
};

function findBestColumn(
  question: string,
  candidates: string[],
  rows: Row[],
  preferNumeric?: boolean,
): string | undefined {
  const q = question.toLowerCase();

  // 1. Check topic aliases
  for (const [, terms] of Object.entries(TOPIC_ALIASES)) {
    if (terms.some(t => q.includes(t))) {
      // Find a column whose name contains any of these terms
      const hit = candidates.find(c =>
        terms.some(t => c.toLowerCase().includes(t) || t.includes(c.toLowerCase().split('_')[0]))
      );
      if (hit) {
        if (!preferNumeric) return hit;
        if (isNumeric(rows, hit)) return hit;
      }
    }
  }

  // 2. Direct word overlap between question and column name parts
  const directHit = candidates.find(c => {
    const parts = c.toLowerCase().replace(/_/g, ' ').split(/\s+/);
    return parts.some(p => p.length > 2 && q.includes(p));
  });
  if (directHit) {
    if (!preferNumeric) return directHit;
    if (isNumeric(rows, directHit)) return directHit;
  }

  // 3. Fall back to first applicable column type
  if (preferNumeric) return candidates.find(c => isNumeric(rows, c));
  return candidates.find(c => !isNumeric(rows, c));
}

// ── Aggregations ─────────────────────────────────────────────────────────────

function groupAvg(rows: Row[], groupCol: string, metricCol: string): { key: string; value: number; count: number }[] {
  const acc: Record<string, number[]> = {};
  for (const r of rows) {
    const k = String(r[groupCol] ?? '(blank)');
    const v = numVal(r[metricCol]);
    if (!isNaN(v)) { if (!acc[k]) acc[k] = []; acc[k].push(v); }
  }
  return Object.entries(acc)
    .map(([key, vals]) => ({ key, value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), count: vals.length }))
    .sort((a, b) => b.value - a.value);
}

function groupCount(rows: Row[], groupCol: string): { key: string; value: number }[] {
  const acc: Record<string, number> = {};
  for (const r of rows) { const k = String(r[groupCol] ?? '(blank)'); acc[k] = (acc[k] || 0) + 1; }
  return Object.entries(acc).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
}

function colSum(rows: Row[], col: string): number {
  return rows.reduce((s, r) => s + (numVal(r[col]) || 0), 0);
}

function colAvg(rows: Row[], col: string): number {
  const vals = rows.map(r => numVal(r[col])).filter(v => !isNaN(v));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function pearson(rows: Row[], col1: string, col2: string): number {
  const pairs = rows.map(r => [numVal(r[col1]), numVal(r[col2])]).filter(([a, b]) => !isNaN(a) && !isNaN(b));
  if (pairs.length < 2) return 0;
  const n = pairs.length;
  const x = pairs.map(p => p[0]);
  const y = pairs.map(p => p[1]);
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  const cov = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) / n;
  const sx = Math.sqrt(x.reduce((s, xi) => s + (xi - mx) ** 2, 0) / n);
  const sy = Math.sqrt(y.reduce((s, yi) => s + (yi - my) ** 2, 0) / n);
  return sx && sy ? Math.round((cov / (sx * sy)) * 100) / 100 : 0;
}

// ── Number formatting ────────────────────────────────────────────────────────

function fmt(n: number, col = ''): string {
  const c = col.toLowerCase();
  if (c.includes('pct') || c.includes('rate') || c.includes('_pct') || c.includes('margin')) return `${n.toFixed(1)}%`;
  if (c.includes('score') || c.includes('ratio') || c.includes('nps')) return n.toFixed(2);
  if (n > 999999) return `${(n / 1000000).toFixed(2)}M`;
  if (n > 9999) return n.toLocaleString();
  return String(Math.round(n));
}

function label(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Main engine ──────────────────────────────────────────────────────────────

export function runFileQuery(question: string, rows: Row[], columns: string[]): FileQueryResult {
  if (!rows.length || !columns.length) {
    return { answer: 'The dataset appears to be empty.', data: [], columns: [], chartType: 'bar' };
  }

  const q = question.toLowerCase();
  const numCols = columns.filter(c => isNumeric(rows, c));
  const catCols = columns.filter(c => !isNumeric(rows, c));

  // ── TOP / HIGHEST / LOWEST / BEST / WORST ──────────────────────────────
  const topRx = q.match(/top\s+(\d+)/i);
  const isBottom = /lowest|worst|least|bottom|minimum/.test(q);
  const isTop = topRx || /highest|best|most|top|maximum/.test(q);

  if (isTop) {
    const n = topRx ? parseInt(topRx[1]) : 5;
    const metricCol = findBestColumn(q, numCols, rows, true) || numCols[0];
    const nameCol = columns.find(c => c.toLowerCase().includes('name')) || catCols[0];

    if (metricCol) {
      const sorted = [...rows]
        .sort((a, b) => isBottom ? numVal(a[metricCol]) - numVal(b[metricCol]) : numVal(b[metricCol]) - numVal(a[metricCol]))
        .slice(0, n);

      const dir = isBottom ? 'lowest' : 'highest';
      const ml = label(metricCol);
      const nl = label(nameCol || '');
      const lines = sorted.map((r, i) => `${i + 1}. ${r[nameCol!] ?? '—'}: ${fmt(numVal(r[metricCol]), metricCol)}`).join('\n');
      const answer = `Top ${n} by ${dir} ${ml}:\n${lines}`;

      const showCols = [nameCol, metricCol].filter(Boolean) as string[];
      return {
        answer,
        data: sorted.map(r => Object.fromEntries(showCols.map(c => [label(c), r[c]]))),
        columns: showCols.map(label),
        chartType: 'bar',
      };
    }

    // Top by count across a category
    if (catCols.length) {
      const catCol = findBestColumn(q, catCols, rows) || catCols[0];
      const result = groupCount(rows, catCol).slice(0, n);
      return {
        answer: `Top ${n} ${label(catCol)} values:\n${result.map((r, i) => `${i + 1}. ${r.key}: ${r.value}`).join('\n')}`,
        data: result.map(r => ({ [label(catCol)]: r.key, count: r.value })),
        columns: [label(catCol), 'count'],
        chartType: 'bar',
      };
    }
  }

  // ── TOTAL / SUM ─────────────────────────────────────────────────────────
  if (/\btotal\b|\bsum\b|\boverall\b|\baggregate\b/.test(q)) {
    const metricCol = findBestColumn(q, numCols, rows, true) || numCols[0];
    if (metricCol) {
      const total = colSum(rows, metricCol);
      const ml = label(metricCol);
      return {
        answer: `The total ${ml} across all ${rows.length} records is **${fmt(Math.round(total), metricCol)}**.`,
        data: [{ Metric: ml, Total: Math.round(total) }],
        columns: ['Metric', 'Total'],
        chartType: 'bar',
      };
    }
  }

  // ── COUNT / HOW MANY / DISTRIBUTION ─────────────────────────────────────
  if (/how many|count|distribution|breakdown|number of|frequency/.test(q)) {
    const catCol = findBestColumn(q, catCols, rows) || catCols[0];
    if (catCol) {
      const result = groupCount(rows, catCol);
      const cl = label(catCol);
      const answer = `Distribution by ${cl} (${rows.length} total records):\n`
        + result.map(r => `• ${r.key}: ${r.value} (${Math.round(r.value / rows.length * 100)}%)`).join('\n');
      return {
        answer,
        data: result.map(r => ({ [cl]: r.key, count: r.value, pct: `${Math.round(r.value / rows.length * 100)}%` })),
        columns: [cl, 'count', 'pct'],
        chartType: result.length <= 6 ? 'pie' : 'bar',
      };
    }
    return {
      answer: `There are **${rows.length}** total records in this dataset.`,
      data: [{ 'Total Records': rows.length }],
      columns: ['Total Records'],
      chartType: 'bar',
    };
  }

  // ── CORRELATION / RELATIONSHIP ───────────────────────────────────────────
  if (/correlation|relationship|related|impact|influence|effect|link/.test(q)) {
    const col1 = findBestColumn(q, numCols, rows, true);
    const remaining = numCols.filter(c => c !== col1);
    const col2 = findBestColumn(q.replace(col1 ? col1.replace(/_/g, ' ') : '', ''), remaining, rows, true) || remaining[0];

    if (col1 && col2) {
      const r = pearson(rows, col1, col2);
      const strength = Math.abs(r) > 0.7 ? 'strong' : Math.abs(r) > 0.4 ? 'moderate' : 'weak';
      const dir = r > 0 ? 'positive' : 'negative';
      const c1l = label(col1); const c2l = label(col2);
      const interp = Math.abs(r) > 0.3
        ? `${r > 0 ? 'Higher' : 'Lower'} ${c1l} tends to associate with ${r > 0 ? 'higher' : 'lower'} ${c2l}.`
        : `No meaningful linear relationship found.`;
      const answer = `Correlation between **${c1l}** and **${c2l}**: r = **${r}** (${strength} ${dir} relationship).\n\n${interp}`;
      return {
        answer,
        data: rows.slice(0, 20).map(r => ({ [c1l]: numVal(r[col1]), [c2l]: numVal(r[col2]) })),
        columns: [c1l, c2l],
        chartType: 'line',
      };
    }
  }

  // ── AVERAGE / COMPARE / BY / EQUITY / PER ───────────────────────────────
  if (/average|avg|mean|\bby\b|equity|compar|across|per |gap|breakdown|analysis|vs\.?|versus/.test(q)) {
    const catCol = findBestColumn(q, catCols, rows);
    const metricCol = findBestColumn(q, numCols, rows, true) || numCols[0];

    if (catCol && metricCol) {
      const result = groupAvg(rows, catCol, metricCol);
      const cl = label(catCol); const ml = label(metricCol);
      const overall = Math.round(colAvg(rows, metricCol));
      const high = result[0]; const low = result[result.length - 1];

      let answer = `Average ${ml} by ${cl} (overall: ${fmt(overall, metricCol)}):\n`
        + result.map(r => `• ${r.key}: ${fmt(r.value, metricCol)} (n=${r.count})`).join('\n');

      if (result.length >= 2) {
        const diff = Math.abs(high.value - low.value);
        const pct = high.value > 0 ? Math.round(diff / high.value * 100) : 0;
        answer += `\n\n**${high.key}** has the highest average ${ml} (${fmt(high.value, metricCol)}), `
          + `while **${low.key}** has the lowest (${fmt(low.value, metricCol)}) — a ${pct}% gap.`;
      }

      return {
        answer,
        data: result.map(r => ({ [cl]: r.key, [`Avg ${ml}`]: r.value, Count: r.count })),
        columns: [cl, `Avg ${ml}`, 'Count'],
        chartType: 'bar',
      };
    }

    // Average of a single numeric column
    if (metricCol) {
      const avg = Math.round(colAvg(rows, metricCol));
      const ml = label(metricCol);
      return {
        answer: `The average ${ml} is **${fmt(avg, metricCol)}** across ${rows.length} records.`,
        data: [{ Metric: ml, Average: avg }],
        columns: ['Metric', 'Average'],
        chartType: 'bar',
      };
    }
  }

  // ── FILTER / LIST / SHOW ─────────────────────────────────────────────────
  // Detect numeric threshold: "more than 3", "above 80", "less than 5"
  const aboveRx = q.match(/(?:more than|above|over|greater than|at least|exceed)\s*(\d+(?:\.\d+)?)/i);
  const belowRx = q.match(/(?:less than|below|under|at most|fewer than)\s*(\d+(?:\.\d+)?)/i);
  const threshold = aboveRx ? parseFloat(aboveRx[1]) : belowRx ? parseFloat(belowRx[1]) : null;
  const thresholdDir = aboveRx ? 'above' : belowRx ? 'below' : null;

  if (threshold !== null && thresholdDir) {
    const filterCol = findBestColumn(q, numCols, rows, true) || numCols[0];
    if (filterCol) {
      const filtered = rows.filter(r =>
        thresholdDir === 'above' ? numVal(r[filterCol]) > threshold : numVal(r[filterCol]) < threshold
      );
      const nameCol = columns.find(c => c.toLowerCase().includes('name')) || catCols[0];
      const showCols = [nameCol, filterCol, ...catCols.slice(0, 2)].filter(Boolean) as string[];
      const fl = label(filterCol);
      const answer = `Found **${filtered.length}** records where ${fl} is ${thresholdDir} ${fmt(threshold, filterCol)} (out of ${rows.length} total).`;
      return {
        answer,
        data: filtered.slice(0, 15).map(r => Object.fromEntries(showCols.map(c => [label(c), r[c]]))),
        columns: showCols.map(label),
        chartType: 'bar',
      };
    }
  }

  // Detect categorical filter: "who are female", "employees in Kigali", "status resigned"
  for (const catCol of catCols) {
    const uniqueVals = [...new Set(rows.map(r => String(r[catCol] ?? '')))].filter(Boolean);
    const matchedVal = uniqueVals.find(v => q.includes(v.toLowerCase()));
    if (matchedVal) {
      const filtered = rows.filter(r => String(r[catCol]) === matchedVal);
      const nameCol = columns.find(c => c.toLowerCase().includes('name')) || catCols[0];
      const showCols = [nameCol, catCol, ...numCols.slice(0, 2)].filter(Boolean) as string[];
      const cl = label(catCol);
      return {
        answer: `Found **${filtered.length}** records where ${cl} = **${matchedVal}**.`,
        data: filtered.slice(0, 15).map(r => Object.fromEntries(showCols.map(c => [label(c), r[c]]))),
        columns: showCols.map(label),
        chartType: 'bar',
      };
    }
  }

  // ── FALLBACK: best-effort display ────────────────────────────────────────
  // Pick the most relevant columns based on question keywords
  const relevantCols = columns.filter(c => {
    const parts = c.toLowerCase().split(/[_\s]+/);
    return parts.some(p => p.length > 2 && q.includes(p));
  });

  const nameCol = columns.find(c => c.toLowerCase().includes('name')) || catCols[0];
  const showCols = relevantCols.length >= 2
    ? relevantCols.slice(0, 5)
    : [nameCol, ...catCols.slice(0, 2), ...numCols.slice(0, 2)].filter(Boolean) as string[];

  // If a single numeric column is identified, do a distribution by category
  const defaultCat = catCols.find(c => c.toLowerCase().includes('department') || c.toLowerCase().includes('gender') || c.toLowerCase().includes('status')) || catCols[0];
  const defaultNum = numCols[0];

  if (defaultCat && defaultNum) {
    const result = groupAvg(rows, defaultCat, defaultNum);
    const cl = label(defaultCat); const ml = label(defaultNum);
    return {
      answer: `Here is the average ${ml} grouped by ${cl}:\n${result.map(r => `• ${r.key}: ${fmt(r.value, defaultNum)}`).join('\n')}`,
      data: result.map(r => ({ [cl]: r.key, [ml]: r.value })),
      columns: [cl, ml],
      chartType: 'bar',
    };
  }

  return {
    answer: `Here are the first ${Math.min(rows.length, 10)} records from your dataset:`,
    data: rows.slice(0, 10).map(r => Object.fromEntries(showCols.map(c => [label(c), r[c]]))),
    columns: showCols.map(label),
    chartType: 'bar',
  };
}
