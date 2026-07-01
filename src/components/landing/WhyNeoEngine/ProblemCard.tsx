import { memo } from 'react';
import type { TraditionalTool } from './why-neoengine.data';

type ProblemCardProps = {
  tool: TraditionalTool;
};

export const ProblemCard = memo(function ProblemCard({ tool }: ProblemCardProps) {
  const Icon = tool.icon;

  return (
    <div className="relative flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-4 text-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">{tool.label}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{tool.description}</p>
    </div>
  );
});
