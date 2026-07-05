import { MessageSquare, MoreHorizontal, Pin, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ChatThread, ThreadUiPrefs } from './types';
import { formatTimeOnly, groupThreadsByDate, type ThreadGroup } from './utils';

type Props = {
  threads: ChatThread[];
  activeThreadId: string;
  loading: boolean;
  prefs: ThreadUiPrefs;
  userName?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
};

const GROUP_ORDER: ThreadGroup[] = ['Today', 'Yesterday', 'This Week', 'Older'];

export function ChatSidebar({
  threads,
  activeThreadId,
  loading,
  prefs,
  userName,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onTogglePin,
}: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const visible = threads.filter((t) => !prefs.hiddenIds.includes(t.id));
  const sorted = [...visible].sort((a, b) => {
    const aPinned = prefs.pinnedIds.includes(a.id) ? 1 : 0;
    const bPinned = prefs.pinnedIds.includes(b.id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const grouped = GROUP_ORDER.map((label) => ({
    label,
    items: sorted.filter((t) => groupThreadsByDate(t.updatedAt) === label),
  })).filter((g) => g.items.length > 0);

  const displayTitle = (thread: ChatThread) =>
    prefs.titleOverrides[thread.id] || thread.title || 'Untitled chat';

  return (
    <aside className="flex h-full min-h-0 w-[280px] shrink-0 flex-col border-r border-emerald-100 bg-white/80 backdrop-blur-sm">
      <div className="p-4 border-b border-emerald-50">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-emerald-500 shadow-emerald transition-all duration-200 hover:-translate-y-0.5"
        >
          New Chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {loading && <p className="text-xs text-gray-400 px-2">Loading conversations...</p>}
        {grouped.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 mb-2">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((thread) => {
                const active = thread.id === activeThreadId;
                const pinned = prefs.pinnedIds.includes(thread.id);
                return (
                  <div key={thread.id} className="relative group">
                    {renamingId === thread.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => {
                          if (renameValue.trim()) onRename(thread.id, renameValue.trim());
                          setRenamingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (renameValue.trim()) onRename(thread.id, renameValue.trim());
                            setRenamingId(null);
                          }
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="w-full rounded-xl border border-emerald-300 px-3 py-2 text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelect(thread.id)}
                        className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                          active
                            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                            : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <MessageSquare className={`h-4 w-4 mt-0.5 shrink-0 ${active ? 'text-emerald-600' : 'text-gray-400'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                              {displayTitle(thread)}
                              {pinned && <Pin className="h-3 w-3 text-emerald-500 fill-emerald-500" />}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{formatTimeOnly(thread.updatedAt)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuId(menuId === thread.id ? null : thread.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white text-gray-400 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </button>
                    )}
                    {menuId === thread.id && (
                      <div className="absolute right-2 top-10 z-20 w-36 rounded-xl border border-gray-100 bg-white shadow-lg py-1 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(thread.id);
                            setRenameValue(displayTitle(thread));
                            setMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onTogglePin(thread.id);
                            setMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <Pin className="h-3.5 w-3.5" /> {pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(thread.id);
                            setMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-emerald-50">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50/70 border border-emerald-100 px-3 py-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
            {(userName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{userName || 'User'}</p>
            <p className="text-[11px] text-emerald-600">Operations AI</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
