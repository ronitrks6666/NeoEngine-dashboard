import { X } from 'lucide-react';
import type { ParsedContext } from './types';

type Props = {
  context: ParsedContext;
  onRemove: (key: keyof ParsedContext) => void;
};

export function ContextChips({ context, onRemove }: Props) {
  const chips: Array<{ key: keyof ParsedContext; label: string; value: string }> = [];
  if (context.employee) chips.push({ key: 'employee', label: 'Employee', value: context.employee });
  if (context.outlet) chips.push({ key: 'outlet', label: 'Outlet', value: context.outlet });
  if (context.period) chips.push({ key: 'period', label: 'Period', value: context.period });

  if (!chips.length) return null;

  return (
    <div className="px-4 py-2 border-t border-emerald-50 bg-emerald-50/30">
      <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-800"
          >
            <span className="font-medium text-emerald-600">{chip.label}</span>
            {chip.value}
            <button
              type="button"
              onClick={() => onRemove(chip.key)}
              className="p-0.5 rounded-full hover:bg-emerald-100 text-emerald-500"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
