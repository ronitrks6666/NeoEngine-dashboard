import { useState, useRef, useEffect, useMemo } from 'react';
import { DayPicker, UI, SelectionState, DayFlag } from 'react-day-picker';
import { format, startOfDay, addMonths } from 'date-fns';
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

/**
 * Emerald-themed single-date picker (YYYY-MM-DD) using react-day-picker.
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
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => parseYMD(value), [value]);
  const selectedRangeStart = useMemo(() => parseYMD(rangeValue?.start), [rangeValue?.start]);
  const selectedRangeEnd = useMemo(() => parseYMD(rangeValue?.end), [rangeValue?.end]);
  const min = minDate ? startOfDay(minDate) : undefined;
  const initialStartMonth = selectedRangeStart ?? min ?? new Date();
  const initialEndMonth = selectedRangeEnd ?? addMonths(selectedRangeStart ?? min ?? new Date(), 1);
  const [startMonth, setStartMonth] = useState<Date>(initialStartMonth);
  const [endMonth, setEndMonth] = useState<Date>(initialEndMonth);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (mode === 'range' && open) {
      setStartMonth(selectedRangeStart ?? min ?? new Date());
      setEndMonth(selectedRangeEnd ?? addMonths(selectedRangeStart ?? min ?? new Date(), 1));
    }
  }, [mode, open, selectedRangeStart, selectedRangeEnd, min]);

  const classNames = useMemo(
    () => ({
      [UI.Root]: 'rdp-root-emerald p-0',
      [UI.Months]: 'flex gap-4',
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
      [SelectionState.selected]: 'bg-emerald-600 text-white hover:bg-emerald-600 rounded-xl font-semibold shadow-sm',
    }),
    []
  );

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
        return d ? format(d, 'EEEE, d MMM yyyy') : start;
      }
      const startDate = parseYMD(start);
      const endDate = parseYMD(end);
      if (startDate && endDate) {
        return `${format(startDate, 'd MMM yyyy')} - ${format(endDate, 'd MMM yyyy')}`;
      }
      return `${start} - ${end}`;
    }
    return selected ? format(selected, 'EEEE, d MMM yyyy') : placeholder;
  }, [mode, placeholder, rangeValue?.start, rangeValue?.end, selected]);

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
        <span className={mode === 'range' ? 'font-medium text-gray-900' : selected ? 'font-medium text-gray-900' : 'text-gray-400'}>
          {buttonLabel}
        </span>
        <CalendarIcon className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-[70] mt-2 w-[min(42rem,calc(100vw-1rem))] rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl shadow-emerald-950/10 ring-1 ring-black/5"
          role="dialog"
          aria-label="Choose date"
        >
          {mode === 'range' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Start date</p>
                    <p className="text-xs text-gray-500">Choose the first day in the range</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setStartMonth((month) => addMonths(month, -1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Previous month for start date"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartMonth((month) => addMonths(month, 1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Next month for start date"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <DayPicker
                  mode="single"
                  selected={selectedRangeStart}
                  month={startMonth}
                  onMonthChange={setStartMonth}
                  onSelect={(d) => {
                    if (!d) return;
                    const nextStart = format(startOfDay(d), 'yyyy-MM-dd');
                    const currentEnd = selectedRangeEnd ? format(startOfDay(selectedRangeEnd), 'yyyy-MM-dd') : nextStart;
                    const nextEnd = currentEnd < nextStart ? nextStart : currentEnd;
                    onRangeChange?.({ start: nextStart, end: nextEnd });
                  }}
                  disabled={min ? { before: min } : undefined}
                  classNames={classNames}
                  components={{
                    Nav: () => null,
                    Chevron: ({ orientation }) =>
                      orientation === 'left' ? (
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      ),
                  }}
                />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">End date</p>
                    <p className="text-xs text-gray-500">Choose the last day in the range</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEndMonth((month) => addMonths(month, -1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Previous month for end date"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndMonth((month) => addMonths(month, 1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Next month for end date"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <DayPicker
                  mode="single"
                  selected={selectedRangeEnd}
                  month={endMonth}
                  onMonthChange={setEndMonth}
                  onSelect={(d) => {
                    if (!d) return;
                    const nextEnd = format(startOfDay(d), 'yyyy-MM-dd');
                    const currentStart = selectedRangeStart ? format(startOfDay(selectedRangeStart), 'yyyy-MM-dd') : nextEnd;
                    const nextStart = nextEnd < currentStart ? nextEnd : currentStart;
                    onRangeChange?.({ start: nextStart, end: nextEnd });
                  }}
                  disabled={min ? { before: min } : undefined}
                  classNames={classNames}
                  components={{
                    Nav: () => null,
                    Chevron: ({ orientation }) =>
                      orientation === 'left' ? (
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      ),
                  }}
                />
              </div>
            </div>
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
              classNames={classNames}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === 'left' ? (
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  ),
              }}
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
            <button
              type="button"
              onClick={selectToday}
              disabled={!!min && startOfDay(new Date()) < min}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
