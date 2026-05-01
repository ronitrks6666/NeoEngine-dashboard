import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Scroll Column ─────────────────────────────────────────────────────────────

interface ScrollColumnProps {
  items: Array<{ value: number; label: string }>;
  selected: number;
  onSelect: (v: number) => void;
  height?: number;
}

const ITEM_H = 40;

function ScrollColumn({ items, selected, onSelect, height = 200 }: ScrollColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInternalScroll = useRef(false);
  const selectedIdx = items.findIndex((i) => i.value === selected);

  const scrollTo = useCallback(
    (idx: number, behavior: ScrollBehavior = 'smooth') => {
      const el = containerRef.current;
      if (!el) return;
      isInternalScroll.current = true;
      const target = idx * ITEM_H - (height / 2 - ITEM_H / 2);
      el.scrollTo({ top: Math.max(0, target), behavior });
      // Reset after a bit to allow manual scroll again
      setTimeout(() => { isInternalScroll.current = false; }, 100);
    },
    [height]
  );

  // Scroll to selected on mount and when selected changes
  useEffect(() => {
    if (selectedIdx >= 0) scrollTo(selectedIdx, 'instant' as ScrollBehavior);
  }, [selectedIdx, scrollTo]);

  const handleScroll = useCallback(() => {
    if (isInternalScroll.current) return;
    const el = containerRef.current;
    if (!el) return;
    const center = el.scrollTop + height / 2;
    const idx = Math.round((center - ITEM_H / 2) / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (items[clamped].value !== selected) {
      onSelect(items[clamped].value);
    }
  }, [height, items, selected, onSelect]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="relative flex-1" style={{ height }}>
      {/* Highlight band */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-10 rounded-xl bg-emerald-500/10 border-y-2 border-emerald-400/40"
        style={{ top: height / 2 - ITEM_H / 2, height: ITEM_H }}
      />
      <div
        ref={containerRef}
        className="overflow-y-auto scrollbar-none"
        style={{ height, scrollSnapType: 'y mandatory' }}
      >
        {/* Padding so first/last items can reach center */}
        <div style={{ height: height / 2 - ITEM_H / 2 }} />
        {items.map((item) => (
          <div
            key={item.value}
            onClick={() => {
              onSelect(item.value);
              scrollTo(items.indexOf(item));
            }}
            style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
            className={`flex items-center justify-center cursor-pointer select-none transition-all duration-150 text-sm font-semibold ${
              item.value === selected
                ? 'text-emerald-700 scale-110'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            {item.label}
          </div>
        ))}
        <div style={{ height: height / 2 - ITEM_H / 2 }} />
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export interface TimePickerFieldProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** 12-hour UI with AM/PM; stored value stays 24h HH:mm. */
  use12Hour?: boolean;
  placeholder?: string;
}

export function TimePickerField({
  value,
  onChange,
  disabled,
  className = '',
  id,
  use12Hour = false,
  placeholder = 'Select time',
}: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const parsed = parseHHmm(value);
  const currentH = parsed?.h ?? -1;
  const currentM = parsed?.m ?? -1;

  // Display label
  const displayLabel = (() => {
    if (!parsed) return '';
    if (use12Hour) {
      const { h, period } = to12Hour(currentH);
      return `${h}:${String(currentM).padStart(2, '0')} ${period}`;
    }
    return toHHmm(currentH, currentM);
  })();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Columns
  const hourItems = use12Hour
    ? Array.from({ length: 12 }, (_, i) => {
        const v = i + 1;
        return { value: v, label: String(v).padStart(2, '0') };
      })
    : Array.from({ length: 24 }, (_, i) => ({
        value: i,
        label: String(i).padStart(2, '0'),
      }));

  const minuteItems = Array.from({ length: 12 }, (_, i) => {
    const v = i * 5;
    return { value: v, label: String(v).padStart(2, '0') };
  });

  const { h: display12H, period } = use12Hour && parsed ? to12Hour(currentH) : { h: 12, period: 'AM' as const };

  const handleHourChange = (v: number) => {
    const newH = use12Hour ? from12Hour(v, (period as 'AM' | 'PM')) : v;
    const newM = currentM >= 0 ? currentM : 0;
    onChange(toHHmm(newH, newM));
  };

  const handleMinuteChange = (v: number) => {
    const curH = currentH >= 0 ? currentH : 0;
    onChange(toHHmm(curH, v));
  };

  const handlePeriodChange = (p: 'AM' | 'PM') => {
    if (!parsed) return;
    onChange(toHHmm(from12Hour(display12H, p), currentM));
  };

  return (
    <div id={id} ref={wrapRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm transition-all ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white'
            : 'border-gray-200 bg-gray-50/50 hover:border-emerald-400 hover:bg-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Clock className={`h-4 w-4 shrink-0 ${open ? 'text-emerald-500' : 'text-gray-400'}`} />
        <span className={displayLabel ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {displayLabel || placeholder}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[220px]">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/80" />
              <span className="text-sm font-semibold text-white">
                {displayLabel || 'Pick a time'}
              </span>
            </div>

            {/* Columns */}
            <div className="flex items-stretch divide-x divide-gray-100 p-2">
              {/* Hour */}
              <div className="flex-1 flex flex-col items-center px-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">HH</span>
                <ScrollColumn
                  items={hourItems}
                  selected={use12Hour ? display12H : currentH >= 0 ? currentH : 0}
                  onSelect={handleHourChange}
                  height={160}
                />
              </div>

              {/* Separator */}
              <div className="flex items-center px-2">
                <span className="text-xl font-bold text-gray-300">:</span>
              </div>

              {/* Minute */}
              <div className="flex-1 flex flex-col items-center px-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">MM</span>
                <ScrollColumn
                  items={minuteItems}
                  selected={currentM >= 0 ? Math.round(currentM / 5) * 5 : 0}
                  onSelect={handleMinuteChange}
                  height={160}
                />
              </div>

              {/* AM/PM */}
              {use12Hour && (
                <div className="flex flex-col items-center justify-center gap-1 px-2 pl-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">AM/PM</span>
                  {(['AM', 'PM'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePeriodChange(p)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        period === p
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 pb-3 flex gap-2">
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
