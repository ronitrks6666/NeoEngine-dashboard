import { Loader2 } from 'lucide-react';
import type { ThinkingCardData } from './types';

type Props = {
  data: ThinkingCardData;
};

export function ThinkingCard({ data }: Props) {
  const latest = data.steps[data.steps.length - 1] || 'Thinking';

  return (
    <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white shadow-sm animate-fade-in overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Thinking...</p>
          <p className="text-xs text-emerald-600 mt-0.5 animate-pulse">{latest}</p>
        </div>
      </div>
      <div className="px-5 pb-4 space-y-2">
        {data.steps.map((step: string, i: number) => (
          <div key={`${step}-${i}`} className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-emerald-400/70 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, ((i + 1) / data.steps.length) * 100)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
