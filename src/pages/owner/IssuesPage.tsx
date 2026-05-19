import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertTriangle, Plus, X, Send, ArrowLeft, Circle, AlertCircle,
  CheckCircle2, XCircle, Clock, Trash2, Pin, Info,
  Image, Video, FileText, Paperclip, Check, CheckCheck, ChevronRight,
  Mic, MapPin, Phone, Download, Play, Pause, Camera, Square, User, ChevronDown
} from 'lucide-react';

// ── Staged attachment (pending upload) ───────────────────────────────────────
type StagedFile = {
  localId: string;
  file: File;
  preview?: string;  // object URL for images
  kind?: 'image' | 'video' | 'audio' | 'document';
  uploading: boolean;
  uploaded?: { url: string; kind: string; fileName: string };
  error?: string;
};

// ── Inline audio player component ────────────────────────────────────────────
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); } else { void el.play(); }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-black/5 rounded-xl px-3 py-2 min-w-[180px]">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (el && el.duration) setProgress(el.currentTime / el.duration);
        }}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        preload="metadata"
      />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 hover:bg-emerald-700 transition-colors"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">{duration > 0 ? fmt(duration) : '...'}</p>
      </div>
    </div>
  );
}

// ── Rich attachment renderer ──────────────────────────────────────────────────
function AttachmentRenderer({ att }: { att: any }) {
  if (att.kind === 'image') {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer">
        <img
          src={att.url}
          alt={att.fileName || 'Image'}
          className="max-w-[220px] max-h-[180px] rounded-xl object-cover border border-black/10 hover:opacity-90 transition-opacity"
          loading="lazy"
        />
      </a>
    );
  }
  if (att.kind === 'audio') {
    return <AudioPlayer src={att.url} />;
  }
  if (att.kind === 'video') {
    return (
      <video
        src={att.url}
        controls
        className="max-w-[220px] rounded-xl border border-black/10"
        preload="metadata"
      />
    );
  }
  if (att.kind === 'location') {
    const lat = att.meta?.lat ?? att.lat;
    const lng = att.meta?.lng ?? att.lng;
    const label = att.meta?.label ?? att.label ?? 'Location';
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors max-w-[220px]"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <MapPin className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-800 truncate">{label}</p>
          <p className="text-[10px] text-blue-500">Tap to open in Maps</p>
        </div>
      </a>
    );
  }
  if (att.kind === 'contact') {
    const name = att.meta?.name ?? att.contactMeta?.name ?? att.fileName ?? 'Contact';
    const phone = att.meta?.phone ?? att.contactMeta?.phone;
    const email = att.meta?.email ?? att.contactMeta?.email;
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 max-w-[220px]">
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
          <Phone className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-800 truncate">{name}</p>
          {phone && <p className="text-[10px] text-emerald-600">{phone}</p>}
          {email && <p className="text-[10px] text-emerald-500 truncate">{email}</p>}
        </div>
      </div>
    );
  }
  // Generic file / document
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      download={att.fileName}
      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-emerald-200 transition-all max-w-[260px] group"
    >
      <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
        <FileText className="h-5 w-5 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-700 leading-tight break-words pr-2">
          {att.fileName || 'Document'}
        </p>
        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
          <Download className="h-3 w-3" /> Click to Download
        </p>
      </div>
    </a>
  );
}

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

type IssueMsgUrlSeg = { kind: 'text'; value: string } | { kind: 'url'; value: string; href: string };

function splitIssueMessageUrls(input: string): IssueMsgUrlSeg[] {
  const re = /\b(https?:\/\/[^\s<>"'()[\]{}]+|www\.[^\s<>"'()[\]{}]+)/gi;
  const segments: IssueMsgUrlSeg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) segments.push({ kind: 'text', value: input.slice(last, m.index) });
    const raw = m[0];
    const value = raw.replace(/[.,;:!?)\]}>]+$/g, '') || raw;
    const href = value.startsWith('http') ? value : `https://${value}`;
    segments.push({ kind: 'url', value, href });
    last = m.index + raw.length;
  }
  if (last < input.length) segments.push({ kind: 'text', value: input.slice(last) });
  if (segments.length === 0) segments.push({ kind: 'text', value: input });
  return segments;
}

function IssueMessageLinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => splitIssueMessageUrls(text), [text]);
  return (
    <p className={className}>
      {parts.map((p, i) =>
        p.kind === 'text' ? (
          <span key={i}>{p.value}</span>
        ) : (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 font-medium underline underline-offset-2 break-all hover:text-emerald-900"
          >
            {p.value}
          </a>
        )
      )}
    </p>
  );
}

export function IssuesPage() {
  const { selectedOutletId } = useOutletStore();
  const { role: authRole } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPriority, setCreatePriority] = useState<Issue['priority']>('medium');
  const [createError, setCreateError] = useState('');
  const [createStagedFiles, setCreateStagedFiles] = useState<StagedFile[]>([]);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 350);
  const [confirmDelete, setConfirmDelete] = useState<Issue | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [pinnedMsgIds, setPinnedMsgIds] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [currentPinIdx, setCurrentPinIdx] = useState(0);
  const [readersModal, setReadersModal] = useState<{ msgId: string; text: string } | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  // Attachment upload state
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  // Pending location / contact (sent as special attachment kinds)
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  // Attach sheet
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  // Voice recorder state
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Location picker state
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationFetching, setLocationFetching] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSearchResults, setLocationSearchResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const locationSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [lastSelectedIssueId, setLastSelectedIssueId] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isFetchingOlder, setIsFetchingOlder] = useState(false);

  // Reset last selected issue when going back to list so scroll-to-bottom triggers again
  useEffect(() => {
    if (viewMode === 'list') {
      setLastSelectedIssueId(null);
    }
  }, [viewMode]);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');



  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const doScroll = () => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior, block: 'end' });
      } else if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
      setShowScrollBottom(false);
    };

    doScroll();
    // Second attempt slightly later to catch any layout shifts
    setTimeout(doScroll, 150);
    if (behavior === 'instant') {
      setTimeout(doScroll, 350); // Aggressive fallback for opening chat
    }
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
    queryFn: () => issueApi.getMessages(selectedIssueId!, { limit: 50 }),
    enabled: !!selectedIssueId && viewMode === 'detail',
  });

  const loadMoreMessages = useCallback(async () => {
    if (!selectedIssueId || isFetchingOlder || !hasMoreMessages || !messagesData?.data?.length) return;
    
    setIsFetchingOlder(true);
    const beforeId = messagesData.data[0].id;
    try {
      const res = await issueApi.getMessages(selectedIssueId, { before: beforeId, limit: 30 });
      if (res.data.length === 0) {
        setHasMoreMessages(false);
      } else {
        const currentScrollHeight = chatContainerRef.current?.scrollHeight || 0;
        
        queryClient.setQueryData(['issue-messages', selectedIssueId], (old: any) => ({
          ...old,
          data: [...res.data, ...(old?.data || [])],
          pagination: res.pagination
        }));

        // Maintain scroll position after prepending messages
        setTimeout(() => {
          if (chatContainerRef.current) {
            const newScrollHeight = chatContainerRef.current.scrollHeight;
            chatContainerRef.current.scrollTop = newScrollHeight - currentScrollHeight;
          }
        }, 0);
      }
    } catch (e) {
      console.error('Failed to load older messages', e);
    } finally {
      setIsFetchingOlder(false);
    }
  }, [selectedIssueId, isFetchingOlder, hasMoreMessages, messagesData, queryClient]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 150;
    setShowScrollBottom(!isAtBottom);

    if (target.scrollTop < 50 && hasMoreMessages && !isFetchingOlder && !messagesLoading) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, isFetchingOlder, messagesLoading, loadMoreMessages]);

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

  // Scroll to bottom when entering detail view for an issue
  useEffect(() => {
    if (viewMode === 'detail' && selectedIssueId && serverMessages.length > 0) {
      // If we just entered this issue, or messages just loaded
      if (selectedIssueId !== lastSelectedIssueId) {
        scrollToBottom('instant');
        setLastSelectedIssueId(selectedIssueId);
        setHasMoreMessages(true);
      }
    }
  }, [viewMode, selectedIssueId, serverMessages.length, lastSelectedIssueId, scrollToBottom]);

  // Scroll to bottom on new messages
  const lastMessageId = serverMessages[serverMessages.length - 1]?.id;
  useEffect(() => {
    if (!lastMessageId) return;
    const container = chatContainerRef.current;
    if (!container) return;
    
    const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 200;
    if (isNearBottom) {
      scrollToBottom('smooth');
    }
  }, [lastMessageId, scrollToBottom]);

  // Mark as read when new messages are viewed
  useEffect(() => {
    if (selectedIssueId && lastMessageId && viewMode === 'detail') {
      issueApi.markRead(selectedIssueId, lastMessageId).catch(() => { });
    }
  }, [selectedIssueId, lastMessageId, viewMode]);

  // Also scroll when sending a new message
  useEffect(() => {
    if (optimisticMsgs.length > 0) {
      scrollToBottom('smooth');
    }
  }, [optimisticMsgs.length, scrollToBottom]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof issueApi.createIssue>[0]) => issueApi.createIssue(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['issues'] });
      setShowCreate(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreatePriority('medium');
      setCreateError('');
      setCreateStagedFiles([]);
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
    mutationFn: ({ issueId, text, attachments, locationMeta }: { issueId: string; text: string; attachments?: any[]; locationMeta?: any }) =>
      issueApi.sendMessage(issueId, { text, attachments, locationMeta }),
    onMutate: ({ text, attachments, locationMeta }) => {
      const optimistic: IssueMessage = {
        id: `opt-${Date.now()}`, issueId: selectedIssueId!, authorId: 'me',
        authorType: 'OWNER', authorName: 'You', text,
        attachments: (attachments ?? []) as any,
        locationMeta: locationMeta ?? null,
        mentions: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      setOptimisticMsgs(prev => [...prev, optimistic]);
      setChatMessage('');
      setStagedFiles([]);
      scrollToBottom();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-messages', selectedIssueId] });
      queryClient.invalidateQueries({ queryKey: ['issues'] });
    },
    onError: () => setOptimisticMsgs(prev => prev.filter(m => !m.id.startsWith('opt-'))),
  });

  // Upload handler — stages files and uploads immediately
  const handleFileSelect = useCallback(async (files: FileList | null, isForCreate: boolean = false) => {
    if (!files || files.length === 0) return;
    const currentStagedCount = isForCreate ? createStagedFiles.length : stagedFiles.length;
    const toAdd = Array.from(files).slice(0, 6 - currentStagedCount);
    
    const newStaged: StagedFile[] = toAdd.map(f => {
      const isVideo = f.type.startsWith('video/');
      const sizeMB = f.size / (1024 * 1024);
      let error: string | undefined;
      
      if (isVideo && sizeMB > 50) {
        error = 'Video exceeds 50MB limit';
      }

      return {
        localId: `sf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        kind: f.type.startsWith('image/') ? 'image' : isVideo ? 'video' : 'document',
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
        uploading: !error,
        error: error
      };
    });

    if (isForCreate) {
      setCreateStagedFiles(prev => [...prev, ...newStaged]);
    } else {
      setStagedFiles(prev => [...prev, ...newStaged]);
    }

    await Promise.all(newStaged.map(async (sf) => {
      if (sf.error) return;
      try {
        const res = await issueApi.uploadAttachment(sf.file);
        const updateFn = (prev: StagedFile[]) => prev.map(x =>
          x.localId === sf.localId ? { ...x, uploading: false, uploaded: res } : x
        );
        if (isForCreate) setCreateStagedFiles(updateFn);
        else setStagedFiles(updateFn);
      } catch {
        const errFn = (prev: StagedFile[]) => prev.map(x =>
          x.localId === sf.localId ? { ...x, uploading: false, error: 'Upload failed' } : x
        );
        if (isForCreate) setCreateStagedFiles(errFn);
        else setStagedFiles(errFn);
      }
    }));
  }, [stagedFiles.length, createStagedFiles.length]);

  // ── Voice recorder ──────────────────────────────────────────────────────────
  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      voiceChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) voiceChunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setVoiceRecording(true);
      setVoiceSeconds(0);
      voiceTimerRef.current = setInterval(() => setVoiceSeconds(s => s + 1), 1000);
    } catch {
      alert('Microphone access denied. Please allow microphone access.');
    }
  }, []);

  const stopAndSendVoice = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    setVoiceUploading(true);
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    await new Promise<void>(resolve => {
      mr.onstop = () => resolve();
      mr.stop();
      mr.stream.getTracks().forEach(t => t.stop());
    });
    mediaRecorderRef.current = null;
    setVoiceRecording(false);
    const blob = new Blob(voiceChunksRef.current, { type: 'audio/webm' });
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    try {
      const res = await issueApi.uploadAttachment(file);
      setStagedFiles(prev => [...prev, {
        localId: `sf_v_${Date.now()}`,
        file,
        uploading: false,
        uploaded: { url: res.url, kind: 'audio', fileName: res.fileName },
      }]);
    } catch { alert('Voice upload failed. Try again.'); }
    setVoiceUploading(false);
    setVoiceOpen(false);
    setVoiceSeconds(0);
  }, []);

  const cancelVoice = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr) { mr.stop(); mr.stream.getTracks().forEach(t => t.stop()); }
    mediaRecorderRef.current = null;
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    setVoiceRecording(false);
    setVoiceOpen(false);
    setVoiceSeconds(0);
  }, []);

  // ── Location picker ─────────────────────────────────────────────────────────
  const fetchCurrentLocation = useCallback(() => {
    setLocationFetching(true);
    setLocationError('');
    setLocationCoords(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationFetching(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocationCoords({ lat, lng });
        // Reverse geocode via nominatim
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const j = await r.json();
          setLocationLabel(j.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          setLocationLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setLocationFetching(false);
      },
      (err) => {
        setLocationError(err.message || 'Could not get location.');
        setLocationFetching(false);
      },
      { timeout: 12000 }
    );
  }, []);

  const confirmLocation = useCallback(() => {
    if (!locationCoords) return;
    setPendingLocation({ lat: locationCoords.lat, lng: locationCoords.lng, label: locationLabel || 'My Location' });
    setLocationOpen(false);
    setLocationCoords(null);
    setLocationLabel('');
    setLocationError('');
    setLocationSearch('');
    setLocationSearchResults([]);
  }, [locationCoords, locationLabel]);

  // Search address via Nominatim
  const handleLocationSearchChange = useCallback((val: string) => {
    setLocationSearch(val);
    if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current);
    if (!val.trim()) { setLocationSearchResults([]); return; }
    locationSearchTimer.current = setTimeout(async () => {
      setLocationSearching(true);
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5`);
        const j = await r.json();
        setLocationSearchResults((j as any[]).map((item: any) => ({
          label: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        })));
      } catch { setLocationSearchResults([]); }
      setLocationSearching(false);
    }, 600);
  }, []);

  const selectSearchResult = useCallback((result: { label: string; lat: number; lng: number }) => {
    setLocationCoords({ lat: result.lat, lng: result.lng });
    setLocationLabel(result.label.split(',').slice(0, 3).join(', '));
    setLocationSearch('');
    setLocationSearchResults([]);
  }, []);

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
        setLastSelectedIssueId(null);
      }
    },
  });

  const openIssue = (id: string) => {
    setSelectedIssueId(id); setViewMode('detail');
    setOptimisticMsgs([]);
    // pinnedMsgIds will be updated via useEffect when issueDetail loads
    // markRead will be called via useEffect when messages load
  };

  const handleCreate = () => {
    if (!createTitle.trim()) { setCreateError('Title is required'); return; }
    if (!selectedOutletId) return;
    
    const readyFiles = createStagedFiles.filter(sf => sf.uploaded && !sf.error);
    const attachments = readyFiles.map(sf => ({
      url: sf.uploaded!.url,
      kind: sf.uploaded!.kind as any,
      fileName: sf.uploaded!.fileName,
    }));

    createMutation.mutate({
      outletId: selectedOutletId, title: createTitle.trim(),
      description: createDescription.trim() || undefined, priority: createPriority,
      attachments
    });
  };

  const handleSendMessage = () => {
    const hasText = chatMessage.trim().length > 0;
    const readyFiles = stagedFiles.filter(sf => sf.uploaded && !sf.error);
    const hasPayload = hasText || readyFiles.length > 0 || pendingLocation;
    if (!hasPayload || !selectedIssueId) return;
    const attachments: any[] = readyFiles.map(sf => ({
      url: sf.uploaded!.url,
      kind: sf.uploaded!.kind,
      fileName: sf.uploaded!.fileName,
    }));

    const locationMeta = pendingLocation ? {
      lat: pendingLocation.lat,
      lng: pendingLocation.lng,
      label: pendingLocation.label
    } : undefined;

    setPendingLocation(null);
    sendMessageMutation.mutate({
      issueId: selectedIssueId,
      text: chatMessage.trim(),
      attachments,
      locationMeta
    });
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
      <div className="flex flex-col h-[calc(100vh-3.5rem)] animate-fade-in relative">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <button
            onClick={() => { setViewMode('list'); setSelectedIssueId(null); setLastSelectedIssueId(null); }}
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

        {/* Messages container */}
        <div className="flex-1 relative overflow-hidden flex flex-col min-h-0 bg-[#eae6df]">
          <div 
            ref={chatContainerRef} 
            className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
            onScroll={handleScroll}
            onClick={() => setContextMenu(null)}
          >
            {isFetchingOlder && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 shadow-sm border border-gray-100 animate-pulse">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Loading history...</span>
                </div>
              </div>
            )}

            {!hasMoreMessages && allMessages.length > 30 && (
              <div className="flex justify-center py-4 opacity-50">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start of conversation</span>
              </div>
            )}

            {messagesLoading && !isFetchingOlder ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-500">Decrypting messages...</p>
              </div>
            ) :
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
                    {msg.text ? (
                      <IssueMessageLinkifiedText
                        text={msg.text}
                        className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed"
                      />
                    ) : null}
                    {(msg.attachments?.length ?? 0) > 0 && (
                      <div className="mt-2 space-y-2">
                        {(msg.attachments ?? []).map((att, i) => (
                          <div key={i}>
                            <AttachmentRenderer att={att} />
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.locationMeta && (
                      <div className="mt-2">
                        <AttachmentRenderer att={{ kind: 'location', meta: msg.locationMeta }} />
                      </div>
                    )}
                    {msg.contactMeta && (
                      <div className="mt-2">
                        <AttachmentRenderer att={{ kind: 'contact', meta: msg.contactMeta }} />
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
            <div ref={chatEndRef} className="h-2" />
          </div>

          {/* Scroll to bottom floating button */}
          <AnimatePresence>
            {showScrollBottom && (
              <motion.button
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                onClick={() => scrollToBottom('smooth')}
                className="absolute bottom-4 right-4 h-11 px-4 rounded-full bg-emerald-600 shadow-2xl flex items-center gap-2 text-white hover:bg-emerald-700 transition-all z-20 group"
              >
                <ChevronDown className="h-5 w-5 group-hover:translate-y-0.5 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-wider">Latest Messages</span>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm animate-bounce" />
              </motion.button>
            )}
          </AnimatePresence>
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
          <div className="shrink-0 bg-[#f0f2f5] border-t border-gray-200">
            {/* Staged strip (files + location) */}
            {(stagedFiles.length > 0 || pendingLocation) && (
              <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-3 overflow-x-auto bg-gray-50/50 no-scrollbar">
                {stagedFiles.map((sf, i) => (
                  <div key={i} className="relative shrink-0 group">
                    <div className={`w-14 h-14 rounded-xl border flex items-center justify-center overflow-hidden bg-white shadow-sm transition-all ${sf.error ? 'border-red-200' : 'border-gray-200 group-hover:border-emerald-200'}`}>
                      {sf.kind === 'image' ? (
                        <img src={sf.preview || ''} alt="Preview" className="w-full h-full object-cover" />
                      ) : sf.kind === 'audio' ? (
                        <Mic className="h-6 w-6 text-violet-500" />
                      ) : (
                        <FileText className="h-6 w-6 text-indigo-500" />
                      )}
                      {!sf.uploaded && !sf.error && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {sf.error && (
                        <div className="absolute inset-0 bg-red-50/80 flex items-center justify-center" title={sf.error}>
                          <AlertCircle className="h-6 w-6 text-red-500" />
                        </div>
                      )}
                    </div>
                    <button onClick={() => setStagedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center shadow-md hover:bg-red-500 transition-colors">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                {pendingLocation && (
                  <div className="relative shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 border border-blue-200 rounded-xl text-xs font-medium text-blue-700 max-w-[120px]">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{pendingLocation.label}</span>
                    </div>
                    <button onClick={() => setPendingLocation(null)} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-end gap-2 px-4 py-3">
              <button onClick={() => setAttachSheetOpen(true)}
                className="p-2.5 rounded-full bg-white text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm shrink-0" title="Attach">
                <Paperclip className="h-4 w-4" />
              </button>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden"
                onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
              <textarea value={chatMessage} onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="Type a message..." rows={1}
                className="flex-1 px-4 py-2.5 rounded-2xl border-0 bg-white focus:ring-2 focus:ring-emerald-500/20 text-sm resize-none shadow-sm max-h-32 overflow-y-auto"
                style={{ lineHeight: '1.5' }} />
              <button onClick={handleSendMessage}
                disabled={!chatMessage.trim() && stagedFiles.filter(sf => sf.uploaded).length === 0 && !pendingLocation}
                className="p-3 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-all shadow-sm shrink-0">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Attach Sheet - constrained to chat column width */}
        {attachSheetOpen && (
          <div className="absolute inset-0 z-[60] flex flex-col justify-end" onClick={() => setAttachSheetOpen(false)}>
            <div className="absolute inset-0 bg-black/50 rounded-none" />
            <div className="relative bg-[#f0f2f5] rounded-t-2xl pb-6 pt-4 px-4" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <p className="text-xs text-gray-500 mb-4 text-center font-medium uppercase tracking-widest">Attach</p>
              <div className="grid grid-cols-3 gap-4">
                {([
                  { key: 'voice', icon: <Mic className="h-7 w-7 text-white" />, label: 'Voice', color: 'bg-violet-600', action: () => { setAttachSheetOpen(false); setVoiceOpen(true); } },
                  { key: 'doc', icon: <FileText className="h-7 w-7 text-white" />, label: 'Document', color: 'bg-indigo-500', action: () => { setAttachSheetOpen(false); const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = 'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv'; i.onchange = (ev: Event) => handleFileSelect((ev.target as HTMLInputElement).files); i.click(); } },
                  { key: 'location', icon: <MapPin className="h-7 w-7 text-white" />, label: 'Location', color: 'bg-emerald-600', action: () => { setAttachSheetOpen(false); setLocationSearch(''); setLocationSearchResults([]); setLocationCoords(null); setLocationLabel(''); setLocationError(''); setLocationOpen(true); } },
                ] as { key: string; icon: React.ReactNode; label: string; color: string; action: () => void }[]).map(tile => (
                  <button key={tile.key} onClick={tile.action} className="flex flex-col items-center gap-2 py-3 hover:bg-white/30 rounded-2xl transition-colors">
                    <div className={`w-14 h-14 rounded-full ${tile.color} flex items-center justify-center shadow-md`}>{tile.icon}</div>
                    <span className="text-xs font-medium text-gray-700">{tile.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setAttachSheetOpen(false)} className="mt-5 w-full py-3 bg-white/70 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-white transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Voice Recorder Modal */}
        {voiceOpen && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-end justify-center animate-fade-in" onClick={cancelVoice}>
            <div className="bg-white rounded-t-2xl w-full max-w-md p-6 pb-8 animate-slide-up" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-6">Voice Message</h3>
              <div className="flex flex-col items-center gap-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${voiceRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-200'}`}>
                  <Mic className={`h-9 w-9 ${voiceRecording ? 'text-white' : 'text-gray-500'}`} />
                </div>
                {voiceRecording && (
                  <p className="text-2xl font-mono font-bold text-red-500">{String(Math.floor(voiceSeconds / 60)).padStart(2, '0')}:{String(voiceSeconds % 60).padStart(2, '0')}</p>
                )}
                {!voiceRecording && !voiceUploading && <p className="text-sm text-gray-500">Tap Record to start</p>}
                {voiceUploading && (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> Uploading...
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={cancelVoice} className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                  <X className="h-4 w-4" /> Cancel
                </button>
                {!voiceRecording ? (
                  <button onClick={startVoiceRecording} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                    <Mic className="h-4 w-4" /> Record
                  </button>
                ) : (
                  <button onClick={stopAndSendVoice} disabled={voiceUploading} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                    <Square className="h-4 w-4" /> Stop & Send
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Location Picker Modal */}
        {locationOpen && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="font-bold text-gray-900">Share Location</h3>
                <button onClick={() => setLocationOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-5 space-y-4">

                {/* Two action buttons at top */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={fetchCurrentLocation}
                    disabled={locationFetching}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  >
                    {locationFetching
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <MapPin className="h-4 w-4" />}
                    Current Location
                  </button>
                  <div className="text-xs text-gray-400 flex items-center justify-center">— or search below —</div>
                </div>

                {/* Address search */}
                <div className="relative">
                  <input
                    value={locationSearch}
                    onChange={e => handleLocationSearchChange(e.target.value)}
                    placeholder="Search address or place..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  {locationSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Search results */}
                {locationSearchResults.length > 0 && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    {locationSearchResults.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => selectSearchResult(r)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 border-b border-gray-50 last:border-b-0 transition-colors flex items-start gap-2"
                      >
                        <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-gray-700 leading-snug line-clamp-2">{r.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {locationError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{locationError}</div>
                )}

                {/* Detected / selected location preview */}
                {locationCoords && !locationFetching && (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-xs text-emerald-600 font-semibold mb-1">📍 Selected location</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{locationLabel || `${locationCoords.lat.toFixed(5)}, ${locationCoords.lng.toFixed(5)}`}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Label (optional)</label>
                      <input value={locationLabel} onChange={e => setLocationLabel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" placeholder="e.g. Kitchen entrance" />
                    </div>
                    <a href={`https://www.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}`} target="_blank" rel="noopener noreferrer"
                      className="block text-center text-xs text-emerald-600 underline">Preview on Google Maps ↗</a>
                  </div>
                )}

                {locationFetching && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Getting your location...</p>
                  </div>
                )}
              </div>

              {locationCoords && (
                <div className="px-5 pb-5">
                  <button onClick={confirmLocation} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors">Share Location</button>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Image lightbox */}
        {lightboxUrl && (
          <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
            <button className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30"><X className="h-6 w-6" /></button>
            <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                <div className="flex flex-wrap gap-3">
                  <input ref={createFileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden"
                    onChange={e => { handleFileSelect(e.target.files, true); e.target.value = ''; }} />
                  <button
                    type="button"
                    onClick={() => createFileInputRef.current?.click()}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-rose-300 hover:text-rose-500 transition-all gap-1"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px] font-bold uppercase">Add</span>
                  </button>
                  {createStagedFiles.map((sf) => (
                    <div key={sf.localId} className="relative group w-16 h-16">
                      <div className={`w-full h-full rounded-xl border flex items-center justify-center overflow-hidden bg-white shadow-sm transition-all ${sf.error ? 'border-red-200' : 'border-gray-200'}`}>
                        {sf.kind === 'image' ? (
                          <img src={sf.preview} alt="" className="w-full h-full object-cover" />
                        ) : sf.kind === 'video' ? (
                          <div className="bg-amber-100 w-full h-full flex items-center justify-center"><Video className="h-6 w-6 text-amber-600" /></div>
                        ) : (
                          <div className="bg-indigo-100 w-full h-full flex items-center justify-center"><FileText className="h-6 w-6 text-indigo-600" /></div>
                        )}
                        {sf.uploading && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {sf.error && (
                          <div className="absolute inset-0 bg-red-50/80 flex items-center justify-center" title={sf.error}>
                            <AlertCircle className="h-6 w-6 text-red-500" />
                          </div>
                        )}
                      </div>
                      <button onClick={() => setCreateStagedFiles(prev => prev.filter(x => x.localId !== sf.localId))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center shadow-md hover:bg-red-500 transition-colors">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || createStagedFiles.some(f => f.uploading)}
                  className="flex-1 px-5 py-3 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 disabled:opacity-50 transition-all"
                >
                  {createMutation.isPending ? 'Creating...' : createStagedFiles.some(f => f.uploading) ? 'Uploading...' : 'Create issue'}
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
