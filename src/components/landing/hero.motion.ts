export const HERO_EASE = [0.22, 1, 0.36, 1] as const;

export const HERO_DURATION = 0.7;

export function heroFadeUp(reduced: boolean | null) {
  if (reduced) {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    };
  }
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: HERO_DURATION, ease: HERO_EASE },
  };
}

export function heroStagger(reduced: boolean | null, delay = 0.15) {
  if (reduced) {
    return {
      variants: {
        hidden: {},
        visible: { transition: { staggerChildren: 0 } },
      },
      initial: false as const,
      animate: 'visible' as const,
    };
  }
  return {
    variants: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { delay, duration: HERO_DURATION, staggerChildren: 0.08, ease: HERO_EASE },
      },
    },
    initial: 'hidden' as const,
    animate: 'visible' as const,
  };
}
