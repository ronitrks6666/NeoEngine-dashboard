/** Shared staff attendance status presentation (matches mobile soft-present UX). */

export function staffStatusBadgeClass(status: string): string {
  switch (String(status || '').toLowerCase()) {
    case 'working':
      return 'bg-emerald-100 text-emerald-700';
    case 'break':
      return 'bg-amber-100 text-amber-700';
    case 'soft_present':
      return 'bg-violet-100 text-violet-700';
    case 'absent':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export function staffStatusCardClass(status: string): string {
  switch (String(status || '').toLowerCase()) {
    case 'working':
      return 'bg-emerald-50/50 border-emerald-200';
    case 'break':
      return 'bg-amber-50/50 border-amber-200';
    case 'soft_present':
      return 'bg-violet-50/50 border-violet-200';
    case 'absent':
      return 'bg-red-50/50 border-red-100';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

export function staffStatusLabel(status: string): string {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'soft_present') return 'Proof pending';
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function isSoftPresentStatus(status: string): boolean {
  return String(status || '').toLowerCase() === 'soft_present';
}
