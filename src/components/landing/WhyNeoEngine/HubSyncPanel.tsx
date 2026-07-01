import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowRightLeft,
  Building2,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const SYNC_STATS = [
  { id: 'modules', label: 'Modules Linked', value: '8/8', icon: Zap },
  { id: 'latency', label: 'Sync Latency', value: '<2s', icon: RefreshCw },
  { id: 'uptime', label: 'Platform Uptime', value: '99.9%', icon: ShieldCheck },
  { id: 'events', label: 'Events Today', value: '1,240+', icon: Activity },
] as const;

const LIVE_MODULES = [
  { name: 'Attendance', status: 'Synced' },
  { name: 'Payroll', status: 'Synced' },
  { name: 'Tasks', status: 'Synced' },
  { name: 'Inventory', status: 'Synced' },
  { name: 'Analytics', status: 'Live' },
  { name: 'Face Verify', status: 'Active' },
] as const;

const RECENT_ACTIVITY = [
  { id: '1', time: 'Just now', text: 'Payroll synced across 6 outlets' },
  { id: '2', time: '2 min ago', text: '12 attendance punches verified' },
  { id: '3', time: '5 min ago', text: 'Inventory thresholds updated for Koramangala' },
  { id: '4', time: '8 min ago', text: 'AI flagged 2 overdue opening tasks' },
] as const;

const PLATFORM_BENEFITS = [
  {
    id: 'single',
    title: 'Single source of truth',
    description: 'Staff, shifts, and payroll stay aligned without duplicate entry.',
    icon: ArrowRightLeft,
  },
  {
    id: 'outlets',
    title: 'Multi-outlet visibility',
    description: 'Compare outlet health and compliance from one live dashboard.',
    icon: Building2,
  },
] as const;

export const HubSyncPanel = memo(function HubSyncPanel() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="mt-6 flex flex-1 flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        {SYNC_STATS.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.id}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="rounded-2xl border border-emerald-100/80 bg-white/90 px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#0F8F68]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {stat.label}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-white to-emerald-50/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0F8F68]">
          Real-time module sync
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LIVE_MODULES.map((mod) => (
            <div
              key={mod.name}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2"
            >
              <span className="truncate text-xs font-medium text-slate-700">{mod.name}</span>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-[#0F8F68]">
                {mod.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        {PLATFORM_BENEFITS.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <motion.div
              key={benefit.id}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.08 }}
              className="rounded-2xl border border-emerald-100/80 bg-white px-4 py-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0F8F68]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{benefit.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{benefit.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-emerald-100/80 bg-white/95 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Recent platform activity
        </p>
        <ul className="mt-3 space-y-2.5">
          {RECENT_ACTIVITY.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5"
            >
              <span className="text-xs leading-relaxed text-slate-700">{item.text}</span>
              <span className="shrink-0 text-[10px] font-medium text-slate-400">{item.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});
