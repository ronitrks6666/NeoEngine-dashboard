import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { SearchableSelectOption } from './SearchableSelect';

type MultiSearchableSelectProps = {
  values: string[];
  onChange: (values: string[]) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  noOptionsText?: string;
  disabled?: boolean;
  className?: string;
};

export function MultiSearchableSelect({
  values,
  onChange,
  options,
  placeholder = 'Choose…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  noOptionsText = 'Nothing to choose yet',
  disabled = false,
  className = '',
}: MultiSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(s) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(s))
    );
  }, [options, q]);

  const selectedLabels = useMemo(
    () =>
      values
        .map((v) => options.find((o) => o.value === v)?.label)
        .filter(Boolean) as string[],
    [values, options]
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQ('');
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggle = (id: string) => {
    if (values.includes(id)) onChange(values.filter((v) => v !== id));
    else onChange([...values, id]);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex min-h-[2.75rem] w-full items-center justify-between gap-2 rounded-xl border border-emerald-200/90 bg-white px-3 py-2 text-left text-sm shadow-sm hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-50"
      >
        <span className="min-w-0 flex-1 truncate text-gray-900">
          {selectedLabels.length > 0 ? selectedLabels.join(', ') : <span className="text-gray-400">{placeholder}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-emerald-600/70 ${open ? 'rotate-180' : ''}`} />
      </button>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => {
            const label = options.find((o) => o.value === v)?.label ?? v;
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800"
              >
                {label}
                <button type="button" onClick={() => toggle(v)} className="text-emerald-600 hover:text-emerald-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {open && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1.5 overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-lg">
          <div className="border-b border-emerald-50 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500/60" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-emerald-100 bg-emerald-50/30 py-2 pl-9 pr-3 text-sm"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {options.length === 0 ? (
              <li className="px-3 py-3 text-center text-sm text-gray-500">{noOptionsText}</li>
            ) : filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-sm text-gray-500">{emptyText}</li>
            ) : (
              filtered.map((o) => {
                const checked = values.includes(o.value);
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => toggle(o.value)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-emerald-50 ${checked ? 'bg-emerald-50/80' : ''}`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                        }`}
                      >
                        {checked ? '✓' : ''}
                      </span>
                      <span>
                        <span className="font-medium text-gray-900">{o.label}</span>
                        {o.subtitle ? <span className="block text-xs text-gray-500">{o.subtitle}</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
