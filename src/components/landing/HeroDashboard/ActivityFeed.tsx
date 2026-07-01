import { motion } from 'framer-motion';
import type { ActivityItem } from './dashboard.data';

type ActivityFeedProps = {
  items: ActivityItem[];
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <article className="flex h-[220px] flex-col overflow-hidden rounded-[20px] border border-slate-900/[0.05] bg-white shadow-landing-card lg:h-[260px]">
      <div className="border-b border-slate-100 px-3 py-2.5 lg:px-4 lg:py-3">
        <h3 className="text-xs font-bold text-slate-900 lg:text-sm">Live Activity</h3>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto px-2 py-2 lg:px-3" aria-label="Recent activity">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + index * 0.05, duration: 0.4 }}
            >
              <div className="flex items-center gap-2 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-slate-50 lg:gap-3 lg:px-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDF7EE] text-[#0F8F68]">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-slate-800 lg:text-xs">{item.title}</p>
                  <p className="text-[10px] font-normal text-slate-400">{item.timestamp}</p>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </article>
  );
}
