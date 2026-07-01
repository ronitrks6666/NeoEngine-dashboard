import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { NeoEngineLogo } from '@/components/NeoEngineLogo';

export const QRCodeCard = memo(function QRCodeCard() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="hidden shrink-0 flex-col items-center rounded-2xl bg-white p-[18px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] lg:flex"
      aria-label="Scan QR code to download NeoEngine"
    >
      <div
        className="flex h-[88px] w-[88px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50"
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="h-16 w-16 text-slate-300">
          <rect x="4" y="4" width="18" height="18" rx="2" fill="currentColor" opacity="0.5" />
          <rect x="42" y="4" width="18" height="18" rx="2" fill="currentColor" opacity="0.5" />
          <rect x="4" y="42" width="18" height="18" rx="2" fill="currentColor" opacity="0.5" />
          <rect x="10" y="10" width="6" height="6" fill="white" />
          <rect x="48" y="10" width="6" height="6" fill="white" />
          <rect x="10" y="48" width="6" height="6" fill="white" />
          <rect x="28" y="28" width="8" height="8" fill="currentColor" opacity="0.35" />
        </svg>
      </div>
      <p className="mt-3 text-center text-xs font-semibold text-slate-700">Scan to download</p>
      <div className="mt-2 flex items-center gap-1.5 opacity-80">
        <NeoEngineLogo size={16} />
        <span className="text-[10px] font-bold text-slate-600">NeoEngine</span>
      </div>
    </motion.div>
  );
});
