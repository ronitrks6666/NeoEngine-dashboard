import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, LayoutGrid } from 'lucide-react';

export type TasksViewMode = 'my-tasks' | 'all-tasks';

interface TasksViewSwitchProps {
  value: TasksViewMode;
  onChange: (mode: TasksViewMode) => void;
  myTasksCount?: number;
  className?: string;
}

export function TasksViewSwitch({ value, onChange, myTasksCount, className = '' }: TasksViewSwitchProps) {
  const myRef = useRef<HTMLButtonElement>(null);
  const allRef = useRef<HTMLButtonElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeEl = value === 'my-tasks' ? myRef.current : allRef.current;
    if (!activeEl) return;
    const update = () => setIndicator({ left: activeEl.offsetLeft, width: activeEl.offsetWidth });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [value]);

  return (
    <div
      className={`relative inline-flex w-full max-w-md rounded-2xl border border-emerald-100/90 bg-gradient-to-b from-emerald-50/90 to-white p-1 shadow-sm ${className}`}
      role="tablist"
      aria-label="Task view"
    >
      <div
        className="absolute top-1 bottom-1 rounded-xl bg-white shadow-md shadow-emerald-900/8 ring-1 ring-emerald-100/80 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ left: indicator.left, width: indicator.width }}
        aria-hidden
      />
      <button
        ref={myRef}
        type="button"
        role="tab"
        aria-selected={value === 'my-tasks'}
        onClick={() => onChange('my-tasks')}
        className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
          value === 'my-tasks' ? 'text-emerald-800' : 'text-gray-500 hover:text-emerald-700'
        }`}
      >
        <CalendarCheck className="h-4 w-4 shrink-0" />
        <span>My tasks today</span>
        {typeof myTasksCount === 'number' && myTasksCount > 0 && (
          <span
            className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none transition-colors ${
              value === 'my-tasks' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {myTasksCount}
          </span>
        )}
      </button>
      <button
        ref={allRef}
        type="button"
        role="tab"
        aria-selected={value === 'all-tasks'}
        onClick={() => onChange('all-tasks')}
        className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
          value === 'all-tasks' ? 'text-emerald-800' : 'text-gray-500 hover:text-emerald-700'
        }`}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" />
        <span>All templates</span>
      </button>
    </div>
  );
}
