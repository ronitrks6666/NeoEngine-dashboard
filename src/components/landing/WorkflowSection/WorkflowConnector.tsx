import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

type WorkflowConnectorProps = {
  orientation: 'horizontal' | 'vertical';
  animate: boolean;
  index: number;
};

export const WorkflowConnector = memo(function WorkflowConnector({
  orientation,
  animate,
  index,
}: WorkflowConnectorProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  if (orientation === 'horizontal') {
    return (
      <div
        className="relative hidden items-center justify-center self-center px-1 lg:flex"
        aria-hidden="true"
      >
        <svg width="100%" height="24" viewBox="0 0 120 24" preserveAspectRatio="none" className="max-w-[140px]">
          <defs>
            <linearGradient id={`workflow-grad-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0F8F68" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#0F8F68" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.4" />
            </linearGradient>
          </defs>

        <motion.path
          d="M 4 12 L 100 12"
          fill="none"
          stroke={`url(#workflow-grad-${index})`}
          strokeWidth="2"
          strokeLinecap="round"
          initial={shouldAnimate ? { pathLength: 0, opacity: 0.4 } : false}
          animate={shouldAnimate ? { pathLength: 1, opacity: 1 } : undefined}
          transition={{ duration: 0.8, delay: index * 0.2, ease: 'easeOut' }}
        />

          <motion.circle
            cx="50"
            cy="12"
            r="3"
            fill="#0F8F68"
            className={shouldAnimate ? 'workflow-connector-dot' : undefined}
            initial={shouldAnimate ? { opacity: 0 } : false}
            animate={shouldAnimate ? { opacity: 1 } : undefined}
            transition={{ delay: 0.5 + index * 0.2 }}
          />
        </svg>

        <ChevronRight className="absolute right-0 h-4 w-4 text-[#0F8F68]/50" />
      </div>
    );
  }

  return (
    <div className="flex justify-center py-2 lg:hidden" aria-hidden="true">
      <svg width="24" height="48" viewBox="0 0 24 48">
        <defs>
          <linearGradient id={`workflow-vert-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F8F68" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        <motion.path
          d="M 12 4 L 12 40"
          fill="none"
          stroke={`url(#workflow-vert-${index})`}
          strokeWidth="2"
          strokeLinecap="round"
          initial={shouldAnimate ? { pathLength: 0 } : false}
          animate={shouldAnimate ? { pathLength: 1 } : undefined}
          transition={{ duration: 0.6, delay: index * 0.15 }}
        />

        <motion.circle
          cx="12"
          cy="24"
          r="3"
          fill="#0F8F68"
          className={shouldAnimate ? 'workflow-connector-dot' : undefined}
        />
      </svg>
    </div>
  );
});
