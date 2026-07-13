import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { ProblemCard } from './ProblemCard';
import { PROBLEMS, TRADITIONAL_TOOLS } from './why-neoengine.data';

export const TraditionalStack = memo(function TraditionalStack() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.25 } }}
      className="flex h-full flex-col rounded-[28px] border border-slate-900/[0.05] bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.05)] md:p-8"
    >
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Old Way</p>
        <h3 className="mt-2 text-xl font-bold text-slate-900">Traditional Workforce Operations</h3>
        <p className="mt-1 text-sm text-slate-500">Disconnected tools create disconnected teams.</p>
      </header>

      <div className="relative flex-1">
        {TRADITIONAL_TOOLS.map((tool, index) => (
          <div key={tool.id} className="relative">
            {index > 0 && (
              <div className="flex justify-center py-1" aria-hidden="true">
                <div className="h-4 w-px border-l border-dashed border-slate-300" />
              </div>
            )}
            <ProblemCard tool={tool} />
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-red-100 bg-red-50/80 p-5">
        <div className="mb-3 flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <p className="text-sm font-bold">Problems</p>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROBLEMS.map((problem) => (
            <li key={problem} className="flex items-center gap-2 text-xs font-medium text-red-700/90">
              <span className="h-1 w-1 rounded-full bg-red-400" aria-hidden="true" />
              {problem}
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  );
});
