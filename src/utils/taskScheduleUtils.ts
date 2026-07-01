/** 15-minute time slots and schedule copy for task create/edit modals */

export type FrequencyChipId = '15' | '30' | '60' | '120' | '240' | 'custom';

export const FREQUENCY_CHIPS = [
  { id: '15' as const, label: '15m', minutes: 15 },
  { id: '30' as const, label: '30m', minutes: 30 },
  { id: '60' as const, label: '1h', minutes: 60 },
  { id: '120' as const, label: '2h', minutes: 120 },
  { id: '240' as const, label: '4h', minutes: 240 },
  { id: 'custom' as const, label: 'Custom', minutes: undefined },
] as const;

export const TIME_WINDOW_PRESETS = [
  { id: 'morning', label: 'Morning', start: '06:00', end: '12:00' },
  { id: 'afternoon', label: 'Afternoon', start: '12:00', end: '18:00' },
  { id: 'evening', label: 'Evening', start: '18:00', end: '23:00' },
  { id: 'fullday', label: 'Full Day', start: '06:00', end: '02:00' },
] as const;

export function parseHHmm(value?: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatHHmm(totalMins: number): string {
  const norm = ((totalMins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12(value?: string): string {
  const mins = parseHHmm(value);
  if (mins == null) return '—';
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function buildTimeOptions(stepMinutes = 15): { value: string; label: string; subtitle?: string }[] {
  const out: { value: string; label: string; subtitle?: string }[] = [];
  for (let t = 0; t < 24 * 60; t += stepMinutes) {
    const value = formatHHmm(t);
    out.push({ value, label: formatTime12(value), subtitle: value });
  }
  return out;
}

export const TIME_SELECT_OPTIONS = buildTimeOptions(15);

export function inferFrequencyChip(intervalMinutes?: number): FrequencyChipId {
  const n = Number(intervalMinutes) || 60;
  const match = FREQUENCY_CHIPS.find((c) => c.minutes === n);
  return match ? match.id : 'custom';
}

export function formatIntervalLabel(minutes: number): string {
  if (minutes === 60) return '60 minutes';
  if (minutes % 60 === 0 && minutes > 60) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

export function getNextRunTimes(
  startTime: string | undefined,
  endTime: string | undefined,
  intervalMinutes: number,
  limit = 5
): string[] {
  const start = parseHHmm(startTime);
  if (start == null || !intervalMinutes || intervalMinutes < 1) return [];

  let end = parseHHmm(endTime);
  if (end == null) end = start;

  let endAdj = end;
  if (endAdj <= start) endAdj += 24 * 60;

  const slots: string[] = [];
  for (let t = start; t <= endAdj && slots.length < limit; t += intervalMinutes) {
    slots.push(formatTime12(formatHHmm(t)));
  }
  return slots;
}

/** Progressive display while user types digits (e.g. 715 → 07:15). */
export function formatTypedTimeDisplay(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').slice(0, 4);
  if (!digits) return '';
  if (digits.length <= 2) return digits.padStart(2, '0');
  if (digits.length === 3) {
    const h = digits[0];
    const mm = digits.slice(1).padEnd(2, '0');
    return `${h.padStart(2, '0')}:${mm}`;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

function toNormalizedHHmm(hours: number, minutes: number): string | null {
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || minutes < 0) return null;
  return formatHHmm(hours * 60 + minutes);
}

/**
 * Parse compact digit entry into 24h HH:mm.
 * Examples: 7 → 07:00, 715 → 07:15, 0715 → 07:15, 1930 → 19:30
 */
export function parseFlexibleTimeDigits(raw: string): string | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;

  // Colon input: keep hour/minute intent and normalize overflow (80:70 -> 09:10).
  if (text.includes(':')) {
    const parts = text.split(':');
    const left = (parts[0] ?? '').replace(/[^\d]/g, '');
    const right = (parts[1] ?? '').replace(/[^\d]/g, '');
    if (!left && !right) return null;
    const h = left ? parseInt(left, 10) : 0;
    const m = right ? parseInt(right, 10) : 0;
    return toNormalizedHHmm(h, m);
  }

  const digits = text.replace(/[^\d]/g, '');
  if (!digits) return null;

  let h: number;
  let m: number;
  if (digits.length <= 2) {
    h = parseInt(digits, 10);
    m = 0;
  } else if (digits.length === 3) {
    h = parseInt(digits[0], 10);
    m = parseInt(digits.slice(1), 10);
  } else {
    h = parseInt(digits.slice(0, 2), 10);
    m = parseInt(digits.slice(2, 4), 10);
  }

  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return toNormalizedHHmm(h, m);
}

export function buildScheduleSummary(params: {
  multipleTimesPerDay?: boolean;
  intervalMinutes?: number;
  startTime?: string;
  repeatEndTime?: string;
  timeLimitMinutes?: number;
}): string {
  const at = formatTime12(params.startTime);
  const limit =
    params.timeLimitMinutes && params.timeLimitMinutes > 0
      ? ` Complete within ${params.timeLimitMinutes} minutes.`
      : '';

  if (!params.multipleTimesPerDay) {
    if (at === '—') return `Set a start time for this task.${limit}`;
    return `Task runs once at ${at}.${limit}`;
  }

  const from = formatTime12(params.startTime);
  const until = formatTime12(params.repeatEndTime);
  const mins = Number(params.intervalMinutes) || 60;
  const interval = formatIntervalLabel(mins);
  return `Task repeats every ${interval} between ${from} and ${until}.${limit}`;
}
