import { motion } from 'framer-motion';
import { BarChart3, CheckSquare, Home, Plus, User } from 'lucide-react';
import type { NavItem } from './mobile-mockup.data';

type BottomNavigationProps = {
  items: NavItem[];
};

const NAV_ICONS = {
  home: Home,
  tasks: CheckSquare,
  analytics: BarChart3,
  profile: User,
} as const;

export function BottomNavigation({ items }: BottomNavigationProps) {
  const leftItems = items.slice(0, 2);
  const rightItems = items.slice(2);

  return (
    <motion.nav
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-x-0 bottom-0 border-t border-slate-100 bg-white/95 px-3 pb-3 pt-2 backdrop-blur-sm"
      aria-label="Mobile app navigation preview"
    >
      <div className="relative flex items-end justify-between">
        {leftItems.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <button
              key={item.id}
              type="button"
              className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-transform duration-200 hover:-translate-y-0.5 ${
                item.active ? 'text-[#0F8F68]' : 'text-slate-400'
              }`}
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-5 items-center justify-center rounded-full bg-[#0F8F68] text-white shadow-[0_8px_24px_rgba(15,143,104,0.35)] transition-transform duration-200 hover:scale-[1.02]"
          aria-label="Create new"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </button>

        {rightItems.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          return (
            <button
              key={item.id}
              type="button"
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-slate-400 transition-transform duration-200 hover:-translate-y-0.5 hover:text-slate-600"
              aria-label={item.label}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
