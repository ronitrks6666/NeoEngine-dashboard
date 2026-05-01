import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { useAuth } from '@/hooks/useAuth';
import { issueApi, type Issue, type IssueMessage } from '@/api/issue';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ListSearchBar } from '@/components/ListSearchBar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  AlertTriangle, Plus, X, Send, ArrowLeft, Circle,
  CheckCircle2, XCircle, Clock, Trash2, Pin, Info,
  Image, Video, FileText, Paperclip, Check, CheckCheck, ChevronRight
} from 'lucide-react';

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  urgent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  medium: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  low: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  open: { icon: <Circle className="h-3.5 w-3.5" />, bg: 'bg-blue-100', text: 'text-blue-700', label: 'Open' },
  in_progress: { icon: <Clock className="h-3.5 w-3.5" />, bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Progress' },
  resolved: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Resolved' },
  closed: { icon: <XCircle className="h-3.5 w-3.5" />, bg: 'bg-gray-100', text: 'text-gray-600', label: 'Closed' },
};

type ViewMode = 'list' | 'detail';

type ContextMenuState = { msgId: string; x: number; y: number } | null;

export function IssuesPage() {
  const { selectedOutletId } = useOutletStore();
  const { role: authRole } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 350);
  const [confirmDelete, setConfirmDelete] = useState<Issue | null>(null);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPriority, setCreatePriority] = useState<string>('medium');
  const [createError, setCreateError] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [pinnedMsgIds, setPinnedMsgIds] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [currentPinIdx, setCurrentPinIdx] = useState(0);
  const [readersModal, setReadersModal] = useState<{ msgId: string; text: string } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);



  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior }), 60);
  }, []);

  // Queries
  const { data: issuesData, isLoading } = useQuery({
    queryKey: ['issues', selectedOutletId, statusFilter, priorityFilter, debouncedSearch],
    queryFn: () =>
      issueApi.listIssues(selectedOutletId!, {
        status: statusFilter === 'active' ? undefined : statusFilter,
        excludeClosed: statusFilter === 'active',
        priority: priorityFilter || undefined,
        q: debouncedSearch.trim() || undefined,
        limit: 50,
        sortBy: statusFilter === 'closed' ? 'closedAt' : 'lastMessageAt',
        sortOrder: 'desc',
      }),
    enabled: !!selectedOutletId,
  });

  const { data: issueDetail } = useQuery({
    queryKey: ['issue-detail', selectedIssueId],
    queryFn: () => issueApi.getIssue(selectedIssueId!),
    enabled: !!selectedIssueId && viewMode === 'detail',
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['issue-messages', selectedIssueId],
    queryFn: () => issueApi.getMessages(selectedIssueId!, { limit: 100 }),
    enabled: !!selectedIssueId && viewMode === 'detail',
    onSuccess: () => { scrollToBottom('instant'); },
  });

  const { data: _employeesData } = useQuery({
    queryKey: ['my-employees', selectedOutletId],
    queryFn: () => employeeApi.getMyEmployees({ outletId: selectedOutletId!, limit: 200 }),
    enabled: !!selectedOutletId && showCreate,
  });

  useEffect(() => {
    if (issueDetail?.data?.pinnedMessageIds) {
      setPinnedMsgIds(new Set(issueDetail.data.pinnedMessageIds));
    }
  }, [issueDetail?.data?.pinnedMessageIds]);

  const issues = issuesData?.data ?? [];
  const serverMessages: IssueMessage[] = messagesData?.data ?? [];

  const [optimisticMsgs, setOptimisticMsgs] = useState<IssueMessage[]>([]);

  // Cleanup optimistic messages when they appear in server messages
  useEffect(() => {
    if (serverMessages.length > 0 && optimisticMsgs.length > 0) {
      setOptimisticMsgs(prev => prev.filter(om =>
        !serverMessages.some(sm =>
          sm.text === om.text &&
          Math.abs(new Date(sm.createdAt).getTime() - new Date(om.createdAt).getTime()) < 15000
        )
      ));
    }
  }, [serverMessages]);

  const allMessages = useMemo(() => {
    const combined = [...serverMessages];
    optimisticMsgs.forEach(om => {
      const exists = serverMessages.some(sm =>
        sm.text === om.text &&
        Math.abs(new Date(sm.createdAt).getTime() - new Date(om.createdAt).getTime()) < 15000
      );
      if (!exists) combined.push(om);
    });
    return combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [serverMessages, optimisticMsgs]);
  const pinnedMessages = useMemo(() => allMessages.filter(m => pinnedMsgIds.has(m.id)), [allMessages, pinnedMsgIds]);
  const issue = issueDetail?.data;

  // Scroll to bottom when messages first load
  useEffect(() => {
    if (!messagesLoading && serverMessages.length > 0) scrollToBottom('instant');
  }, [messagesLoading, scrollToBottom]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof issueApi.createIssue>[0]) => issueApi.createIssue(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setShowCreate(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreatePriority('medium');
      setCreateError('');
    },
    onError: (err) => setCreateError(getApiErrorMessage(err as Error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => issueApi.changeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue-detail'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ issueId, text }: { issueId: string; text: string }) =>
      issueApi.sendMessage(issueId, { text }),
    onMutate: ({ text }) => {
      const optimistic: IssueMessage = {
        id: `opt-${Date.now()}`, issueId: selectedIssueId!, authorId: 'me',
        authorType: 'OWNER', authorName: 'You', text, attachments: [], mentions: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      setOptimisticMsgs(prev => [...prev, optimistic]);
      setChatMessage('');
      scrollToBottom();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-messages', selectedIssueId] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      // We don't clear optimistic messages here; they are cleared by the useEffect when data arrives
    },
    onError: () => setOptimisticMsgs(prev => prev.filter(m => !m.id.startsWith('opt-'))),
  });

  const { data: readersData, isLoading: readersLoading } = useQuery({
    queryKey: ['message-readers', readersModal?.msgId],
    queryFn: () => issueApi.getMessageReaders(selectedIssueId!, readersModal!.msgId),
    enabled: !!selectedIssueId && !!readersModal?.msgId,
  });

  const jumpToPinned = () => {
    if (pinnedMessages.length === 0) return;
    const nextIdx = (currentPinIdx + 1) % pinnedMessages.length;
    setCurrentPinIdx(nextIdx);
    const targetMsg = pinnedMessages[nextIdx];
    setHighlightedMsgId(targetMsg.id);
    const el = document.getElementById(`msg-${targetMsg.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => setHighlightedMsgId(null), 2500);
  };

  const handleShowInfo = (msg: IssueMessage) => {
    setReadersModal({ msgId: msg.id, text: msg.text });
    setContextMenu(null);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => issueApi.deleteIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      setConfirmDelete(null);
      if (viewMode === 'detail') {
        setViewMode('list');
        setSelectedIssueId(null);
      }
    },
  });

  const openIssue = (id: string) => {
    setSelectedIssueId(id); setViewMode('detail');
    setOptimisticMsgs([]);
    // pinnedMsgIds will be updated via useEffect when issueDetail loads
    issueApi.markRead(id).catch(() => { });
  };

  const handleCreate = () => {
    if (!createTitle.trim()) { setCreateError('Title is required'); return; }
    if (!selectedOutletId) return;
    createMutation.mutate({
      outletId: selectedOutletId, title: createTitle.trim(),
      description: createDescription.trim() || undefined, priority: createPriority
    });
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !selectedIssueId) return;
    sendMessageMutation.mutate({ issueId: selectedIssueId, text: chatMessage.trim() });
  };

  const handleContextMenu = (e: React.MouseEvent, msgId: string) => {
    e.preventDefault();
    setContextMenu({ msgId, x: Math.min(e.clientX, window.innerWidth - 160), y: Math.min(e.clientY, window.innerHeight - 100) });
  };

  const handlePinToggle = async (msgId: string) => {
    if (!selectedIssueId) return;
    const isPinned = pinnedMsgIds.has(msgId);
    try {
      if (isPinned) {
        await issueApi.unpinMessage(selectedIssueId, msgId);
      } else {
        await issueApi.pinMessage(selectedIssueId, msgId);
      }
      queryClient.invalidateQueries({ queryKey: ['issue-detail', selectedIssueId] });
      setContextMenu(null);
    } catch (e) {
      console.error('Failed to toggle pin', e);
    }
  };

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <p className="text-amber-600 text-lg">Select an outlet first.</p>
      </div>
    );
  }

  // ── Detail view ──────────────────────────────────────────────────────
  if (viewMode === 'detail' && selectedIssueId) {
    const statusCfg = STATUS_CONFIG[issue?.status ?? 'open'];
    const priorityCfg = PRIORITY_COLORS[issue?.priority ?? 'medium'];

    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <button
            onClick={() => { setViewMode('list'); setSelectedIssueId(null); }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{issue?.title ?? 'Loading...'}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {statusCfg && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                  {statusCfg.icon} {statusCfg.label}
                </span>
              )}
              {priorityCfg && (
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${priorityCfg.bg} ${priorityCfg.text} capitalize`}>
                  {issue?.priority}
                </span>
              )}
              <span className="text-xs text-gray-400">#{issue?.issueNumber}</span>
            </div>
          </div>
          {/* Status actions */}
          <div className="flex gap-2 shrink-0">
            {issue?.status === 'open' && (
              <button
                onClick={() => statusMutation.mutate({ id: selectedIssueId, status: 'in_progress' })}
                className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200 transition-colors"
              >
                Start Progress
              </button>
            )}
            {(issue?.status === 'open' || issue?.status === 'in_progress') && (
              <button
                onClick={() => statusMutation.mutate({ id: selectedIssueId, status: 'resolved' })}
                className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200 transition-colors"
              >
                Resolve
              </button>
            )}
            {issue?.status !== 'closed' && (
              <button
                onClick={() => statusMutation.mutate({ id: selectedIssueId, status: 'closed' })}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            )}
            {issue?.status === 'closed' && (
              <button
                onClick={() => statusMutation.mutate({ id: selectedIssueId, status: 'open' })}
                className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                Reopen
              </button>
            )}
          </div>
        </div>

        {/* Pinned messages banner */}
        {pinnedMessages.length > 0 && (
          <div
            onClick={jumpToPinned}
            className="shrink-0 px-6 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center gap-3 cursor-pointer hover:from-amber-100 hover:to-orange-100 transition-all shadow-sm z-10"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-200/50">
              <Pin className="h-3 w-3 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Pinned Message {pinnedMessages.length > 1 ? `(${currentPinIdx + 1}/${pinnedMessages.length})` : ''}</p>
              <p className="text-sm text-amber-900 truncate">
                {pinnedMessages[currentPinIdx % pinnedMessages.length].text}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700 bg-white/60 px-2 py-1 rounded-lg border border-amber-200/50 uppercase tracking-tight whitespace-nowrap">
              Jump <ArrowLeft className="h-3 w-3 rotate-[135deg]" />
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 bg-[#eae6df] space-y-1"
          onClick={() => setContextMenu(null)}>
          {messagesLoading ? <LoadingSpinner className="py-16" /> :
            allMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="px-4 py-2 rounded-lg bg-white/80 text-sm text-gray-500 shadow-sm">No messages yet. Start the conversation.</p>
              </div>
            ) : allMessages.map((msg) => {
              if (msg.systemEvent) return (
                <div key={msg.id} className="flex justify-center py-1">
                  <span className="px-3 py-1 rounded-full bg-black/20 text-white text-[11px] font-medium">
                    {msg.systemEvent.type === 'created' ? '📋 Issue created' :
                      msg.systemEvent.type === 'status_changed' ? `Status: ${(msg.systemEvent as { from?: string }).from} → ${(msg.systemEvent as { to?: string }).to}` :
                        msg.systemEvent.type.replace(/_/g, ' ')}
                  </span>
                </div>
              );
              const isMine = msg.authorType === 'OWNER' && authRole === 'OWNER';
              const isOptimistic = msg.id.startsWith('opt-');
              const isPinned = pinnedMsgIds.has(msg.id);
              const isHighlighted = highlightedMsgId === msg.id;

              return (
                <div key={msg.id} id={`msg-${msg.id}`} className="flex first:pt-2 last:pb-2 group">
                  <div
                    onContextMenu={(e) => handleContextMenu(e, msg.id)}
                    className={`relative max-w-[72%] px-3 py-2 rounded-2xl shadow-sm transition-all duration-700 ${isHighlighted
                        ? 'ring-2 ring-emerald-400/30 bg-emerald-50 shadow-md scale-[1.02]'
                        : (isMine ? 'bg-[#d9fdd3]' : 'bg-white')
                      } ${isMine ? 'rounded-br-sm ml-auto' : 'rounded-bl-sm mr-auto'}`}
                  >
                    {!isMine && <p className="text-xs font-semibold text-emerald-700 mb-0.5">{msg.authorName || 'Staff'}</p>}
                    {msg.text && <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                    {(msg.attachments?.length ?? 0) > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {(msg.attachments ?? []).map((att, i) => (
                          <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors">
                            {att.kind === 'image' ? <Image className="h-4 w-4 text-blue-600" /> :
                              att.kind === 'video' ? <Video className="h-4 w-4 text-purple-600" /> :
                                <FileText className="h-4 w-4 text-gray-600" />}
                            <span className="text-xs text-gray-700 truncate">{att.fileName || `Attachment ${i + 1}`}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    <div className={`flex items-center gap-0.5 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine && (
                        isOptimistic
                          ? <Check className="h-3 w-3 text-gray-400 ml-0.5" />
                          : <CheckCheck className={`h-3 w-3 ml-0.5 ${issue?.isReadByAll ? 'text-blue-500' : 'text-gray-400'}`} />
                      )}
                      {isPinned && <Pin className="h-3 w-3 text-gray-400 ml-0.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          <div ref={chatEndRef} />
        </div>

        {/* Context menu */}
        {contextMenu && (
          <div className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 min-w-[140px] animate-fade-in"
            style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button onClick={() => handlePinToggle(contextMenu.msgId)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">
              <Pin className="h-4 w-4 text-amber-500" />
              {pinnedMsgIds.has(contextMenu.msgId) ? 'Unpin' : 'Pin'}
            </button>
            <button onClick={() => {
              const msg = allMessages.find(m => m.id === contextMenu.msgId);
              if (msg) handleShowInfo(msg);
            }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">
              <Info className="h-4 w-4 text-blue-500" /> Info
            </button>
          </div>
        )}

        {/* Message readers info modal */}
        {readersModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Message Info</h3>
                <button onClick={() => setReadersModal(null)} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-6 line-clamp-3 bg-gray-100 p-3 rounded-xl italic">&quot;{readersModal.text}&quot;</p>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Read by</h4>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                  {readersLoading ? <LoadingSpinner className="h-6 w-6" /> : (readersData?.data || []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4 italic">No one has seen this yet</p>
                  ) : (readersData?.data || []).map((r: any) => (
                    <div key={r.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                          {r.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{r.displayName}</p>
                          <p className="text-[10px] text-gray-500">{r.userType === 'OWNER' ? 'Owner' : 'Staff'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 text-blue-500">
                        <div className="flex items-center gap-1.5">
                          <CheckCheck className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">{r.lastReadAt ? new Date(r.lastReadAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                        </div>
                        <span className="text-[9px] font-medium opacity-70">
                          {r.lastReadAt ? new Date(r.lastReadAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button onClick={() => setReadersModal(null)} className="w-full py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message input */}
        {issue?.status !== 'closed' && (
          <div className="shrink-0 px-4 py-3 bg-[#f0f2f5] border-t border-gray-200">
            <div className="flex items-end gap-2">
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 px-4 py-2.5 rounded-2xl border-0 bg-white focus:ring-2 focus:ring-emerald-500/20 text-sm resize-none shadow-sm max-h-32 overflow-y-auto"
                style={{ lineHeight: '1.5' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim()}
                className="p-3 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-all shadow-sm shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
            <p className="text-gray-500 mt-0.5">Track and resolve issues across your outlet</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setCreateError(''); }}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl font-semibold hover:from-rose-700 hover:to-rose-800 transition-all shadow-sm flex items-center gap-2 w-fit shrink-0"
          >
            <Plus className="h-5 w-5" /> New issue
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {[
              { key: 'active', label: 'Active' },
              { key: 'open', label: 'Open' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'resolved', label: 'Resolved' },
              { key: 'closed', label: 'Closed' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s.key ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white"
          >
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <ListSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search issues..."
            className="flex-1 max-w-sm"
            id="issues-search"
            aria-label="Search issues"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : (
        <div className="flex flex-col gap-px bg-gray-200 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {issues.map((issue) => {
            const sCfg = STATUS_CONFIG[issue.status];
            const pCfg = PRIORITY_COLORS[issue.priority];
            const isUnread = issue.unreadCount > 0;

            return (
              <button
                key={issue.id}
                onClick={() => openIssue(issue.id)}
                className="w-full text-left group bg-white hover:bg-gray-50 transition-all flex items-center gap-4 px-6 py-4"
              >
                {/* Left: Status & Priority Dot */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className={`p-1.5 rounded-lg ${sCfg?.bg} ${sCfg?.text}`}>
                    {sCfg?.icon}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${pCfg?.bg.replace('bg-', 'bg-').split(' ')[0]} ${pCfg?.text.replace('text-', 'bg-')}`} title={issue.priority} />
                </div>

                {/* Center: Title & Preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">#{issue.issueNumber}</span>
                    {issue.pinnedMessageIds && issue.pinnedMessageIds.length > 0 && (
                      <Pin className="h-3 w-3 text-amber-500" />
                    )}
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                    )}
                  </div>
                  <p className={`text-sm font-semibold truncate ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                    {issue.title}
                  </p>
                  {issue.lastMessagePreview && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">
                      &ldquo;{issue.lastMessagePreview}&rdquo;
                    </p>
                  )}
                </div>

                {/* Right: Meta */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[10px] font-medium text-gray-400">
                    {issue.lastMessageAt ? new Date(issue.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isUnread && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                        {issue.unreadCount}
                      </span>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(issue); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete issue"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-600 transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {issues.length === 0 && !isLoading && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
          </div>
          <p className="text-gray-500">{debouncedSearch.trim() ? 'No issues match your search.' : 'No issues yet'}</p>
          {!debouncedSearch.trim() && (
            <button onClick={() => setShowCreate(true)} className="mt-4 text-rose-600 hover:text-rose-700 font-medium">
              Create your first issue
            </button>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-slide-up overflow-hidden border border-gray-100 relative">
            <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors z-10" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="bg-gradient-to-br from-rose-600 to-rose-700 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Report an issue</h2>
                  <p className="text-rose-100 text-sm mt-0.5">Describe the problem for your team</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {createError && <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{createError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  placeholder="e.g. AC not working in kitchen"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  placeholder="Provide details about the issue..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="flex flex-wrap gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCreatePriority(p)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${createPriority === p
                          ? `${PRIORITY_COLORS[p].bg} ${PRIORITY_COLORS[p].text} ring-1 ring-current/30`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex-1 px-5 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 disabled:opacity-50 transition-all"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create issue'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-slide-up relative">
            <button type="button" onClick={() => setConfirmDelete(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <p className="text-gray-900 font-medium pr-8">Delete &quot;{confirmDelete.title}&quot;?</p>
            <p className="text-sm text-gray-500 mt-1">This will permanently remove the issue and all messages.</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
