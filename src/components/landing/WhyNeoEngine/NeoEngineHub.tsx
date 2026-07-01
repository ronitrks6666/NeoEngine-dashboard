import { memo, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { ConnectionLine } from './ConnectionLine';
import { HubSyncPanel } from './HubSyncPanel';
import { HUB_NODES } from './why-neoengine.data';

const HUB_CENTER = { x: 50, y: 50 };

export const NeoEngineHub = memo(function NeoEngineHub() {
  const reducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleActivate = useCallback((id: string) => setActiveId(id), []);
  const handleDeactivate = useCallback(() => setActiveId(null), []);

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.25 } }}
      className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#0F8F68]/10 bg-gradient-to-b from-white to-emerald-50/40 p-6 shadow-[0_16px_48px_rgba(15,143,104,0.08)] md:p-8"
    >
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0F8F68]">NeoEngine</p>
        <h3 className="mt-2 text-xl font-bold text-slate-900">NeoEngine Operating System</h3>
        <p className="mt-1 text-sm text-slate-600">Everything connected.</p>
      </header>

      <div className="relative mx-auto flex w-full max-w-[320px] shrink-0 items-center justify-center sm:max-w-[360px]">
        <div className="relative aspect-square w-full">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
          >
            {HUB_NODES.map((node) => (
              <ConnectionLine
                key={`line-${node.id}`}
                x1={HUB_CENTER.x}
                y1={HUB_CENTER.y}
                x2={node.x}
                y2={node.y}
                variant="green"
                animated
                hubInset={10}
                nodeInset={8}
              />
            ))}
          </svg>

          <div
            className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F8F68] to-[#22C55E] text-xs font-bold text-white shadow-[0_8px_24px_rgba(15,143,104,0.35)] md:h-16 md:w-16"
            aria-hidden="true"
          >
            NE
          </div>

          {HUB_NODES.map((node) => {
            const Icon = node.icon;
            const active = activeId === node.id;
            return (
              <button
                key={node.id}
                type="button"
                className={`absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl border bg-white px-2 py-1.5 shadow-sm transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] ${
                  active
                    ? 'scale-110 border-[#0F8F68]/40 shadow-[0_0_16px_rgba(15,143,104,0.25)]'
                    : 'border-emerald-100 hover:scale-105'
                }`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                onMouseEnter={() => handleActivate(node.id)}
                onMouseLeave={handleDeactivate}
                onFocus={() => handleActivate(node.id)}
                onBlur={handleDeactivate}
                aria-label={node.label}
              >
                <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#0F8F68]">
                  {!reducedMotion && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-lg bg-[#22C55E] opacity-20 motion-reduce:animate-none" />
                  )}
                  <Icon className="relative h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="whitespace-nowrap text-[9px] font-semibold text-slate-700">{node.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <HubSyncPanel />

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-emerald-100 bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#0F8F68]" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-800">Everything synced</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0F8F68]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0F8F68]" />
          </span>
          Live
        </span>
      </div>
    </motion.article>
  );
});
