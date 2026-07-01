import { motion, useReducedMotion } from 'framer-motion';
import type { SidebarNavItem } from './dashboard.data';
import { HERO_DURATION, HERO_EASE } from '@/components/landing/hero.motion';

type DashboardSidebarProps = {
  items: SidebarNavItem[];
};

const iconVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.2 + index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function DashboardSidebar({ items }: DashboardSidebarProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.aside
      initial={reducedMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : HERO_DURATION, delay: reducedMotion ? 0 : 0.25, ease: HERO_EASE }}
      className="flex h-full w-[58px] shrink-0 flex-col rounded-[20px] bg-slate-50 p-2 sm:w-[72px] lg:w-[90px] lg:rounded-3xl lg:p-3"
    >
      <div className="mb-3 flex justify-center lg:mb-4">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-b from-green-600 to-[#0F8F68] text-[10px] font-bold text-white lg:h-9 lg:w-9 lg:rounded-[10px] lg:text-[11px]"
          aria-hidden="true"
        >
          NE
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-4" aria-label="Dashboard navigation preview">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              type="button"
              custom={index}
              variants={iconVariants}
              initial="hidden"
              animate="visible"
              title={item.label}
              className={`group flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors duration-200 lg:px-2 lg:py-2 ${
                item.active
                  ? 'bg-[#DDF7EE] text-[#0F8F68]'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              <Icon
                className={`h-4 w-4 shrink-0 lg:h-[18px] lg:w-[18px] ${
                  item.active ? 'text-[#0F8F68]' : 'text-slate-500 group-hover:text-slate-700'
                }`}
                aria-hidden="true"
              />
              <span className="hidden text-[9px] font-medium leading-none lg:block">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </motion.aside>
  );
}
