import { useMemo, useState, useEffect } from 'react';
import type { Control, FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Calendar, Clock } from 'lucide-react';
import { SearchableSelect } from '@/components/SearchableSelect';
import { CalendarDateField } from '@/components/CalendarDateField';
import { ModernTimeSelect } from '@/components/ModernTimeSelect';
import {
  FREQUENCY_CHIPS,
  TIME_WINDOW_PRESETS,
  type FrequencyChipId,
  inferFrequencyChip,
  buildScheduleSummary,
  getNextRunTimes,
} from '@/utils/taskScheduleUtils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const REPEAT_OPTIONS = [
  { value: 'daily', label: 'Every day', subtitle: 'Repeats daily' },
  { value: 'specific-days', label: 'Specific weekdays', subtitle: 'Pick Sun–Sat' },
  { value: 'onetime', label: 'One time only', subtitle: 'Single calendar date' },
];

const SHIFT_OPTIONS = [
  { value: 'Both', label: 'Both shifts', subtitle: 'Day & night staff' },
  { value: 'Day', label: 'Day shift', subtitle: 'Morning & afternoon' },
  { value: 'Night', label: 'Night shift', subtitle: 'Evening & overnight' },
];

type ScheduleFields = {
  taskType: string;
  specificDate?: string;
  specificDays?: number[];
  shiftType: string;
  startTime?: string;
  repeatEndTime?: string;
  multipleTimesPerDay: boolean;
  intervalMinutes?: number;
};

type Props<T extends FieldValues & ScheduleFields> = {
  form: UseFormReturn<T>;
  control: Control<T>;
  minOneTimeDate?: Date;
};

