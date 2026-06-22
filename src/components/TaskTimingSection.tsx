import type { Control, FieldValues, Path, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Clock, Timer } from 'lucide-react';
import { TimePickerField } from '@/components/TimePickerField';

type TimingFields = {
  startTime?: string;
  timeLimitMinutes?: number;
};

type Props<T extends FieldValues & TimingFields> = {
  control: Control<T>;
  register: UseFormRegister<T>;
};

export function TaskTimingSection<T extends FieldValues & TimingFields>({ control, register }: Props<T>) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
        <Clock className="h-4 w-4" /> Time settings
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-2">
          <label className="block text-sm font-medium text-gray-800">Start time</label>
          <p className="text-xs text-gray-500">When this task becomes active each day</p>
          <Controller
            name={'startTime' as Path<T>}
            control={control}
            render={({ field }) => (
              <TimePickerField
                value={field.value ?? ''}
                onChange={field.onChange}
                use12Hour
                variant="inline"
                placeholder="Pick start time"
              />
            )}
          />
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-2">
          <label className="block text-sm font-medium text-gray-800 flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-emerald-600" />
            Time limit (mins) to complete within
          </label>
          <p className="text-xs text-gray-500">Deadline after start time for escalation</p>
          <input
            type="number"
            min={1}
            {...register('timeLimitMinutes' as Path<T>, { valueAsNumber: true })}
            placeholder="e.g. 30"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>
    </section>
  );
}
