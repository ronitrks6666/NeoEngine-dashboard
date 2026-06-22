import { useEffect, useState } from 'react';
import { parseHHmm, formatHHmm } from '@/utils/taskScheduleUtils';

type Period = 'AM' | 'PM';

type ModernTimeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

function splitTime24(value?: string): { timeText: string; period: Period } {
  const mins = parseHHmm(value);
  if (mins == null) return { timeText: '', period: 'AM' };
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period: Period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { timeText: `${h12}:${String(m).padStart(2, '0')}`, period };
}

function composeTime24(timeText: string, period: Period): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
  if (!m) return null;
  const h12 = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h12 < 1 || h12 > 12 || min < 0 || min > 59) return null;
  const h24 = period === 'AM' ? (h12 === 12 ? 0 : h12) : h12 === 12 ? 12 : h12 + 12;
  return formatHHmm(h24 * 60 + min);
}

function normalizeTimeInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length === 3) return `${digits.slice(0, 1)}:${digits.slice(1)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

/** HH:MM text input with AM/PM toggle. Stores value as 24h "HH:mm". */
export function ModernTimeSelect({
  value,
  onChange,
  placeholder = '6:00',
  id,
  disabled,
  className = '',
  ariaLabel = 'Select time',
}: ModernTimeSelectProps) {
  const [timeText, setTimeText] = useState(() => splitTime24(value).timeText);
  const [period, setPeriod] = useState<Period>(() => splitTime24(value).period);

  useEffect(() => {
    const { timeText: t, period: p } = splitTime24(value);
    setTimeText(t);
    setPeriod(p);
  }, [value]);

  const commit = (text: string, p: Period) => {
    const next = composeTime24(text, p);
    if (next) onChange(next);
  };

  const handleTimeChange = (raw: string) => {
    const formatted = normalizeTimeInput(raw);
    setTimeText(formatted);
    if (/^\d{1,2}:\d{2}$/.test(formatted)) {
      commit(formatted, period);
    }
  };

  const handleTimeBlur = () => {
    if (!timeText.trim()) return;
    const composed = composeTime24(timeText, period);
    if (composed) {
      const { timeText: t } = splitTime24(composed);
      setTimeText(t);
      onChange(composed);
      return;
    }
    const { timeText: t, period: p } = splitTime24(value);
    setTimeText(t);
    setPeriod(p);
  };

  const handlePeriod = (p: Period) => {
    setPeriod(p);
    if (/^\d{1,2}:\d{2}$/.test(timeText)) commit(timeText, p);
  };

  return (
    <div className={`flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={timeText}
        onChange={(e) => handleTimeChange(e.target.value)}
        onBlur={handleTimeBlur}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-h-[44px] w-full min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3.5 text-center text-base font-semibold tabular-nums text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
      />
      <div
        className="flex w-full shrink-0 rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-auto"
        role="group"
        aria-label={`${ariaLabel} AM or PM`}
      >
        {(['AM', 'PM'] as const).map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => handlePeriod(p)}
            className={`min-h-[44px] flex-1 rounded-lg px-4 text-sm font-bold transition-all sm:min-w-[52px] sm:flex-none ${
              period === p
                ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
