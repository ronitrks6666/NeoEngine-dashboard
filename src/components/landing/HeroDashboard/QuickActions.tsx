import { motion } from 'framer-motion';
import type { QuickActionItem } from './dashboard.data';

type QuickActionsProps = {
  actions: QuickActionItem[];
};

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <section aria-label="Quick actions">
      <h3 className="mb-4 text-xs font-semibold text-slate-900 lg:text-sm">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.05, duration: 0.35 }}
              whileHover={{ scale: 1.02 }}
              className="group flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2.5 text-[10px] font-medium text-slate-700 transition-colors duration-200 hover:border-[#0F8F68] hover:bg-[#DDF7EE]/30 hover:text-[#0F8F68] lg:rounded-2xl lg:px-3 lg:py-3 lg:text-xs"
            >
              <Icon
                className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-[#0F8F68] lg:h-4 lg:w-4"
                aria-hidden="true"
              />
              <span className="truncate">{action.label}</span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
