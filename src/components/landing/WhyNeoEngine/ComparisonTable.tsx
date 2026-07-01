import { memo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ChevronDown } from 'lucide-react';
import { COMPARISON_ROWS } from './why-neoengine.data';

function ComparisonRowDesktop({
  row,
  index,
}: {
  row: (typeof COMPARISON_ROWS)[number];
  index: number;
}) {
  const reducedMotion = useReducedMotion();
  const TradIcon = row.traditionalIcon;
  const NeoIcon = row.neoIcon;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={reducedMotion ? undefined : { backgroundColor: 'rgba(236, 253, 245, 0.35)' }}
      className="grid grid-cols-2 items-center gap-4 border-b border-slate-50 px-8 py-5 last:border-0"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <TradIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium text-slate-400">{row.category}</p>
          <p className="text-sm font-semibold text-slate-600">{row.traditional}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <ArrowDown className="h-4 w-4 rotate-[-90deg] text-slate-300" aria-hidden="true" />
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#0F8F68]">
          <NeoIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium text-[#0F8F68]/70">{row.category}</p>
          <p className="text-sm font-bold text-slate-900">{row.neoengine}</p>
        </div>
      </div>
    </motion.div>
  );
}

export const ComparisonTable = memo(function ComparisonTable() {
  const reducedMotion = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="mt-[72px]"
    >
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[28px] border border-slate-900/[0.05] bg-white shadow-landing-card lg:block">
        <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/80 px-8 py-4 text-sm font-bold text-slate-900">
          <span>Traditional</span>
          <span className="text-[#0F8F68]">NeoEngine</span>
        </div>
        {COMPARISON_ROWS.map((row, index) => (
          <ComparisonRowDesktop key={row.id} row={row} index={index} />
        ))}
      </div>

      {/* Tablet: horizontal scroll */}
      <div className="hidden overflow-x-auto pb-2 md:block lg:hidden">
        <div className="flex min-w-max gap-4">
          {COMPARISON_ROWS.map((row) => {
            const TradIcon = row.traditionalIcon;
            const NeoIcon = row.neoIcon;
            return (
              <div
                key={`scroll-${row.id}`}
                className="w-56 shrink-0 rounded-2xl border border-slate-900/[0.05] bg-white p-5 shadow-landing-card"
              >
                <p className="text-sm font-bold text-slate-900">{row.category}</p>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <TradIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  <p className="text-xs text-slate-600">{row.traditional}</p>
                </div>
                <div className="my-2 flex justify-center">
                  <ArrowDown className="h-4 w-4 text-[#0F8F68]" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                  <NeoIcon className="h-4 w-4 shrink-0 text-[#0F8F68]" aria-hidden="true" />
                  <p className="text-xs font-bold text-slate-900">{row.neoengine}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: accordion */}
      <div className="space-y-3 md:hidden">
        {COMPARISON_ROWS.map((row) => {
          const open = openId === row.id;
          const TradIcon = row.traditionalIcon;
          const NeoIcon = row.neoIcon;
          return (
            <div
              key={row.id}
              className="overflow-hidden rounded-2xl border border-slate-900/[0.05] bg-white shadow-landing-card"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-inset"
                onClick={() => setOpenId(open ? null : row.id)}
                aria-expanded={open}
              >
                <span className="text-sm font-bold text-slate-900">{row.category}</span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {open && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <TradIcon className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <div>
                      <p className="text-[10px] font-medium uppercase text-slate-400">Traditional</p>
                      <p className="text-sm text-slate-600">{row.traditional}</p>
                    </div>
                  </div>
                  <div className="my-3 flex justify-center">
                    <ArrowDown className="h-4 w-4 text-[#0F8F68]" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
                    <NeoIcon className="h-4 w-4 text-[#0F8F68]" aria-hidden="true" />
                    <div>
                      <p className="text-[10px] font-medium uppercase text-[#0F8F68]/70">NeoEngine</p>
                      <p className="text-sm font-bold text-slate-900">{row.neoengine}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});
