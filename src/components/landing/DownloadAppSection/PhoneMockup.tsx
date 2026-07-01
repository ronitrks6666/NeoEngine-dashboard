import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, CheckSquare, Home, Plus, User, Zap } from 'lucide-react';

const QUICK_ACTIONS = [
  { id: 'attendance', label: 'Clock In', icon: Zap },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
];

const TASKS = [
  { id: '1', label: 'Opening checklist', done: true },
  { id: '2', label: 'Inventory count', done: false },
  { id: '3', label: 'Shift briefing', done: true },
];

export const PhoneMockup = memo(function PhoneMockup() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={reducedMotion ? undefined : { y: [0, -12, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      className="relative mx-auto w-full"
      aria-hidden="true"
    >
      <div className="relative rounded-[42px] border border-white/20 bg-white p-2 shadow-[0_32px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute left-1/2 top-4 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-slate-200" />

        <div className="relative flex h-[min(650px,72vh)] flex-col overflow-hidden rounded-[34px] bg-white pt-10 font-[Inter,Plus_Jakarta_Sans,system-ui,sans-serif]">
          <header className="shrink-0 px-5">
            <p className="text-xs font-medium text-slate-500">Good morning</p>
            <h3 className="text-xl font-bold text-slate-900">Hello, Priya 👋</h3>
          </header>

          <div className="mt-4 shrink-0 px-5">
            <div className="rounded-2xl bg-gradient-to-br from-[#0F8F68] to-[#22C55E] p-4 text-white shadow-[0_8px_24px_rgba(15,143,104,0.25)]">
              <p className="text-xs font-medium text-white/80">Today&apos;s Attendance</p>
              <p className="mt-1 text-3xl font-bold">98%</p>
              <p className="mt-1 text-xs text-white/85">47 of 48 staff checked in</p>
            </div>
          </div>

          <div className="mt-4 flex shrink-0 gap-2 px-5">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700"
                  tabIndex={-1}
                >
                  <Icon className="h-3.5 w-3.5 text-[#0F8F68]" />
                  {action.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-hidden px-5 pb-24">
            <p className="mb-2 text-xs font-bold text-slate-900">Today&apos;s Tasks</p>
            <ul className="space-y-2">
              {TASKS.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-700"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${task.done ? 'bg-[#0F8F68]' : 'bg-slate-300'}`}
                  />
                  {task.label}
                </li>
              ))}
            </ul>
          </div>

          <nav className="absolute inset-x-0 bottom-0 border-t border-slate-100 bg-white/95 px-4 pb-4 pt-2 backdrop-blur-sm">
            <div className="relative flex items-end justify-between">
              {[
                { icon: Home, label: 'Home', active: true },
                { icon: CheckSquare, label: 'Tasks' },
                { icon: BarChart3, label: 'Insights' },
                { icon: User, label: 'Profile' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] font-medium ${
                      item.active ? 'text-[#0F8F68]' : 'text-slate-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                );
              })}
              <span className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-5 items-center justify-center rounded-full bg-[#0F8F68] text-white shadow-[0_8px_24px_rgba(15,143,104,0.4)]">
                <Plus className="h-6 w-6" />
              </span>
            </div>
          </nav>
        </div>
      </div>
    </motion.div>
  );
});
