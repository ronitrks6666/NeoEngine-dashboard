import { motion, useReducedMotion } from 'framer-motion';

const BARS = [68, 82, 74, 90, 88, 92, 85];

export function AttendanceIllustration() {
  const reducedMotion = useReducedMotion();
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = 0.92;

  return (
    <motion.div
      className="flex h-full items-center justify-center gap-8"
      animate={reducedMotion ? undefined : { y: [0, -4, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="8" />
          <motion.circle
            cx="44" cy="44" r={radius}
            fill="none"
            stroke="url(#attendanceGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reducedMotion ? undefined : { strokeDashoffset: circumference }}
            whileInView={{ strokeDashoffset: circumference * (1 - progress) }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
          <defs>
            <linearGradient id="attendanceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#0F8F68" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-900">
          92%
        </span>
      </div>

      <div className="flex h-24 items-end gap-1.5" aria-hidden="true">
        {BARS.map((h, i) => (
          <motion.div
            key={i}
            className="w-3 rounded-t-md bg-gradient-to-t from-[#0F8F68] to-[#22C55E]"
            initial={reducedMotion ? undefined : { height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.06, duration: 0.5 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
