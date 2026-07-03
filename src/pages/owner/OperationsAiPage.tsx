import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletStore } from '@/stores/outletStore';
import { useAuth } from '@/hooks/useAuth';
import { operationsAiApi } from '@/api/operationsAi';
import { Bot, RefreshCw, Sparkles } from 'lucide-react';
import { ChatSidebar } from '@/components/operations-ai/ChatSidebar';
import { ChatInput } from '@/components/operations-ai/ChatInput';
import { QuickAskChips } from '@/components/operations-ai/QuickAskChips';
import { ContextChips } from '@/components/operations-ai/ContextChips';
import { SuggestionChips } from '@/components/operations-ai/SuggestionChips';
import { EmptyState } from '@/components/operations-ai/EmptyState';
import { OpsAiResponseCard, isInsightCardType } from '@/components/operations-ai/OpsAiResponseCard';
import { parseResponseCard } from '@/components/operations-ai/parseResponseCard';
import type { ChatMessage, ChatThread, ParsedContext, ThreadUiPrefs } from '@/components/operations-ai/types';
import {
  detectDomainFromMeta,
  formatDateTime,
  isPersistedThreadId,
  nowIso,
} from '@/components/operations-ai/utils';

const THREAD_PREFS_KEY = 'neoengine-ops-ai-thread-prefs';

function loadThreadPrefs(): ThreadUiPrefs {
  try {
    const raw = localStorage.getItem(THREAD_PREFS_KEY);
    if (!raw) return { pinnedIds: [], hiddenIds: [], titleOverrides: {} };
    return JSON.parse(raw);
  } catch {
    return { pinnedIds: [], hiddenIds: [], titleOverrides: {} };
  }
}

function saveThreadPrefs(prefs: ThreadUiPrefs) {
  localStorage.setItem(THREAD_PREFS_KEY, JSON.stringify(prefs));
}

