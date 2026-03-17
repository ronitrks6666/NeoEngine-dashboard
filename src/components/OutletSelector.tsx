import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutletStore } from '@/stores/outletStore';
import { Store, ChevronDown, Plus } from 'lucide-react';

interface OutletSelectorProps {
  className?: string;
}

export function OutletSelector({ className = '' }: OutletSelectorProps) {
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
  if (outlets.length === 1) {
    return (
      <div ref={ref} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 min-w-[180px] px-4 py-2.5 rounded-xl border border-emerald-200 bg-white text-emerald-800 font-medium text-sm hover:border-emerald-300 hover:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 shadow-sm"
        >
          <Store className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="truncate flex-1 text-left">{outlets[0].name}</span>
          <ChevronDown className={`h-4 w-4 text-emerald-600 shrink-0 transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`} />
        </button>
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-lg shadow-emerald-900/10 transition-all duration-200 ease-out origin-top ${
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
          </div>
        </div>
      </div>
    );
  }

  const selectedOutlet = outlets.find((o) => o._id === selectedOutletId);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 min-w-[180px] px-4 py-2.5 rounded-xl border border-emerald-200 bg-white text-emerald-800 font-medium text-sm hover:border-emerald-300 hover:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 shadow-sm"
      >
        <Store className="h-4 w-4 text-emerald-600 shrink-0" />
        <span className="truncate flex-1 text-left">{selectedOutlet?.name ?? 'Select outlet'}</span>
        <ChevronDown
          className={`h-4 w-4 text-emerald-600 shrink-0 transition-transform duration-300 ease-out ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`absolute left-0 right-0 top-full mt-1.5 z-50 overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-lg shadow-emerald-900/10 transition-all duration-200 ease-out origin-top ${
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
        </div>
      </div>
    </div>
  );
}
