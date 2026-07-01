import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ActivityEvent } from './operations.data';

type ActivityTimelineProps = {
  events: ActivityEvent[];
};

export const ActivityTimeline = memo(function ActivityTimeline({ events }: ActivityTimelineProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
      className="rounded-[28px] border border-slate-900/[0.05] bg-white p-8 shadow-landing-card transition-shadow duration-300 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
    >
      <h3 className="text-lg font-bold text-slate-900">Today&apos;s Activity</h3>

      <ol className="relative mt-6 space-y-0">
        {events.map((event, index) => (
          <motion.li
            key={event.id}
            initial={reducedMotion ? false : { opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + index * 0.08, duration: 0.4 }}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {index < events.length - 1 && (
              <span
                className="absolute left-[5px] top-3 h-full w-px bg-slate-200"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0F8F68]" aria-hidden="true" />
            <div className="min-w-0 flex-1 rounded-xl px-3 py-2 transition-colors duration-200 hover:bg-slate-50">
              <p className="text-xs font-medium text-slate-400">{event.time}</p>
              <p className="text-sm font-medium text-slate-800">{event.title}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </motion.article>
  );
});
