import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, Zap } from 'lucide-react';
import { getSiteSearchMatches, type AppRole } from '@/data/siteSearchIndex';

type SiteSearchTypeaheadProps = {
  role: AppRole;
  className?: string;
};

/**
 * Bootstrap-style typeahead: static index only (no API) — minimal CPU, no extra network load.
 */
export function SiteSearchTypeahead({ role, className = '' }: SiteSearchTypeaheadProps) {
  const navigate = useNavigate();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(() => getSiteSearchMatches(query, role), [query, role]);

  useEffect(() => {
    setActiveIndex(0);
  }, [matches]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [close]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      setQuery('');
      close();
      inputRef.current?.blur();
    },
    [navigate, close]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && matches.length) {
      setOpen(true);
    }
    if (!matches.length) {
      if (e.key === 'Escape') close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = matches[activeIndex];
      if (item) go(item.path);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  const showPanel = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <label htmlFor={listId + '-input'} className="sr-only">
        Site search — jump to a page
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600/60"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={listId + '-input'}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId + '-listbox'}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search pages…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full min-w-[12rem] max-w-md rounded-xl border border-emerald-200/90 bg-white py-2 pl-9 pr-16 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <kbd
          className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-emerald-100 bg-emerald-50/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-700 sm:flex"
          aria-hidden
        >
          <span className="text-[9px]">Ctrl</span>
          <span>K</span>
        </kbd>
      </div>

      {showPanel && (
        <div
          id={listId + '-listbox'}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-auto rounded-xl border border-emerald-100 bg-white py-1 shadow-lg shadow-emerald-950/10 ring-1 ring-black/5"
        >
          <div className="flex items-center gap-1.5 border-b border-emerald-50 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-emerald-700/80">
            <Zap className="h-3.5 w-3.5" aria-hidden />
            Site search
          </div>
          {matches.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">No matching pages</div>
          ) : (
            matches.map((item, i) => (
              <button
                key={item.path}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors ${
                  i === activeIndex ? 'bg-emerald-50' : 'hover:bg-gray-50'
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(item.path)}
              >
                <span className="font-semibold text-gray-900">{item.title}</span>
                <span className="line-clamp-2 text-xs text-gray-500">{item.subtitle}</span>
              </button>
            ))
          )}
          {matches.length > 0 && (
            <div className="flex items-center gap-1 border-t border-emerald-50 px-3 py-2 text-[11px] text-gray-400">
              <CornerDownLeft className="h-3 w-3" aria-hidden />
              Enter to open
            </div>
          )}
        </div>
      )}
    </div>
  );
}