export function TaskScheduleCard<T extends FieldValues & ScheduleFields>({
  form,
  control,
  minOneTimeDate,
}: Props<T>) {
  const taskType = form.watch('taskType' as Path<T>) as string;
  const startTime = form.watch('startTime' as Path<T>) as string | undefined;
  const repeatEndTime = form.watch('repeatEndTime' as Path<T>) as string | undefined;
  const intervalMinutes = form.watch('intervalMinutes' as Path<T>) as number | undefined;
  const specificDays = form.watch('specificDays' as Path<T>) as number[] | undefined;

  const [activeChip, setActiveChip] = useState<FrequencyChipId>(() => inferFrequencyChip(intervalMinutes));
  const [customValue, setCustomValue] = useState(String(intervalMinutes && intervalMinutes % 60 === 0 ? intervalMinutes / 60 : intervalMinutes || 1));
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours'>(
    intervalMinutes && intervalMinutes >= 60 && intervalMinutes % 60 === 0 ? 'hours' : 'minutes'
  );

  useEffect(() => {
    setActiveChip(inferFrequencyChip(intervalMinutes));
    const n = Number(intervalMinutes) || 60;
    if (n >= 60 && n % 60 === 0) {
      setCustomValue(String(n / 60));
      setCustomUnit('hours');
    } else {
      setCustomValue(String(n));
      setCustomUnit('minutes');
    }
  }, [intervalMinutes]);

  const selectChip = (chipId: FrequencyChipId, minutes?: number) => {
    setActiveChip(chipId);
    form.setValue('multipleTimesPerDay' as Path<T>, true as never);
    if (chipId !== 'custom' && minutes != null) {
      form.setValue('intervalMinutes' as Path<T>, minutes as never);
    }
  };

  const applyCustomInterval = (raw: string, unit: 'minutes' | 'hours') => {
    const n = Math.max(1, parseInt(raw, 10) || 1);
    const mins = unit === 'hours' ? n * 60 : n;
    form.setValue('multipleTimesPerDay' as Path<T>, true as never);
    form.setValue('intervalMinutes' as Path<T>, mins as never);
  };

  const applyTimeWindow = (start: string, end: string) => {
    form.setValue('startTime' as Path<T>, start as never);
    form.setValue('repeatEndTime' as Path<T>, end as never);
  };

  const summary = useMemo(
    () =>
      buildScheduleSummary({
        intervalMinutes: Number(intervalMinutes) || 60,
        startTime,
        repeatEndTime,
      }),
    [intervalMinutes, startTime, repeatEndTime]
  );

  const nextRuns = useMemo(
    () => getNextRunTimes(startTime, repeatEndTime, Number(intervalMinutes) || 60, 5),
    [startTime, repeatEndTime, intervalMinutes]
  );

  const activeWindowPreset = useMemo(
    () => TIME_WINDOW_PRESETS.find((p) => p.start === startTime && p.end === repeatEndTime)?.id,
    [startTime, repeatEndTime]
  );

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Schedule</h3>
            <p className="text-xs text-gray-500">Set start, end, and repeat in seconds</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5">
        {/* Calendar repeat */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Repeat</label>
            <Controller
              name={'taskType' as Path<T>}
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value ?? 'daily'}
                  onChange={field.onChange}
                  options={REPEAT_OPTIONS}
                  placeholder="Every day"
                  showSearch={false}
                />
              )}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Active during</label>
            <Controller
              name={'shiftType' as Path<T>}
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value ?? 'Both'}
                  onChange={field.onChange}
                  options={SHIFT_OPTIONS}
                  placeholder="Both shifts"
                  showSearch={false}
                />
              )}
            />
          </div>
        </div>

        {taskType === 'onetime' && (
          <div className="animate-slide-up">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Date</label>
            <Controller
              name={'specificDate' as Path<T>}
              control={control}
              render={({ field }) => (
                <CalendarDateField
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  minDate={minOneTimeDate}
                  placeholder="Choose date"
                />
              )}
            />
          </div>
        )}

        {taskType === 'specific-days' && (
          <div className="animate-slide-up">
            <label className="mb-2 block text-sm font-medium text-gray-700">Weekdays</label>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((label, d) => {
                const selected = (specificDays ?? []).includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      const current = specificDays ?? [];
                      const next = selected ? current.filter((x) => x !== d) : [...current, d].sort();
                      form.setValue('specificDays' as Path<T>, next as never);
                    }}
                    className={`min-h-[44px] min-w-[44px] rounded-xl text-sm font-semibold transition-all ${
                      selected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-300'
                    }`}
                  >
                    {label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Time window */}
        <div className="space-y-4 border-t border-gray-100 pt-5">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Quick presets</p>
            <div className="flex flex-wrap gap-2">
              {TIME_WINDOW_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyTimeWindow(p.start, p.end)}
                  className={`min-h-[44px] rounded-xl px-4 text-sm font-medium transition-all ${
                    activeWindowPreset === p.id
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <div className="min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Start time</label>
              <Controller
                name={'startTime' as Path<T>}
                control={control}
                render={({ field }) => (
                  <ModernTimeSelect
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="6:00"
                    ariaLabel="Start time"
                  />
                )}
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">End time</label>
              <Controller
                name={'repeatEndTime' as Path<T>}
                control={control}
                render={({ field }) => (
                  <ModernTimeSelect
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="2:00"
                    ariaLabel="End time"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Frequency */}
        <div className="space-y-3 border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-700">Frequency</p>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_CHIPS.map((chip) => {
              const active = activeChip === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => selectChip(chip.id, chip.minutes)}
                  className={`min-h-[44px] min-w-[52px] rounded-xl px-4 text-sm font-semibold tabular-nums transition-all ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                      : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {activeChip === 'custom' && (
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:flex-row sm:items-center animate-slide-up">
              <input
                type="number"
                min={1}
                max={customUnit === 'hours' ? 24 : 1440}
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  applyCustomInterval(e.target.value, customUnit);
                }}
                className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-4 text-center text-lg font-bold tabular-nums text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:w-28"
                aria-label="Custom repeat interval"
              />
              <SearchableSelect
                value={customUnit}
                onChange={(u) => {
                  const unit = u as 'minutes' | 'hours';
                  setCustomUnit(unit);
                  applyCustomInterval(customValue, unit);
                }}
                options={[
                  { value: 'minutes', label: 'Minutes' },
                  { value: 'hours', label: 'Hours' },
                ]}
                showSearch={false}
                className="sm:flex-1"
              />
            </div>
          )}
        </div>

        {/* Live summary + next runs */}
        <div className="space-y-4 rounded-xl border border-gray-200 bg-slate-50/80 p-4">
          <p className="text-sm leading-relaxed text-gray-800">{summary}</p>
          {nextRuns.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Next runs</p>
              <ul className="space-y-1.5">
                {nextRuns.map((t, i) => (
                  <li key={`${t}-${i}`} className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <span className="text-gray-400">•</span>
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
