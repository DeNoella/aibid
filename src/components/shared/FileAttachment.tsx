'use client';

import { useRef, useState } from 'react';
import { Paperclip, X, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseFile, type ParsedFileData } from '@/utils/fileParser';
import { toast } from 'sonner';

const MAX_SIZE_MB = 20;
const ACCEPT = '.csv,.xlsx,.xls,.json';

interface FileAttachmentChipProps {
  data: ParsedFileData;
  onRemove: () => void;
}

export function FileAttachmentChip({ data, onRemove }: FileAttachmentChipProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm">
      <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
      <span className="font-medium truncate max-w-[180px]">{data.filename}</span>
      <span className="text-xs text-muted-foreground">{data.rowCount} rows</span>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface FileAttachmentButtonProps {
  onAttach: (data: ParsedFileData) => void;
  maxSizeMb?: number;
  className?: string;
}

export function FileAttachmentButton({ onAttach, maxSizeMb = MAX_SIZE_MB, className }: FileAttachmentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File must be under ${maxSizeMb} MB`);
      return;
    }
    setLoading(true);
    try {
      const parsed = await parseFile(file);
      onAttach(parsed);
      toast.success(`Attached ${parsed.filename}`);
    } catch {
      toast.error('Could not parse file');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <Button type="button" variant="outline" size="sm" className={className} disabled={loading} onClick={() => inputRef.current?.click()}>
        <Paperclip className="w-4 h-4 mr-2" />
        {loading ? 'Parsing...' : 'Attach file'}
      </Button>
    </>
  );
}

interface FileDropZoneProps {
  onAttach: (data: ParsedFileData) => void;
  maxSizeMb?: number;
}

export function FileDropZone({ onAttach, maxSizeMb = MAX_SIZE_MB }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File must be under ${maxSizeMb} MB`);
      return;
    }
    try {
      const parsed = await parseFile(file);
      onAttach(parsed);
    } catch {
      toast.error('Could not parse file');
    }
  };

  return (
    <div
      className={`border border-dashed rounded-lg p-4 text-center transition-colors ${dragOver ? 'border-neutral-800 bg-neutral-50 dark:bg-neutral-900' : 'border-neutral-200 dark:border-neutral-700'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <p className="text-sm text-muted-foreground mb-2">Attach CSV, Excel, or JSON (max {maxSizeMb} MB)</p>
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Paperclip className="w-4 h-4 mr-2" />
        Attach file
      </Button>
    </div>
  );
}

export function buildFileContextNote(data: ParsedFileData): string {
  return `The user has uploaded a file. Use this data to answer the query and generate visualizations.\n\nFile: ${data.filename}\nColumns: ${data.columns.join(', ')}\nRows (sample): ${JSON.stringify(data.rows.slice(0, 5))}`;
}
