import { suggestionsForDomain } from './suggestions';

type Props = {
  domain: string;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function SuggestionChips({ domain, onSelect, disabled }: Props) {
  const items = suggestionsForDomain(domain);
  return (
    <div className="flex flex-wrap gap-2 mt-3 animate-fade-in">
      {items.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(s)}
          className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 transition-all duration-200 disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
