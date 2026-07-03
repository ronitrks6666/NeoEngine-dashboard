import type { ReactNode } from 'react';
import { formatRelativeTime } from '../utils';
import type { ParsedContext } from '../types';

type KpiTileProps = {
  label: string;
  value: ReactNode;
  accent?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
};

const accentMap = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  sky: 'bg-sky-50 text-sky-700 border-sky-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
};

export function KpiTile({ label, value, accent = 'emerald' }: KpiTileProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${accentMap[accent]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
    </div>
  );
}

type ResponseCardShellProps = {
  title: string;
  children: ReactNode;
  context?: ParsedContext;
  updatedAt?: string;
  footerExtra?: ReactNode;
};

export function ResponseCardShell({
  title,
  children,
  context,
  updatedAt,
  footerExtra,
}: ResponseCardShellProps) {
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-gray-100 bg-white shadow-sm animate-slide-up overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
      <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/60">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
          {context?.outlet && (
            <span>
              <span className="font-medium text-gray-600">Outlet</span> {context.outlet}
            </span>
          )}
          {context?.period && (
            <span>
              <span className="font-medium text-gray-600">Period</span> {context.period}
            </span>
          )}
          <span>
            <span className="font-medium text-gray-600">Updated</span> {formatRelativeTime(updatedAt)}
          </span>
        </div>
      </div>
      {footerExtra}
    </div>
  );
}
