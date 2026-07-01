import { memo, useCallback } from 'react';

type PricingSliderProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
};

export const PricingSlider = memo(function PricingSlider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  formatValue = (v) => String(v),
  onChange,
}: PricingSliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800">
          {label}
        </label>
        <span
          className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-bold tabular-nums text-[#0F8F68]"
          aria-live="polite"
        >
          {formatValue(value)}
        </span>
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute top-1/2 h-2 w-full -translate-y-1/2 overflow-hidden rounded-full bg-slate-100"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0F8F68] to-[#22C55E] transition-[width] duration-150 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatValue(value)}
          className="pricing-slider relative z-10 w-full cursor-pointer appearance-none bg-transparent"
        />
      </div>

      <div className="flex justify-between text-[11px] font-medium text-slate-400">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
});
