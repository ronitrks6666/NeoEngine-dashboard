import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

const SHOW_THRESHOLD = 400;

export const ScrollToTopButton = memo(function ScrollToTopButton() {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label="Scroll back to top"
          onClick={handleClick}
          initial={{ opacity: 0, scale: 0.75, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.75, y: 12 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          whileHover={reducedMotion ? undefined : { scale: 1.08, y: -2 }}
          whileTap={reducedMotion ? undefined : { scale: 0.95 }}
          className="fixed bottom-7 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.06] transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F8F68] focus-visible:ring-offset-2 sm:bottom-8 sm:right-8"
        >
          <ArrowUp className="h-4 w-4 text-slate-700" strokeWidth={2.5} aria-hidden="true" />
        </motion.button>
      )}
    </AnimatePresence>
  );
});
