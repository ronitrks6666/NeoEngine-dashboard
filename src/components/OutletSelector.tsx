import { useState, useRef, useEffect } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (outlets.length === 0) return null;
  if (outlets.length === 1 && !allowCreate) {
    return (
      <div
        className={`flex h-9 max-w-full items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-2 text-sm font-medium text-emerald-800 shadow-sm sm:h-10 sm:gap-2 sm:px-3 ${className}`}
        title={outlets[0].name}
      >
        <Store className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="hidden min-w-0 truncate md:inline">{outlets[0].name}</span>
      </div>
    );
  }
  if (outlets.length === 1) {
    return (
      <div ref={ref} className={`relative max-w-full ${className}`}>
        <button
          type="button"
          title={outlets[0].name}
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-full max-w-full items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-2 text-sm font-medium text-emerald-800 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50/50 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:h-10 sm:gap-2 sm:px-3"
        >
          <Store className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="hidden min-w-0 flex-1 truncate text-left md:inline">{outlets[0].name}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-emerald-600 transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`}
          />
        </button>
        <div
          className={`absolute left-0 right-0 top-full z-[60] mt-1.5 overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-lg shadow-emerald-900/10 transition-all duration-200 ease-out origin-top ${
            open ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none'
          }`}
        >
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setSelectedOutlet(outlets[0]._id);
                setOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 bg-emerald-50 text-emerald-700 font-medium"
            >
              <Store className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              {outlets[0].name}
            </button>
            {allowCreate && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/owner/outlets?create=1');
              }}
              className="w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 border-t border-emerald-100 mt-1 pt-2"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Create outlet
            </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const selectedOutlet = outlets.find((o) => o._id === selectedOutletId);

  return (
    <div ref={ref} className={`relative max-w-full ${className}`}>
      <button
        type="button"
        title={selectedOutlet?.name ?? 'Select outlet'}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full max-w-full items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-2 text-sm font-medium text-emerald-800 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50/50 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 sm:h-10 sm:gap-2 sm:px-3"
      >
        <Store className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="hidden min-w-0 flex-1 truncate text-left md:inline">
          {selectedOutlet?.name ?? 'Select outlet'}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-emerald-600 transition-transform duration-300 ease-out ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`absolute left-0 right-0 top-full z-[60] mt-1.5 overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-lg shadow-emerald-900/10 transition-all duration-200 ease-out origin-top ${
          open
            ? 'opacity-100 scale-y-100 translate-y-0'
            : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none'
        }`}
      >
        <div className="py-1 max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              setSelectedOutlet(null);
              setOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
              !selectedOutletId
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-gray-600 hover:bg-emerald-50/70 hover:text-emerald-800'
            }`}
          >
            Select outlet
          </button>
          {outlets.map((o) => (
            <button
              key={o._id}
              type="button"
              onClick={() => {
                setSelectedOutlet(o._id);
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${
                selectedOutletId === o._id
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-600 hover:bg-emerald-50/70 hover:text-emerald-800'
              }`}
            >
              <Store className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              {o.name}
            </button>
          ))}
          {allowCreate && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/owner/outlets?create=1');
            }}
            className="w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 border-t border-emerald-100 mt-1 pt-2"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            Create outlet
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
