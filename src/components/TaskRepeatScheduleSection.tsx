import type { Control, UseFormReturn, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Clock, RefreshCw } from 'lucide-react';
import { TimePickerField } from '@/components/TimePickerField';

type RepeatFields = {
  multipleTimesPerDay: boolean;
  intervalMinutes?: number;
  repeatEndTime?: string;
};

type Props<T extends FieldValues & RepeatFields> = {
  form: UseFormReturn<T>;
  control: Control<T>;
};

export function TaskRepeatScheduleSection<T extends FieldValues & RepeatFields>({ form, control }: Props<T>) {
  const multiple = form.watch('multipleTimesPerDay' as Path<T>);

  return (
    <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 via-white to-white p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <RefreshCw className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Multiple times per day?</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Repeats between start time and end time at the interval you set
            </p>
          </div>
        </div>
        <div className="flex shrink-0 rounded-xl border border-gray-200 bg-white p-1 shadow-sm self-start">
          <button
            type="button"
            onClick={() => form.setValue('multipleTimesPerDay' as Path<T>, false as never)}
            className={`min-w-[3.25rem] px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              !multiple ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => form.setValue('multipleTimesPerDay' as Path<T>, true as never)}
            className={`min-w-[3.25rem] px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              multiple ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Yes
          </button>
        </div>
      </div>

      {multiple && (
        <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-emerald-100/90 animate-slide-up">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600">Repeat every (minutes)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                step={5}
                {...form.register('intervalMinutes' as Path<T>, { valueAsNumber: true })}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-900 tabular-nums focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="120"
              />
              <span className="text-xs font-medium text-gray-400 shrink-0">min</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              Repeat until
            </label>
            <Controller
              name={'repeatEndTime' as Path<T>}
              control={control}
              render={({ field }) => (
                <TimePickerField
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  use12Hour
                  variant="inline"
                  placeholder="End time"
                />
              )}
            />
          </div>
        </div>
      )}
    </section>
  );
}
