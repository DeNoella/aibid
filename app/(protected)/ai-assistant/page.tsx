'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import { Brain, Send, Sparkles, TrendingUp, AlertTriangle, Target, Lightbulb, Loader2, Table2, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { FileAttachmentButton, FileAttachmentChip } from '@/components/shared/FileAttachment';
import type { ParsedFileData } from '@/utils/fileParser';
import { InlineDataChart, inferChartType, shouldShowChart } from '@/components/shared/InlineDataChart';

interface QueryData {
  answer: string;
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  fileData?: Record<string, unknown>[];
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryData?: QueryData | null;
}

interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  created_at: string;
}

export default function AIAssistantPage() {
  const { user } = useAuth();
  const isFreeTrial = user?.role !== 'admin' && user?.subscriptionStatus === 'free_trial';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your AI-powered CRM assistant. Ask me anything about your contacts, deals, campaigns, or analytics and I\'ll give you real answers from your database.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<ParsedFileData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: voiceSupported,
  } = useVoiceRecognition();

  useEffect(() => {
    if (isListening && transcript) {
      setInput(transcript);
    }
  }, [transcript, isListening]);

  useEffect(() => {
    api.get<AIInsight[]>('/ai/insights').then(setInsights).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const chatMinHeight = Math.min(640, Math.max(220, messages.length * 72 + 140));

  const ensureConversation = async (): Promise<string> => {
    if (conversationId) return conversationId;
    const conv = await api.post<{ id: string }>('/ai/conversations', { title: 'AI Query Session' });
    setConversationId(conv.id);
    return conv.id;
  };

  const handleSend = async (text?: string) => {
    const question = text || input;
    if (!question.trim() || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    if (attachedFile) {
      setMessages(prev => [...prev, {
        id: `sys-${Date.now()}`,
        type: 'assistant',
        content: `📎 ${attachedFile.filename} attached — ${attachedFile.rowCount} rows, ${attachedFile.columnCount} columns`,
        timestamp: new Date(),
      }]);
    }

    setInput('');
    setSending(true);

    try {
      const convId = await ensureConversation();
      const payload: Record<string, unknown> = { content: question };
      if (attachedFile) {
        payload.fileContext = {
          filename: attachedFile.filename,
          columns: attachedFile.columns,
          rows: attachedFile.rows,
        };
      }
      const result = await api.post<{
        assistantMessage: { id: string; content: string; created_at: string };
        queryData?: QueryData | null;
      }>(
        `/ai/conversations/${convId}/messages`,
        payload
      );

      const assistantMessage: Message = {
        id: result.assistantMessage.id,
        type: 'assistant',
        content: result.assistantMessage.content,
        timestamp: new Date(result.assistantMessage.created_at),
        queryData: result.queryData,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      toast.error('Failed to get AI response');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const renderDataTable = (queryData: QueryData) => {
    if (!queryData.data || queryData.data.length === 0) return null;
    const displayRows = queryData.data.slice(0, 10);
    const columns = queryData.columns;

    return (
      <div className="mt-3">
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted border-b border-border">
                {columns.map(col => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40">
                  {columns.map(col => (
                    <td key={col} className="px-3 py-2 text-foreground/90 whitespace-nowrap max-w-[250px] truncate">
                      {String(row[col] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {queryData.rowCount > 10 && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Showing 10 of {queryData.rowCount} results
          </p>
        )}
      </div>
    );
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="w-5 h-5" />;
      case 'anomaly': return <AlertTriangle className="w-5 h-5" />;
      case 'prediction': return <Target className="w-5 h-5" />;
      case 'recommendation': return <Lightbulb className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-neutral-100 text-foreground/90 border-neutral-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center flex-shrink-0">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">Ask questions about your data in natural language</p>
        </div>
      </div>

      {isFreeTrial && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
          <p className="text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Free Trial:</span> Upgrade to Premium for unlimited AI queries and advanced analytics.
          </p>
          <Link href="/upgrade" className="shrink-0 font-semibold text-amber-900 dark:text-amber-200 underline underline-offset-2">
            Upgrade
          </Link>
        </div>
      )}

      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList className="bg-neutral-100 dark:bg-neutral-800">
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="insights">Generated Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <Card
            className="flex flex-col overflow-hidden transition-[min-height] duration-300 ease-out max-h-[70vh]"
            style={{ minHeight: `${chatMinHeight}px` }}
          >
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                        message.type === 'user'
                          ? 'bg-neutral-800 text-white dark:bg-neutral-700'
                          : 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                      }`}
                    >
                      {message.type === 'assistant' && message.queryData && message.queryData.data.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Table2 className="w-3.5 h-3.5 text-brand" />
                          <span className="text-xs font-medium text-brand">
                            {message.queryData.rowCount} result{message.queryData.rowCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.type === 'assistant' && message.queryData?.fileData && message.queryData.fileData.length > 0 && shouldShowChart(message.content) && (
                        <InlineDataChart type={inferChartType(message.content, message.queryData.fileData)} data={message.queryData.fileData} />
                      )}
                      {message.type === 'assistant' && message.queryData && renderDataTable(message.queryData)}
                      <p className="text-xs opacity-60 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {sending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Querying your data...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {isListening && transcript && (
              <div className="px-4 pb-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                  {transcript}
                </div>
              </div>
            )}

            <div className="border-t border-neutral-200 p-4 space-y-2">
              {attachedFile && (
                <FileAttachmentChip data={attachedFile} onRemove={() => setAttachedFile(null)} />
              )}
              <div className="flex gap-2">
                <FileAttachmentButton onAttach={setAttachedFile} className="shrink-0" />
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about contacts, deals, campaigns, revenue..."
                  className="flex-1"
                  disabled={sending}
                />
                {voiceSupported && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                        const finalQuestion = transcript || input;
                        if (finalQuestion.trim()) {
                          handleSend(finalQuestion.trim());
                        }
                      } else {
                        setInput('');
                        startListening();
                      }
                    }}
                    className={isListening ? 'bg-red-600 border-red-600 text-white hover:bg-red-700' : ''}
                    disabled={sending}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                )}
                <Button onClick={() => handleSend()} className="bg-neutral-800 hover:bg-neutral-900 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200" disabled={sending}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-sm font-medium text-foreground/90 mb-3">Quick Questions</p>
            <div className="flex flex-wrap gap-2">
              {[
                'How many contacts do we have?',
                'Show top 5 deals by value',
                'What is total campaign revenue?',
                'List all active campaigns',
                'Show contacts by lifecycle stage',
                'What are our pipeline stages?',
                'Show deals closing this month',
                'Which companies have the most contacts?',
              ].map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(question)}
                  className="text-xs"
                  disabled={sending}
                >
                  {question}
                </Button>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {isFreeTrial && (
            <Card className="p-5 flex items-center gap-4 border-dashed border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Predictive Analytics — Premium Feature</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Upgrade to Premium for advanced forecasts, predictions, and deeper insights.</p>
              </div>
              <Link href="/upgrade" className="shrink-0 text-xs font-semibold text-amber-900 dark:text-amber-200 underline underline-offset-2">
                Upgrade
              </Link>
            </Card>
          )}
          {insights.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
              <p className="text-muted-foreground">Loading insights...</p>
            </Card>
          ) : (
            insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      insight.type === 'trend' ? 'bg-blue-100 text-blue-600' :
                      insight.type === 'anomaly' ? 'bg-amber-100 text-amber-600' :
                      insight.type === 'prediction' ? 'bg-purple-100 text-purple-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {getInsightIcon(insight.type)}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize">{insight.type}</Badge>
                            <Badge className={getImpactColor(insight.impact)}>
                              {insight.impact.toUpperCase()} Impact
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-foreground">{insight.title}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <p className="text-sm font-semibold text-foreground">
                            {Math.round(insight.confidence * 100)}%
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                        <p className="text-xs text-muted-foreground">
                          {new Date(insight.created_at).toLocaleDateString()} at {new Date(insight.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <Button variant="ghost" size="sm" className="text-xs">View Details</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
