import { QUICK_ASK_PROMPTS } from './suggestions';

type Props = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function QuickAskChips({ onSelect, disabled }: Props) {
  return (
    <div className="px-4 py-3 border-b border-emerald-50 bg-white/60">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Quick Ask</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_ASK_PROMPTS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(chip.prompt)}
            className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 shadow-sm"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
