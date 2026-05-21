import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedFileData {
  filename: string;
  fileType: string;
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  columnCount: number;
}

const MAX_ROWS = 500;

export async function parseFile(file: File): Promise<ParsedFileData> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  let rows: Record<string, unknown>[] = [];

  if (ext === 'csv') {
    const text = await file.text();
    const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    rows = result.data;
  } else if (ext === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    rows = Array.isArray(parsed) ? parsed : [parsed];
  } else if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  } else {
    throw new Error('Unsupported file type');
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return {
    filename: file.name,
    fileType: ext.toUpperCase(),
    rows: rows.slice(0, MAX_ROWS),
    columns,
    rowCount: rows.length,
    columnCount: columns.length,
  };
}

export function inferColumnType(values: unknown[]): string {
  const sample = values.filter((v) => v != null && v !== '').slice(0, 20);
  if (sample.length === 0) return 'string';
  if (sample.every((v) => typeof v === 'boolean' || v === 'true' || v === 'false')) return 'boolean';
  if (sample.every((v) => !isNaN(Number(v)))) return 'number';
  if (sample.every((v) => !isNaN(Date.parse(String(v))))) return 'date';
  return 'string';
}

export function computeQualityScore(rows: Record<string, unknown>[]): {
  score: number;
  completeness: number;
  duplicateCount: number;
  missingByColumn: { column: string; missing: number }[];
  formatIssues: string[];
} {
  if (rows.length === 0) return { score: 0, completeness: 0, duplicateCount: 0, missingByColumn: [], formatIssues: [] };

  const columns = Object.keys(rows[0]);
  let totalCells = rows.length * columns.length;
  let nullCells = 0;
  const missingByColumn: { column: string; missing: number }[] = [];

  for (const col of columns) {
    let missing = 0;
    for (const row of rows) {
      const val = row[col];
      if (val == null || val === '') {
        missing++;
        nullCells++;
      }
    }
    if (missing > 0) missingByColumn.push({ column: col, missing });
  }

  missingByColumn.sort((a, b) => b.missing - a.missing);

  const rowStrings = rows.map((r) => JSON.stringify(r));
  const uniqueRows = new Set(rowStrings);
  const duplicateCount = rows.length - uniqueRows.size;

  const formatIssues: string[] = [];
  for (const col of columns) {
    const types = new Set(rows.slice(0, 50).map((r) => inferColumnType([r[col]])));
    if (types.size > 2) formatIssues.push(`Mixed formats in "${col}"`);
  }

  const completeness = totalCells > 0 ? ((totalCells - nullCells) / totalCells) * 100 : 0;
  let score = completeness;
  score -= duplicateCount * 0.5;
  score -= formatIssues.length * 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, completeness: Math.round(completeness), duplicateCount, missingByColumn: missingByColumn.slice(0, 5), formatIssues };
}
