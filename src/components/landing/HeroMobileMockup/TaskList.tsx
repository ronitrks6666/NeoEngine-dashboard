import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TaskItem } from './mobile-mockup.data';

type TaskListProps = {
  title: string;
  tasks: TaskItem[];
};

export function TaskList({ title, tasks }: TaskListProps) {
  return (
    <article className="rounded-2xl border border-slate-900/[0.05] bg-white p-4 shadow-landing-card">
      <h3 className="mb-3 text-xs font-bold text-slate-900">{title}</h3>
      <ul className="space-y-2.5">
        {tasks.map((task, index) => {
          const completed = task.status === 'completed';
          return (
            <motion.li
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.08, duration: 0.4 }}
              className="flex items-center gap-2.5"
            >
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  completed ? 'bg-[#DDF7EE] text-[#0F8F68]' : 'bg-slate-100 text-slate-400'
                }`}
                aria-hidden="true"
              >
                {completed ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                )}
              </span>
              <span
                className={`text-[11px] font-medium ${
                  completed ? 'text-slate-600 line-through' : 'text-slate-800'
                }`}
              >
                {task.label}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </article>
  );
}
