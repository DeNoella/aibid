'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api';
import {
  Brain,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  Lightbulb,
  Loader2,
  Table2,
  Mic,
  MicOff,
  Plus,
  MessageSquare,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { FileAttachmentButton, FileAttachmentChip } from '@/components/shared/FileAttachment';
import type { ParsedFileData } from '@/utils/fileParser';
import { InlineDataChart, inferChartType } from '@/components/shared/InlineDataChart';

interface QueryData {
  answer: string;
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  fileData?: Record<string, unknown>[];
  chartType?: 'bar' | 'line' | 'pie';
  showChart?: boolean;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryData?: QueryData | null;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  last_message?: string;
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

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  type: 'assistant',
  content: "Hello! I'm your AI-powered assistant. Ask me anything about your data — contacts, deals, campaigns, analytics — or upload a file and I'll analyse it for you. I remember our past conversations so you can always pick up where we left off.",
  timestamp: new Date(),
};

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 2) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function AIAssistantPage() {
  const { user } = useAuth();
  const isFreeTrial = user?.role !== 'admin' && user?.subscriptionStatus === 'free_trial';

  // Chat state
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<ParsedFileData | null>(null);
  // Persists the loaded file across follow-up questions in the same session
  const [activeFileData, setActiveFileData] = useState<ParsedFileData | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chat');

  // Conversation history state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [loadingConvId, setLoadingConvId] = useState<string | null>(null);

  // Insights
  const [insights, setInsights] = useState<AIInsight[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, transcript, startListening, stopListening, isSupported: voiceSupported } = useVoiceRecognition();

  // Sync live voice transcript into input
  useEffect(() => {
    if (isListening && transcript) setInput(transcript);
  }, [transcript, isListening]);

  useEffect(() => {
    api.get<AIInsight[]>('/ai/insights').then(setInsights).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    setConvsLoading(true);
    try {
      const data = await api.get<Conversation[]>('/ai/conversations');
      setConversations(data);
    } catch {
      // silently fail — history is optional
    } finally {
      setConvsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load a past conversation's messages
  const openConversation = async (conv: Conversation) => {
    if (loadingConvId === conv.id) return;
    setLoadingConvId(conv.id);
    try {
      type RawMsg = { id: string; role: string; content: string; created_at: string };
      const msgs = await api.get<RawMsg[]>(`/ai/conversations/${conv.id}/messages`);
      const loaded: Message[] = msgs.map((m) => ({
        id: m.id,
        type: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
        timestamp: new Date(m.created_at),
      }));
      setMessages(loaded.length ? loaded : [WELCOME_MESSAGE]);
      setConversationId(conv.id);
      setActiveFileData(null); // clear file context when switching conversations
      setActiveTab('chat');
    } catch {
      toast.error('Could not load conversation');
    } finally {
      setLoadingConvId(null);
    }
  };

  // Start a brand-new conversation
  const startNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setConversationId(null);
    setInput('');
    setAttachedFile(null);
    setActiveFileData(null);
    setActiveTab('chat');
  };

  const ensureConversation = async (firstQuestion: string): Promise<string> => {
    if (conversationId) return conversationId;
    const title = firstQuestion.length > 60 ? firstQuestion.slice(0, 57) + '…' : firstQuestion;
    const conv = await api.post<{ id: string }>('/ai/conversations', { title });
    setConversationId(conv.id);
    // Refresh the list so the new conversation appears immediately
    loadConversations();
    return conv.id;
  };

  const handleSend = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    if (attachedFile) {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          type: 'assistant',
          content: `📎 ${attachedFile.filename} attached — ${attachedFile.rowCount} rows, ${attachedFile.columnCount} columns`,
          timestamp: new Date(),
        },
      ]);
    }

    setInput('');
    setSending(true);

    try {
      const convId = await ensureConversation(question);
      const payload: Record<string, unknown> = { content: question };

      // Use the newly attached file OR the one already loaded for this session
      const fileForQuery = attachedFile ?? activeFileData;
      if (fileForQuery) {
        payload.fileContext = {
          filename: fileForQuery.filename,
          columns: fileForQuery.columns,
          rows: fileForQuery.rows,
        };
        if (attachedFile) {
          // Promote newly attached file to the active session file
          setActiveFileData(attachedFile);
          setAttachedFile(null);
        }
      }

      const result = await api.post<{
        assistantMessage: { id: string; content: string; created_at: string };
        queryData?: QueryData | null;
      }>(`/ai/conversations/${convId}/messages`, payload);

      setMessages((prev) => [
        ...prev,
        {
          id: result.assistantMessage.id,
          type: 'assistant',
          content: result.assistantMessage.content,
          timestamp: new Date(result.assistantMessage.created_at),
          queryData: result.queryData,
        },
      ]);

      // Refresh conversation list so title/timestamp update
      loadConversations();
    } catch {
      toast.error('Failed to get AI response');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const renderDataTable = (queryData: QueryData) => {
    if (!queryData.data || queryData.data.length === 0) return null;
    const displayRows = queryData.data.slice(0, 10);
    return (
      <div className="mt-3">
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted border-b border-border">
                {queryData.columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40">
                  {queryData.columns.map((col) => (
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
          <p className="text-xs text-muted-foreground mt-1.5">Showing 10 of {queryData.rowCount} results</p>
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

  const chatMinHeight = Math.min(640, Math.max(300, messages.length * 72 + 140));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">Ask questions in natural language — conversations are remembered</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={startNewChat} className="shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {isFreeTrial && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
          <p className="text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Free Trial:</span> Upgrade to Premium for unlimited AI queries and advanced analytics.
          </p>
          <Link href="/upgrade" className="shrink-0 font-semibold text-amber-900 dark:text-amber-200 underline underline-offset-2">Upgrade</Link>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-neutral-100 dark:bg-neutral-800">
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Chat History
            {conversations.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">{conversations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* ── Chat Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="chat" className="space-y-4">
          <Card
            className="flex flex-col overflow-hidden transition-[min-height] duration-300 ease-out max-h-[70vh]"
            style={{ minHeight: `${chatMinHeight}px` }}
          >
            {/* Conversation context indicator */}
            {conversationId && conversations.find((c) => c.id === conversationId) && (
              <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[240px]">
                    {conversations.find((c) => c.id === conversationId)?.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={startNewChat}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3 h-3" />New chat
                </button>
              </div>
            )}

            {/* Messages */}
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
                          <Table2 className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {message.queryData.rowCount} result{message.queryData.rowCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                      {/* Chart built from the AGGREGATED result (clean label/value pairs),
                          using the engine's chosen chart type — never from raw rows. */}
                      {message.type === 'assistant' && message.queryData
                        && (message.queryData.showChart ?? message.queryData.data.length >= 2)
                        && message.queryData.data.length >= 2 && (
                        <InlineDataChart
                          type={message.queryData.chartType ?? inferChartType(message.content, message.queryData.data)}
                          data={message.queryData.data}
                        />
                      )}

                      {message.type === 'assistant' && message.queryData && renderDataTable(message.queryData)}

                      <p className="text-xs opacity-60 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {sending && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Querying your data…</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Live voice transcript */}
            {isListening && transcript && (
              <div className="px-4 pb-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300">
                  {transcript}
                </div>
              </div>
            )}

            {/* Input row */}
            <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 space-y-2">
              {/* Newly attached file (pending) */}
              {attachedFile && (
                <FileAttachmentChip data={attachedFile} onRemove={() => setAttachedFile(null)} />
              )}
              {/* Active session file — persists across follow-up questions */}
              {!attachedFile && activeFileData && (
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-neutral-50 dark:bg-neutral-800/60 rounded-lg px-3 py-1.5">
                  <span>📎 Using <strong>{activeFileData.filename}</strong> for this conversation</span>
                  <button
                    type="button"
                    className="ml-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setActiveFileData(null)}
                    title="Remove dataset from session"
                  >✕</button>
                </div>
              )}
              <div className="flex gap-2">
                <FileAttachmentButton onAttach={setAttachedFile} className="shrink-0" />
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Ask about contacts, deals, campaigns, revenue…"
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
                        if (finalQuestion.trim()) handleSend(finalQuestion.trim());
                      } else {
                        setInput('');
                        startListening();
                      }
                    }}
                    className={isListening ? 'bg-red-600 border-red-600 text-white hover:bg-red-700' : ''}
                    disabled={sending}
                    title={isListening ? 'Stop recording' : 'Start voice input'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                )}
                <Button
                  onClick={() => handleSend()}
                  className="bg-neutral-900 hover:bg-black text-white dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand/90"
                  disabled={sending}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Questions */}
          <Card className="p-4">
            <p className="text-sm font-medium text-foreground/90 mb-3">Quick questions</p>
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

        {/* ── Chat History Tab ──────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {conversations.length === 0
                ? 'No past conversations yet'
                : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''} — click one to continue it`}
            </p>
            <Button variant="outline" size="sm" onClick={startNewChat}>
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          {convsLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading conversations…</span>
            </div>
          ) : conversations.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="text-muted-foreground text-sm">Start chatting and your conversations will appear here.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <button
                    type="button"
                    className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-600 ${
                      conversationId === conv.id
                        ? 'border-neutral-800 bg-neutral-50 dark:border-neutral-400 dark:bg-neutral-800/50'
                        : 'border-neutral-200 dark:border-neutral-700 bg-card'
                    }`}
                    onClick={() => openConversation(conv)}
                    disabled={loadingConvId === conv.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                          {loadingConvId === conv.id
                            ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            : <MessageSquare className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{conv.title}</p>
                          {conv.last_message && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{formatRelative(conv.updated_at)}</span>
                        {conversationId === conv.id && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Active</Badge>
                        )}
                        <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground rotate-180" />
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Insights Tab ─────────────────────────────────────────────── */}
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
              <Link href="/upgrade" className="shrink-0 text-xs font-semibold text-amber-900 dark:text-amber-200 underline underline-offset-2">Upgrade</Link>
            </Card>
          )}
          {insights.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
              <p className="text-muted-foreground">No insights generated yet.</p>
            </Card>
          ) : (
            insights.map((insight, index) => (
              <motion.div key={insight.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      insight.type === 'trend' ? 'bg-blue-100 text-blue-600'
                      : insight.type === 'anomaly' ? 'bg-amber-100 text-amber-600'
                      : insight.type === 'prediction' ? 'bg-purple-100 text-purple-600'
                      : 'bg-green-100 text-green-600'}`}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize">{insight.type}</Badge>
                            <Badge className={getImpactColor(insight.impact)}>{insight.impact.toUpperCase()} Impact</Badge>
                          </div>
                          <h3 className="font-semibold text-foreground">{insight.title}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <p className="text-sm font-semibold text-foreground">{Math.round(insight.confidence * 100)}%</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700">
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
