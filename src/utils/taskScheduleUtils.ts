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

export function buildScheduleSummary(params: {
  intervalMinutes?: number;
  startTime?: string;
  repeatEndTime?: string;
}): string {
  const from = formatTime12(params.startTime);
  const until = formatTime12(params.repeatEndTime);
  const mins = Number(params.intervalMinutes) || 60;
  const interval = formatIntervalLabel(mins);
  return `Task will repeat every ${interval} between ${from} and ${until}.`;
}
