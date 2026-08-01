import { useState, useRef, useEffect, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { DayPicker, UI, SelectionState, DayFlag } from 'react-day-picker';
import { format, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-day-picker/style.css';

function parseYMD(value?: string): Date | undefined {
  const normalized = value?.trim() ?? '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

export type CalendarDateFieldProps = {
  value?: string;
  onChange?: (ymd: string) => void;
  mode?: 'single' | 'range';
  rangeValue?: { start: string; end: string };
  onRangeChange?: (range: { start: string; end: string }) => void;
  /** Inclusive minimum selectable calendar day (local). */
  minDate?: Date;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
};

function buildBaseClassNames() {
  return {
    [UI.Root]: 'p-0 [--rdp-accent-color:theme(colors.emerald.600)] [--rdp-accent-background-color:theme(colors.emerald.50)]',
    [UI.Months]: 'flex flex-col sm:flex-row gap-6',
    [UI.Month]: 'space-y-3',
    [UI.MonthCaption]: 'flex items-center justify-center relative px-10 py-1',
    [UI.CaptionLabel]: 'text-sm font-semibold text-gray-900',
    [UI.Nav]: 'flex items-center gap-1',
    [UI.PreviousMonthButton]: cn(
      'absolute left-0 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-xl',
      'border border-emerald-200/80 bg-white text-emerald-700 shadow-sm hover:bg-emerald-50 transition-colors'
    ),
    [UI.NextMonthButton]: cn(
      'absolute right-0 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-xl',
      'border border-emerald-200/80 bg-white text-emerald-700 shadow-sm hover:bg-emerald-50 transition-colors'
    ),
    [UI.MonthGrid]: 'w-full border-collapse',
    [UI.Weekdays]: 'flex',
    [UI.Weekday]: 'w-9 text-center text-[11px] font-semibold uppercase tracking-wide text-emerald-700/90',
    [UI.Week]: 'mt-1 flex w-full',
    [UI.Day]: 'relative flex h-9 w-9 items-center justify-center p-0 text-center',
    [UI.DayButton]: cn(
      'h-9 w-9 rounded-xl text-sm font-medium text-gray-700 transition-colors',
      'hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40'
    ),
    [DayFlag.today]: 'font-semibold text-emerald-700',
    [DayFlag.outside]: 'text-gray-300',
    [DayFlag.disabled]: 'text-gray-300 line-through opacity-50 cursor-not-allowed hover:bg-transparent',
  };
}

function buildSingleClassNames() {
  return {
    ...buildBaseClassNames(),
    [SelectionState.selected]:
      '[&>button]:bg-emerald-600 [&>button]:text-white [&>button]:hover:bg-emerald-600 [&>button]:font-semibold [&>button]:shadow-sm',
  };
}

function buildRangeClassNames() {
  return {
    ...buildBaseClassNames(),
    [SelectionState.range_start]:
      'rounded-l-full bg-emerald-100 [&>button]:bg-emerald-600 [&>button]:text-white [&>button]:hover:bg-emerald-600 [&>button]:font-semibold',
    [SelectionState.range_middle]:
      'bg-emerald-100 [&>button]:rounded-none [&>button]:text-emerald-800 [&>button]:hover:bg-emerald-100',
    [SelectionState.range_end]:
      'rounded-r-full bg-emerald-100 [&>button]:bg-emerald-600 [&>button]:text-white [&>button]:hover:bg-emerald-600 [&>button]:font-semibold',
    [SelectionState.selected]:
      '[&>button]:bg-emerald-600 [&>button]:text-white [&>button]:hover:bg-emerald-600 [&>button]:font-semibold',
  };
}

/**
 * Emerald-themed date picker (YYYY-MM-DD) using react-day-picker.
 */
export function CalendarDateField({
  value,
  onChange,
  mode = 'single',
  rangeValue,
  onRangeChange,
  minDate,
  disabled,
  id,
  placeholder = 'Pick a date',
}: CalendarDateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => parseYMD(value), [value]);
  const selectedRangeStart = useMemo(() => parseYMD(rangeValue?.start), [rangeValue?.start]);
  const selectedRangeEnd = useMemo(() => parseYMD(rangeValue?.end), [rangeValue?.end]);
  const min = minDate ? startOfDay(minDate) : undefined;

  const selectedRange = useMemo<DateRange | undefined>(() => {
    if (!selectedRangeStart) return undefined;
    return {
      from: selectedRangeStart,
      to: selectedRangeEnd ?? selectedRangeStart,
    };
  }, [selectedRangeStart, selectedRangeEnd]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      setDraftRange(selectedRange);
    }
  }, [open, selectedRange]);

  const singleClassNames = useMemo(() => buildSingleClassNames(), []);
  const rangeClassNames = useMemo(() => buildRangeClassNames(), []);

  const applyDraftRange = () => {
    if (!draftRange?.from) return;
    const start = format(startOfDay(draftRange.from), 'yyyy-MM-dd');
    const end = draftRange.to ? format(startOfDay(draftRange.to), 'yyyy-MM-dd') : start;
    onRangeChange?.({ start, end });
    setOpen(false);
  };

  const selectToday = () => {
    const t = startOfDay(new Date());
    if (min && t < min) return;
    if (mode === 'range') {
      const today = format(t, 'yyyy-MM-dd');
      onRangeChange?.({ start: today, end: today });
    } else {
      onChange?.(format(t, 'yyyy-MM-dd'));
    }
    setOpen(false);
  };

  const clear = () => {
    if (mode === 'range') {
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
      onRangeChange?.({ start: today, end: today });
    } else {
      onChange?.('');
    }
    setOpen(false);
  };

  const buttonLabel = useMemo(() => {
    if (mode === 'range') {
      const start = rangeValue?.start?.trim();
      const end = rangeValue?.end?.trim();
      if (!start || !end) return placeholder;
      if (start === end) {
        const d = parseYMD(start);
        return d ? format(d, 'EEE, d MMM yyyy') : start;
      }
      const startDate = parseYMD(start);
      const endDate = parseYMD(end);
      if (startDate && endDate) {
        return `${format(startDate, 'd MMM yyyy')} – ${format(endDate, 'd MMM yyyy')}`;
      }
      return `${start} – ${end}`;
    }
    return selected ? format(selected, 'EEEE, d MMM yyyy') : placeholder;
  }, [mode, placeholder, rangeValue?.start, rangeValue?.end, selected]);

  const chevron = ({ orientation }: { orientation?: 'left' | 'right' | 'up' | 'down' }) =>
    orientation === 'left' ? (
      <ChevronLeft className="h-4 w-4" aria-hidden />
    ) : (
      <ChevronRight className="h-4 w-4" aria-hidden />
    );

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200/90 bg-white px-4 py-3 text-left text-sm shadow-sm transition-colors',
          'hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/25',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span
          className={
            mode === 'range'
              ? 'font-medium text-gray-900 truncate'
              : selected
                ? 'font-medium text-gray-900'
                : 'text-gray-400'
          }
        >
          {buttonLabel}
        </span>
        <CalendarIcon className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
      </button>

      {open && (
        <div
          className={cn(
            'absolute top-full z-[70] mt-2 rounded-2xl border border-emerald-100 bg-white p-4 shadow-xl shadow-emerald-950/10 ring-1 ring-black/5',
            mode === 'range'
              ? 'right-0 w-[min(calc(100vw-1.5rem),42rem)]'
              : 'left-0 w-[min(calc(100vw-1.5rem),20rem)]'
          )}
          role="dialog"
          aria-label={mode === 'range' ? 'Choose date range' : 'Choose date'}
        >
          {mode === 'range' ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-emerald-50 pb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    Date range
                  </p>
                  <p className="text-xs text-gray-500">Click a start date, then an end date</p>
                </div>
                {draftRange?.from && (
                  <p className="text-xs font-semibold text-gray-700 text-right">
                    {!draftRange.to || format(draftRange.from, 'yyyy-MM-dd') === format(draftRange.to, 'yyyy-MM-dd')
                      ? format(draftRange.from, 'd MMM yyyy')
                      : `${format(draftRange.from, 'd MMM')} – ${format(draftRange.to, 'd MMM yyyy')}`}
                  </p>
                )}
              </div>
              <DayPicker
                mode="range"
                selected={draftRange}
                onSelect={(range) => {
                  setDraftRange(range);
                  if (range?.from && range?.to) {
                    const start = format(startOfDay(range.from), 'yyyy-MM-dd');
                    const end = format(startOfDay(range.to), 'yyyy-MM-dd');
                    onRangeChange?.({ start, end });
                    setOpen(false);
                  }
                }}
                numberOfMonths={2}
                defaultMonth={selectedRangeStart ?? min ?? new Date()}
                disabled={min ? { before: min } : undefined}
                classNames={rangeClassNames}
                components={{ Chevron: chevron }}
              />
            </>
          ) : (
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={(d) => {
                if (d) {
                  onChange?.(format(startOfDay(d), 'yyyy-MM-dd'));
                  setOpen(false);
                }
              }}
              disabled={min ? { before: min } : undefined}
              defaultMonth={selected ?? min ?? new Date()}
              classNames={singleClassNames}
              components={{ Chevron: chevron }}
            />
          )}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-emerald-50 pt-3">
            <button
              type="button"
              onClick={clear}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800"
            >
              Clear
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectToday}
                disabled={!!min && startOfDay(new Date()) < min}
                className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Today
              </button>
              {mode === 'range' && (
                <button
                  type="button"
                  onClick={applyDraftRange}
                  disabled={!draftRange?.from}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
