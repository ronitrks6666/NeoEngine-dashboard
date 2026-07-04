import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { useAnchoredDropdown } from '@/hooks/useAnchoredDropdown';

export type SearchableSelectOption = {
  value: string;
  label: string;
  subtitle?: string;
};

type SearchableSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  noOptionsText?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  /** When false, hides the search box (short lists like shift or hour/minute). */
  showSearch?: boolean;
  /** Override displayed label on the trigger (e.g. formatted time). */
  triggerLabel?: string;
  ariaLabel?: string;
};

/**
 * Combobox-style select with search. No fake "Select…" option — empty value shows placeholder.
 */
export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Choose…',
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  noOptionsText = 'Nothing to choose yet',
  disabled = false,
  allowClear = false,
  className = '',
  showSearch = true,
  triggerLabel,
  ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelStyle = useAnchoredDropdown(open, triggerRef);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(s) ||
        o.value.toLowerCase().includes(s) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(s))
    );
  }, [options, q]);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setQ('');
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex gap-1">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className="flex min-h-[2.75rem] w-full min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
        >
          <span className="min-w-0 flex-1">
            {selected || triggerLabel ? (
              <span className="truncate font-semibold text-gray-900">
                {triggerLabel ?? selected?.label}
              </span>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-emerald-600/70 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-lg shadow-emerald-950/10 ring-1 ring-black/5"
            role="listbox"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {showSearch ? (
              <div className="border-b border-emerald-50 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500/60" />
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-lg border border-emerald-100 bg-emerald-50/30 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            ) : null}
            <ul className="max-h-60 overflow-y-auto py-1">
              {options.length === 0 ? (
                <li className="px-3 py-3 text-center text-sm text-gray-500">{noOptionsText}</li>
              ) : filtered.length === 0 ? (
                <li className="px-3 py-3 text-center text-sm text-gray-500">{emptyText}</li>
              ) : (
                filtered.map((o) => (
                  <li key={o.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === o.value}
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                        setQ('');
                      }}
                      className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50 ${
                        value === o.value ? 'bg-emerald-50/80' : ''
                      }`}
                    >
                      <span className="font-medium text-gray-900">{o.label}</span>
                      {o.subtitle ? <span className="text-xs text-gray-500">{o.subtitle}</span> : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
