import { Mic, MicOff, Volume2, AlertCircle, ShieldCheck, Loader2, Table2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { parseVoiceCommand, getCommandFeedback, isDashboardCommand, VoiceCommandAction } from '@/utils/voiceCommands';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { FileDropZone, FileAttachmentChip } from '@/components/shared/FileAttachment';
import type { ParsedFileData } from '@/utils/fileParser';
import { InlineDataChart, inferChartType, shouldShowChart } from '@/components/shared/InlineDataChart';

interface QueryResult {
  question: string;
  answer: string;
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  fileData?: Record<string, unknown>[];
}

interface VoiceControlProps {
  onCommand: (action: VoiceCommandAction) => void;
}

type VoiceMetricFocus = 'revenue' | 'campaigns' | 'clicks' | 'conversion' | 'impressions';

const inferMetricFocus = (text: string): VoiceMetricFocus | null => {
  const lower = text.toLowerCase();
  if (lower.includes('revenue') || lower.includes('profit') || lower.includes('cost')) return 'revenue';
  if (lower.includes('campaign')) return 'campaigns';
  if (lower.includes('click') || lower.includes('ctr')) return 'clicks';
  if (lower.includes('conversion') || lower.includes('convert')) return 'conversion';
  if (lower.includes('impression')) return 'impressions';
  if (lower.includes('deal') || lower.includes('pipeline') || lower.includes('contact') || lower.includes('lead')) return 'campaigns';
  return null;
};

export const VoiceControl = ({ onCommand }: VoiceControlProps) => {
  const [lastCommand, setLastCommand] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [attachedFile, setAttachedFile] = useState<ParsedFileData | null>(null);

  const handleVoiceResult = async (result: { transcript: string; isFinal: boolean }) => {
    if (!result.isFinal) return;

    const transcript = result.transcript;
    setLastCommand(transcript);

    if (isDashboardCommand(transcript)) {
      const action = parseVoiceCommand(transcript);
      const commandMetric = action.metric || (action.filter as VoiceMetricFocus | undefined);
      if (commandMetric) {
        onCommand({ ...action, metric: commandMetric, action: action.action || 'show' });
      } else {
        onCommand(action);
      }
      const feedbackMessage = getCommandFeedback(action);
      setFeedback(feedbackMessage);
      toast.success(feedbackMessage, { description: `"${transcript}"` });
      setTimeout(() => setFeedback(''), 5000);
    } else {
      setFeedback('');
      const transcriptFocus = inferMetricFocus(transcript);
      if (transcriptFocus) {
        // Even natural-language questions should drive card/chart analytics focus.
        onCommand({ metric: transcriptFocus, action: 'show' });
      } else {
        // Keep visualizations responsive even for broad questions.
        onCommand({ metric: 'campaigns', action: 'show' });
      }

      setQuerying(true);
      toast.info('Processing your question...', { description: `"${transcript}"` });
      try {
        const payload: Record<string, unknown> = { question: transcript };
        if (attachedFile) {
          payload.fileContext = {
            filename: attachedFile.filename,
            columns: attachedFile.columns,
            rows: attachedFile.rows,
            systemNote: 'The user has uploaded a file. Use this data to answer the query and generate visualizations.',
          };
        }
        const data = await api.post<QueryResult>('/ai/query', payload);
        if (attachedFile) {
          data.fileData = attachedFile.rows;
        }
        setQueryResult(data);
        setAttachedFile(null);

        // If transcript is broad, infer analytics focus from returned data/answer text.
        if (!transcriptFocus) {
          const resultText = `${data.answer} ${data.columns.join(' ')}`;
          const resultFocus = inferMetricFocus(resultText);
          if (resultFocus) {
            onCommand({ metric: resultFocus, action: 'show' });
          }
        }

        toast.success(`Found ${data.rowCount} result${data.rowCount !== 1 ? 's' : ''}`);
      } catch {
        toast.error('Could not process your question. Try rephrasing it.');
      } finally {
        setQuerying(false);
      }
    }
  };

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    confidence,
    error,
    hasPermission,
    requestPermission
  } = useVoiceRecognition(handleVoiceResult);

  if (!isSupported) {
    return (
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900 mb-1">Voice recognition not supported</p>
            <p className="text-sm text-amber-800">Please use Chrome, Edge, or Safari for voice control.</p>
          </div>
        </div>
      </Card>
    );
  }

  if (hasPermission === false || (hasPermission === null && error)) {
    return (
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-4">
          <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 mb-1">Microphone Access Required</p>
            <p className="text-sm text-blue-800 mb-3">Voice control requires microphone access.</p>
            <Button onClick={requestPermission} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Grant Microphone Access
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <FileDropZone onAttach={setAttachedFile} />
      {attachedFile && (
        <FileAttachmentChip data={attachedFile} onRemove={() => setAttachedFile(null)} />
      )}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <Button
            onClick={isListening ? stopListening : startListening}
            className={isListening ? "bg-red-600 hover:bg-red-700" : "bg-neutral-900 hover:bg-black text-white dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand/90"}
            size="lg"
            disabled={querying}
          >
            {isListening ? (
              <><MicOff className="w-5 h-5 mr-2" />Stop Listening</>
            ) : (
              <><Mic className="w-5 h-5 mr-2" />Start Voice Control</>
            )}
          </Button>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : querying ? 'bg-blue-500 animate-pulse' : 'bg-neutral-300'}`} />
              <span className="text-sm text-muted-foreground">
                {querying ? 'Querying database...' : isListening ? 'Listening...' : 'Voice control inactive'}
              </span>
            </div>

            {error && !isListening && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {isListening && transcript && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-neutral-50 rounded-lg p-3 border border-neutral-200"
                >
                  <div className="flex items-start gap-2">
                    <Volume2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{transcript}</p>
                      {confidence > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Confidence: {Math.round(confidence * 100)}%</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {querying && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing query...
              </motion.div>
            )}

            {feedback && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-medium">{feedback}</p>
                {lastCommand && <p className="text-xs text-green-600 mt-1">"{lastCommand}"</p>}
              </motion.div>
            )}

            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                Try: "What is total revenue this month?", "Show campaign analytics", "How many conversions do we have?", "Show click metrics", "Show impression metrics"
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Query Results */}
      <AnimatePresence>
        {queryResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-foreground/90">"{queryResult.question}"</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setQueryResult(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-sm text-foreground font-medium mb-3">{queryResult.answer}</p>

              {queryResult.fileData && queryResult.fileData.length > 0 && shouldShowChart(queryResult.question) && (
                <InlineDataChart
                  type={inferChartType(queryResult.question, queryResult.fileData)}
                  data={queryResult.fileData}
                />
              )}

              {queryResult.data.length > 0 && (
                <>
                  <div className="overflow-x-auto rounded-lg border border-border bg-card">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          {queryResult.columns.map(col => (
                            <th key={col} className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.data.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40">
                            {queryResult.columns.map(col => (
                              <td key={col} className="px-3 py-2 text-foreground/90 whitespace-nowrap max-w-[250px] truncate">
                                {String(row[col] ?? '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {queryResult.rowCount > 10 && (
                    <p className="text-xs text-muted-foreground mt-2">Showing 10 of {queryResult.rowCount} results</p>
                  )}
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
