'use client';

import { useCallback, useState } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/shared/PageStates';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';

const TARGET_FIELDS = ['date', 'campaign', 'revenue', 'clicks', 'conversions', 'customer_id', 'region'];

interface ParsedData {
  headers: string[];
  rows: string[][];
  fileName: string;
}

interface QualityReport {
  score: number;
  totalRows: number;
  nullCells: number;
  duplicateRows: number;
  warnings: string[];
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else current += char;
    }
    cells.push(current.trim());
    return cells;
  });
  return { headers, rows };
}

function computeQuality(headers: string[], rows: string[][]): QualityReport {
  const totalCells = rows.length * headers.length;
  let nullCells = 0;
  rows.forEach((row) => {
    row.forEach((cell) => {
      if (!cell || cell === 'null' || cell === 'NULL' || cell === 'N/A') nullCells++;
    });
  });
  const rowStrings = rows.map((r) => r.join('|'));
  const uniqueRows = new Set(rowStrings);
  const duplicateRows = rows.length - uniqueRows.size;
  const nullPct = totalCells > 0 ? nullCells / totalCells : 0;
  const dupPct = rows.length > 0 ? duplicateRows / rows.length : 0;
  const score = Math.max(0, Math.round(100 - nullPct * 60 - dupPct * 40));
  const warnings: string[] = [];
  if (nullPct > 0.1) warnings.push(`${Math.round(nullPct * 100)}% of cells contain null or empty values`);
  if (duplicateRows > 0) warnings.push(`${duplicateRows} duplicate rows detected`);
  if (headers.length < 3) warnings.push('Dataset has fewer than 3 columns');
  return { score, totalRows: rows.length, nullCells, duplicateRows, warnings };
}

function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  TARGET_FIELDS.forEach((field) => {
    const match = headers.find((h) => {
      const normalized = h.toLowerCase().replace(/[\s_-]/g, '');
      return normalized.includes(field.replace('_', '')) || field.includes(normalized);
    });
    if (match) mapping[field] = match;
  });
  return mapping;
}

function UploadContent() {
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [category, setCategory] = useState('campaign');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0) {
        toast.error('Could not parse file');
        return;
      }
      const q = computeQuality(headers, rows);
      setParsed({ headers, rows, fileName: file.name });
      setQuality(q);
      setColumnMap(autoMapColumns(headers));
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmUpload = async () => {
    if (!parsed || !quality) return;
    setUploading(true);
    try {
      await api.post('/data/upload', {
        fileName: parsed.fileName,
        category,
        qualityScore: quality.score,
        rowCount: quality.totalRows,
        columnMapping: columnMap,
        replaceExisting,
      });
      toast.success('Data uploaded successfully');
      setConfirmOpen(false);
      setParsed(null);
      setQuality(null);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const canUpload = quality != null && quality.score >= 40;
  const previewRows = parsed?.rows.slice(0, 20) ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload Data</h1>
        <p className="text-sm text-muted-foreground">Import CSV files with quality validation</p>
      </div>

      <Card
        className={`p-8 border-2 border-dashed transition-colors ${dragOver ? 'border-neutral-800 bg-neutral-50 dark:bg-neutral-900' : 'border-neutral-200 dark:border-neutral-700'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center text-center">
          <Upload className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="font-medium text-foreground mb-1">Drag and drop your CSV file</p>
          <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
          <label>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileInput} />
            <Button variant="outline" asChild>
              <span>Select file</span>
            </Button>
          </label>
        </div>
      </Card>

      {parsed && quality && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="font-semibold">{parsed.fileName}</h3>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Quality score</span>
                <span className={`font-bold tabular-nums ${quality.score < 40 ? 'text-red-600' : quality.score < 70 ? 'text-amber-600' : 'text-green-600'}`}>
                  {quality.score}%
                </span>
              </div>
              <Progress value={quality.score} className="mb-4" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Rows:</span> {quality.totalRows}</div>
                <div><span className="text-muted-foreground">Null cells:</span> {quality.nullCells}</div>
                <div><span className="text-muted-foreground">Duplicates:</span> {quality.duplicateRows}</div>
              </div>
              {quality.warnings.length > 0 && (
                <ul className="mt-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  {quality.warnings.map((w) => (
                    <li key={w} className="flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
              {quality.score < 40 && (
                <p className="mt-3 text-sm text-red-600 font-medium">
                  Quality below 40% — upload disabled until data is cleaned.
                </p>
              )}
            </Card>

            <Card className="p-4 sm:p-6">
              <h3 className="font-semibold mb-3">Upload options</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campaign">Campaign metrics</SelectItem>
                      <SelectItem value="crm">CRM contacts</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="replace"
                    checked={replaceExisting}
                    onCheckedChange={(v) => setReplaceExisting(!!v)}
                  />
                  <Label htmlFor="replace" className="text-sm cursor-pointer">Replace existing data in category</Label>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4 sm:p-6">
            <h3 className="font-semibold mb-3">Column mapping</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TARGET_FIELDS.map((field) => (
                <div key={field}>
                  <Label className="text-xs text-muted-foreground capitalize">{field.replace('_', ' ')}</Label>
                  <Select
                    value={columnMap[field] ?? '__none__'}
                    onValueChange={(v) =>
                      setColumnMap((prev) => {
                        const next = { ...prev };
                        if (v === '__none__') delete next[field];
                        else next[field] = v;
                        return next;
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Auto-map" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {parsed.headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Badge variant="outline" className="mt-3 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Auto-mapped {Object.keys(columnMap).length} of {TARGET_FIELDS.length} fields
            </Badge>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Preview (first 20 rows)</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {parsed.headers.map((h) => (
                      <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {parsed.headers.map((_, j) => (
                        <TableCell key={j} className="whitespace-nowrap text-sm">{row[j] ?? ''}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              className="bg-neutral-800 hover:bg-neutral-900 dark:bg-white dark:text-neutral-900"
              disabled={!canUpload}
              onClick={() => setConfirmOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Confirm upload
            </Button>
          </div>
        </>
      )}

      {!parsed && (
        <EmptyState title="No file selected" description="Upload a CSV file to preview data and run quality checks." />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm upload</DialogTitle>
            <DialogDescription>
              Upload {parsed?.fileName} ({quality?.totalRows} rows) to {category} with quality score {quality?.score}%.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmUpload} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DataUploadPage() {
  return (
    <RoleGuard allowedRoles={['analyst']}>
      <UploadContent />
    </RoleGuard>
  );
}
