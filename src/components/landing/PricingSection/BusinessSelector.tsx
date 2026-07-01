import { memo, useCallback } from 'react';

type Option = {
  id: string;
  label: string;
  badge?: string;
};

type BusinessSelectorProps<T extends string> = {
  label: string;
  options: Option[];
  value: T;
  onChange: (value: T) => void;
  name: string;
};

export const BusinessSelector = memo(function BusinessSelector<T extends string>({
  label,
  options,
  value,
  onChange,
  name,
}: BusinessSelectorProps<T>) {
  const handleSelect = useCallback(
    (id: T) => () => onChange(id),
    [onChange],
  );

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-800">{label}</legend>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              name={name}
              onClick={handleSelect(option.id as T)}
              className={`relative inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-[transform,border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2 ${
                selected
                  ? 'border-[#0F8F68] bg-emerald-50 text-[#0F8F68] shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {option.label}
              {option.badge && (
                <span className="rounded-full bg-[#0F8F68] px-2 py-0.5 text-[10px] font-bold text-white">
                  {option.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}) as <T extends string>(props: BusinessSelectorProps<T>) => React.ReactElement;