function buildDefaultThread(): ChatThread {
  const now = nowIso();
  return {
    id: `thread-${Date.now()}`,
    sessionId: `ops-web-${Date.now().toString(36)}`,
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function isWelcomeOnly(messages: ChatMessage[]) {
  return messages.length === 0 || (messages.length === 1 && messages[0].id === 'welcome');
}

export function OperationsAiPage() {
  const { user } = useAuth();
  const { selectedOutletId, outlets } = useOutletStore();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [error, setError] = useState('');
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [threadPrefs, setThreadPrefs] = useState<ThreadUiPrefs>(loadThreadPrefs);
  const [contextOverride, setContextOverride] = useState<Partial<ParsedContext>>({});
  const [removedContextKeys, setRemovedContextKeys] = useState<Set<keyof ParsedContext>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedOutletName = useMemo(
    () => outlets.find((o) => o._id === selectedOutletId)?.name,
    [outlets, selectedOutletId]
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingThreads(true);
      try {
        const list = await operationsAiApi.listThreads();
        if (!mounted) return;
        const items = (list.data || []).map((t) => ({
          id: t.id,
          sessionId: t.sessionId,
          title: t.title || 'New chat',
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          messages: [],
        })) as ChatThread[];
        if (items.length === 0) {
          const fresh = buildDefaultThread();
          setThreads([fresh]);
          setActiveThreadId(fresh.id);
        } else {
          setThreads(items);
          setActiveThreadId(items[0].id);
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'Failed to load chat threads');
        const fresh = buildDefaultThread();
        setThreads([fresh]);
        setActiveThreadId(fresh.id);
      } finally {
        if (mounted) setLoadingThreads(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeThreadId && threads[0]?.id) {
      setActiveThreadId(threads[0].id);
    }
  }, [activeThreadId, threads]);

  useEffect(() => {
    const active = threads.find((t) => t.id === activeThreadId);
    if (!active || active.messages.length > 0 || !isPersistedThreadId(active.id)) return;
    let cancelled = false;
    operationsAiApi
      .getThread(active.id)
      .then((res) => {
        if (cancelled) return;
        const detail = res.data;
        const mapped: ChatMessage[] = (detail.messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          meta: m.meta || '',
          createdAt: m.createdAt || nowIso(),
        }));
        setThreads((prev) =>
          prev.map((t) =>
            t.id === active.id
              ? {
                  ...t,
                  title: detail.title || t.title,
                  sessionId: detail.sessionId || t.sessionId,
                  createdAt: detail.createdAt || t.createdAt,
                  updatedAt: detail.updatedAt || t.updatedAt,
                  messages: mapped,
                }
              : t
          )
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, threads]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) || threads[0],
    [threads, activeThreadId]
  );

  const visibleMessages = useMemo(() => {
    const msgs = activeThread?.messages || [];
    return msgs.filter((m) => m.id !== 'welcome');
  }, [activeThread?.messages]);

  useEffect(() => {
    setRemovedContextKeys(new Set());
  }, [activeThreadId]);

  const conversationContext = useMemo(() => {
    const ctx: ParsedContext = {};
    if (!removedContextKeys.has('outlet')) {
      ctx.outlet = contextOverride.outlet ?? selectedOutletName ?? undefined;
    }
    if (!removedContextKeys.has('period')) {
      ctx.period = contextOverride.period;
    }
    if (!removedContextKeys.has('employee')) {
      ctx.employee = contextOverride.employee;
    }
    for (let i = visibleMessages.length - 1; i >= 0; i -= 1) {
      const m = visibleMessages[i];
      if (m.role !== 'assistant' || m.isThinking) continue;
      const parsed = parseResponseCard(m.text, m.meta);
      if ('context' in parsed) {
        if (!removedContextKeys.has('period') && !ctx.period && parsed.context.period) {
          ctx.period = parsed.context.period;
        }
        if (!removedContextKeys.has('outlet') && !ctx.outlet && parsed.context.outlet) {
          ctx.outlet = parsed.context.outlet;
        }
        if (!removedContextKeys.has('employee') && !ctx.employee && parsed.context.employee) {
          ctx.employee = parsed.context.employee;
        }
      }
      if (
        !removedContextKeys.has('employee') &&
        !ctx.employee &&
        parsed.type === 'employee'
      ) {
        ctx.employee = parsed.name;
      }
    }
    return ctx;
  }, [visibleMessages, contextOverride, selectedOutletName, removedContextKeys]);

  const updateThreadById = useCallback((threadId: string, updater: (thread: ChatThread) => ChatThread) => {
    setThreads((prev) => prev.map((t) => (t.id === threadId ? updater(t) : t)));
  }, []);

  const persistPrefs = useCallback((next: ThreadUiPrefs) => {
    setThreadPrefs(next);
    saveThreadPrefs(next);
  }, []);

  const createNewChat = () => {
    const next = buildDefaultThread();
    setThreads((prev) => [next, ...prev]);
    setActiveThreadId(next.id);
    setPrompt('');
    setError('');
    setContextOverride({});
    setRemovedContextKeys(new Set());
  };

  const sendMessage = async (rawValue: string) => {
    const value = rawValue.trim();
    if (!value || busy || !activeThread) return;
    setError('');
    setPrompt('');
    const threadId = activeThread.id;
    const sessionId = activeThread.sessionId;
    const requestId = `req-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: value,
      createdAt: nowIso(),
    };
    const thinkingMessage: ChatMessage = {
      id: `a-pending-${requestId}`,
      role: 'assistant',
      text: 'Thinking',
      meta: 'operations',
      createdAt: nowIso(),
      isThinking: true,
    };

    updateThreadById(threadId, (thread) => {
      const nextTitle =
        thread.title === 'New chat' ? value.slice(0, 44) || 'Untitled chat' : thread.title;
      return {
        ...thread,
        title: nextTitle,
        updatedAt: nowIso(),
        messages: [...thread.messages, userMessage, thinkingMessage],
      };
    });
    setBusy(true);
    try {
      let streamedFinal: any = null;
      await operationsAiApi.chatStream(value, {
        outletId: selectedOutletId || undefined,
        sessionId,
        threadId: isPersistedThreadId(threadId) ? threadId : undefined,
        onStatus: (status) => {
          const statusText =
            status?.message ||
            (status?.phase === 'step_start' && status?.tool
              ? `Fetching ${String(status.tool).replace('_query', '')}`
              : status?.phase === 'step_done' && status?.tool
                ? `Checking ${String(status.tool).replace('_query', '')}`
                : 'Thinking');
          updateThreadById(threadId, (thread) => {
            const withoutPending = thread.messages.filter((m) => m.id !== `a-pending-${requestId}`);
            const pending: ChatMessage = {
              id: `a-pending-${requestId}`,
              role: 'assistant',
              text: statusText,
              meta: 'operations',
              createdAt: nowIso(),
              isThinking: true,
            };
            return { ...thread, messages: [...withoutPending, pending], updatedAt: nowIso() };
          });
        },
        onFinal: (payload) => {
          streamedFinal = payload;
        },
      });
      const data = streamedFinal;
      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data?.response || 'No response',
        meta: `${data?.intentType || 'ask'} · ${(data?.sources || []).join(', ') || 'operations'}`,
        createdAt: data?.generatedAt || nowIso(),
        apiData: data,
      };
      updateThreadById(threadId, (thread) => {
        const withoutPending = thread.messages.filter((m) => m.id !== `a-pending-${requestId}`);
        const resolvedThreadId = data?.threadId || thread.id;
        return {
          ...thread,
          id: resolvedThreadId,
          updatedAt: nowIso(),
          messages: [...withoutPending, assistantMessage],
        };
      });
      if (data?.threadId && threadId !== data.threadId) {
        setActiveThreadId(data.threadId);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch Operations AI response');
      updateThreadById(threadId, (thread) => {
        const withoutPending = thread.messages.filter((m) => m.id !== `a-pending-${requestId}`);
        const failMessage: ChatMessage = {
          id: `a-failed-${Date.now()}`,
          role: 'assistant',
          text: 'I could not fetch a response. Please try again.',
          meta: 'error',
          createdAt: nowIso(),
        };
        return {
          ...thread,
          updatedAt: nowIso(),
          messages: [...withoutPending, failMessage],
        };
      });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages, busy]);

  const showEmpty = isWelcomeOnly(visibleMessages);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-emerald-50/30 animate-fade-in overflow-hidden">
      <ChatSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        loading={loadingThreads}
        prefs={threadPrefs}
        userName={user?.name}
        onSelect={setActiveThreadId}
        onNewChat={createNewChat}
        onRename={(id, title) =>
          persistPrefs({
            ...threadPrefs,
            titleOverrides: { ...threadPrefs.titleOverrides, [id]: title },
          })
        }
        onDelete={(id) => {
          persistPrefs({
            ...threadPrefs,
            hiddenIds: [...new Set([...threadPrefs.hiddenIds, id])],
          });
          if (activeThreadId === id) {
            const remaining = threads.filter((t) => t.id !== id && !threadPrefs.hiddenIds.includes(t.id));
            if (remaining[0]) setActiveThreadId(remaining[0].id);
            else createNewChat();
          }
        }}
        onTogglePin={(id) => {
          const pinned = threadPrefs.pinnedIds.includes(id)
            ? threadPrefs.pinnedIds.filter((x) => x !== id)
            : [...threadPrefs.pinnedIds, id];
          persistPrefs({ ...threadPrefs, pinnedIds: pinned });
        }}
      />

      <section className="flex-1 flex flex-col min-w-0 bg-white/40">
        <header className="shrink-0 border-b border-emerald-100 bg-white/90 backdrop-blur-sm px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Bot className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900">Operations AI</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <Sparkles className="h-3 w-3" /> AI
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {selectedOutletName ? `Outlet: ${selectedOutletName}` : 'Select an outlet for scoped answers'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-gray-500 hidden sm:inline">
              {formatDateTime(new Date().toISOString())}
            </span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </header>

        <QuickAskChips onSelect={sendMessage} disabled={busy} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {showEmpty ? (
            <EmptyState userName={user?.name} onSelect={sendMessage} disabled={busy} />
          ) : (
            <div className="max-w-4xl mx-auto space-y-5">
              {visibleMessages.map((m, idx) => {
                const isLastAssistant =
                  m.role === 'assistant' &&
                  idx === visibleMessages.length - 1 &&
                  !m.isThinking;
                const domain = detectDomainFromMeta(m.meta);
                const parsedType = m.role === 'assistant' ? parseResponseCard(m.text, m.meta).type : null;
                const usesInsightCard = parsedType ? isInsightCardType(parsedType) : false;

                return (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    {m.role === 'user' ? (
                      <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-br-md bg-emerald-600 text-white px-4 py-2.5 shadow-sm">
                        <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                        <p className="text-[10px] text-emerald-100 mt-1 text-right">{formatDateTime(m.createdAt)}</p>
                      </div>
                    ) : (
                      <div className="w-full max-w-2xl">
                        <OpsAiResponseCard
                          message={m}
                          onSuggestionSelect={sendMessage}
                          showFollowUps={isLastAssistant}
                        />
                        {isLastAssistant && !busy && !usesInsightCard && (
                          <SuggestionChips domain={domain} onSelect={sendMessage} disabled={busy} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {error && (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2">
                  {error}
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ContextChips
          context={conversationContext}
          onRemove={(key) => setRemovedContextKeys((prev) => new Set([...prev, key]))}
        />

        <ChatInput
          value={prompt}
          busy={busy}
          onChange={setPrompt}
          onSubmit={() => sendMessage(prompt)}
        />
      </section>
    </div>
  );
}
