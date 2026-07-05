import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useOutletStore } from '@/stores/outletStore';
import { Store, ChevronDown, Plus } from 'lucide-react';

interface OutletSelectorProps {
  className?: string;
  /** When false, hides "Create outlet" (e.g. web employees). Default true. */
  allowCreate?: boolean;
}

export function OutletSelector({ className = '', allowCreate = true }: OutletSelectorProps) {
  const { outlets, selectedOutletId, setSelectedOutlet } = useOutletStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const navigate = useNavigate();

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 220),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) requestAnimationFrame(() => updateMenuPosition());
      return next;
    });
  };

  const renderMenu = (children: ReactNode) => {
    if (!open || !menuStyle || typeof document === 'undefined') return null;
    return createPortal(
      <div
        ref={menuRef}
        className="fixed z-[200] overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-lg shadow-emerald-900/10 animate-fade-in"
        style={{ top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
      >
        {children}
      </div>,
      document.body
    );
  };

  if (outlets.length === 0) return null;

  if (outlets.length === 1 && !allowCreate) {
    return (
      <div
        className={`flex h-10 min-w-0 w-full items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-medium text-emerald-800 shadow-sm sm:px-4 ${className}`}
      >
        <Store className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="flex-1 truncate text-left">{outlets[0].name}</span>
      </div>
    );
  }

  const selectedOutlet = outlets.find((o) => o._id === selectedOutletId);
  const displayName =
    outlets.length === 1 ? outlets[0].name : selectedOutlet?.name ?? 'Select outlet';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-10 min-w-0 w-full items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-medium text-emerald-800 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50/50 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:px-4"
      >
        <Store className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="flex-1 truncate text-left">{displayName}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-emerald-600 transition-transform duration-300 ease-out ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {renderMenu(
        <div className="max-h-64 overflow-y-auto py-1" role="listbox">
          {outlets.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                setSelectedOutlet(null);
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                !selectedOutletId
                  ? 'bg-emerald-50 font-medium text-emerald-700'
                  : 'text-gray-600 hover:bg-emerald-50/70 hover:text-emerald-800'
              }`}
            >
              Select outlet
            </button>
          ) : null}
          {outlets.map((o) => (
            <button
              key={o._id}
              type="button"
              onClick={() => {
                setSelectedOutlet(o._id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                selectedOutletId === o._id
                  ? 'bg-emerald-50 font-medium text-emerald-700'
                  : 'text-gray-600 hover:bg-emerald-50/70 hover:text-emerald-800'
              }`}
            >
              <Store className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {o.name}
            </button>
          ))}
          {allowCreate ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/owner/outlets?create=1');
              }}
              className="mt-1 flex w-full items-center gap-2 border-t border-emerald-100 px-4 py-2.5 pt-2 text-left text-sm text-emerald-600 transition-colors hover:bg-emerald-50"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Create outlet
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
