import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

function parseHHmm(value: string | undefined): { h: number; m: number } | null {
  const v = (value ?? '').trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

function toHHmm(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function to12Hour(h24: number): { h: number; period: 'AM' | 'PM' } {
  if (h24 === 0) return { h: 12, period: 'AM' };
  if (h24 < 12) return { h: h24, period: 'AM' };
  if (h24 === 12) return { h: 12, period: 'PM' };
  return { h: h24 - 12, period: 'PM' };
}

function from12Hour(h12: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

const QUICK_TIMES = ['06:00', '09:00', '12:00', '14:00', '18:00', '20:00'];
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export interface TimePickerFieldProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  use12Hour?: boolean;
  placeholder?: string;
  /** `inline` embeds the picker (best in modals). `field` uses a trigger button. */
  variant?: 'field' | 'inline';
}

function TimePickerPanel({
  value,
  onChange,
  use12Hour,
  onDone,
}: {
  value: string;
  onChange: (next: string) => void;
  use12Hour: boolean;
  onDone?: () => void;
}) {
  const parsed = parseHHmm(value);
  const currentH = parsed?.h ?? -1;
  const currentM = parsed?.m ?? -1;
  const { h: display12H, period } = use12Hour && parsed ? to12Hour(currentH) : { h: 12, period: 'AM' as const };

  const setParts = (h24: number, m: number) => {
    onChange(toHHmm(h24, m));
  };

  const handleHour = (h12: number) => {
    const m = currentM >= 0 ? currentM : 0;
    const h24 = use12Hour ? from12Hour(h12, period) : h12;
    setParts(h24, m);
  };

  const handleMinute = (m: number) => {
    const h = currentH >= 0 ? currentH : use12Hour ? from12Hour(12, period) : 9;
    setParts(h, m);
  };

  const handlePeriod = (p: 'AM' | 'PM') => {
    if (!use12Hour) return;
    const h12 = parsed ? display12H : 9;
    const m = currentM >= 0 ? currentM : 0;
    setParts(from12Hour(h12, p), m);
  };

  const selectedHour = use12Hour ? (parsed ? display12H : null) : parsed ? currentH : null;
  const selectedMin = parsed ? Math.round(currentM / 5) * 5 : null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Quick pick</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TIMES.map((t) => {
            const active = value === t;
            const label = use12Hour && parseHHmm(t)
              ? (() => {
                  const p = parseHHmm(t)!;
                  const { h, period: per } = to12Hour(p.h);
                  return `${h}:${String(p.m).padStart(2, '0')} ${per}`;
                })()
              : t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t);
                  onDone?.();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Custom time</p>
        <div className={`grid gap-3 ${use12Hour ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5 text-center">Hour</p>
            <div className="grid grid-cols-3 gap-1 max-h-28 overflow-y-auto pr-0.5">
              {(use12Hour ? HOURS_12 : Array.from({ length: 24 }, (_, i) => i)).map((h) => {
                const label = use12Hour ? String(h) : String(h).padStart(2, '0');
                const active = selectedHour === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHour(h)}
                    className={`py-1.5 rounded-lg text-xs font-bold tabular-nums ${
                      active ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5 text-center">Min</p>
            <div className="grid grid-cols-3 gap-1 max-h-28 overflow-y-auto">
              {MINUTES.map((m) => {
                const active = selectedMin === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinute(m)}
                    className={`py-1.5 rounded-lg text-xs font-bold tabular-nums ${
                      active ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
          {use12Hour && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5 text-center">Period</p>
              <div className="flex flex-col gap-1.5">
                {(['AM', 'PM'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePeriod(p)}
                    className={`py-2.5 rounded-lg text-sm font-bold ${
                      period === p ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {onDone && (
        <div className="flex gap-2 pt-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                onDone();
              }}
              className="flex-1 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onDone}
            className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export function TimePickerField({
  value,
  onChange,
  disabled,
  className = '',
  id,
  use12Hour = false,
  placeholder = 'Select time',
  variant = 'field',
}: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const parsed = parseHHmm(value);
  const displayLabel = (() => {
    if (!parsed) return '';
    if (use12Hour) {
      const { h, period } = to12Hour(parsed.h);
      return `${h}:${String(parsed.m).padStart(2, '0')} ${period}`;
    }
    return toHHmm(parsed.h, parsed.m);
  })();

  useEffect(() => {
    if (variant === 'inline') return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [variant]);

  if (variant === 'inline') {
    return (
      <div id={id} className={className}>
        {displayLabel && (
          <p className="text-sm font-semibold text-emerald-700 tabular-nums mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {displayLabel}
          </p>
        )}
        <TimePickerPanel value={value} onChange={onChange} use12Hour={use12Hour} />
      </div>
    );
  }

  return (
    <div id={id} ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm transition-all ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white shadow-sm'
            : 'border-gray-200 bg-white hover:border-emerald-400 hover:shadow-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Clock className={`h-4 w-4 shrink-0 ${open ? 'text-emerald-600' : 'text-gray-400'}`} />
          <span className={`truncate ${displayLabel ? 'text-gray-900 font-semibold tabular-nums' : 'text-gray-400 font-normal'}`}>
            {displayLabel || placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180 text-emerald-600' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[70] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 p-3 w-full min-w-[280px]">
            <TimePickerPanel value={value} onChange={onChange} use12Hour={use12Hour} onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
