import { Search } from 'lucide-react';

type ListSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
};

/**
 * Owner list pages: emerald-styled search field (no emoji). Pair with useDebouncedValue for API queries.
 */
export function ListSearchBar({
  value,
  onChange,
  placeholder,
  className = '',
  id = 'list-search',
  'aria-label': ariaLabel = 'Search',
}: ListSearchBarProps) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500/70"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        className="w-full rounded-xl border border-emerald-200/90 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>
  );
}
