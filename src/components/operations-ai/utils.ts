export function nowIso() {
  return new Date().toISOString();
}

export function formatDateTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatTimeOnly(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(iso?: string) {
  if (!iso) return 'Just now';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function greetingForTime() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function isPersistedThreadId(id?: string) {
  return !!id && /^[a-f0-9]{24}$/i.test(id);
}

export type ThreadGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older';

export function groupThreadsByDate(updatedAt: string): ThreadGroup {
  const d = new Date(updatedAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (d >= startOfToday) return 'Today';
  if (d >= startOfYesterday) return 'Yesterday';
  if (d >= startOfWeek) return 'This Week';
  return 'Older';
}

export function parseNumber(value?: string | number | null) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const MODULE_PREFIX =
  /^(payroll|attendance|tasks|issues|leave|staff|roles|events|outlets|operations summary|combined operations view|absent staff|late staff|present staff|escalated tasks|pending tasks|completed tasks)/i;

/** Strip leading outlet name only — not module labels like "Payroll:" */
export function stripOutletPrefix(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^(.+?):\s*(.+)$/s);
  if (!match) return trimmed;
  const before = match[1].trim();
  const after = match[2].trim();
  if (MODULE_PREFIX.test(before)) return trimmed;
  if (before.length > 60) return trimmed;
  return after;
}

export function extractContextSuffix(text: string) {
  const match = text.match(/\(based on selected outlet:\s*([^,]+),\s*period:\s*([^)]+)\)/i);
  if (!match) return { cleanText: text, context: {} };
  return {
    cleanText: text.replace(match[0], '').trim(),
    context: {
      outlet: match[1].trim(),
      period: match[2].trim(),
    },
  };
}

export function detectDomainFromMeta(meta?: string) {
  const m = String(meta || '').toLowerCase();
  if (m.includes('attendance')) return 'attendance';
  if (m.includes('task')) return 'tasks';
  if (m.includes('payroll')) return 'payroll';
  if (m.includes('issue')) return 'issues';
  if (m.includes('leave')) return 'leave';
  if (m.includes('staff')) return 'staff';
  if (m.includes('role')) return 'roles';
  if (m.includes('event')) return 'events';
  if (m.includes('outlet')) return 'outlet';
  if (m.includes('knowledge') || m.includes('sop')) return 'knowledge';
  if (m.includes('analytics')) return 'analytics';
  return 'generic';
}
