import { useEffect, useState } from 'react';

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function useCountUp(
  target: number,
  enabled: boolean,
  duration = 1800,
  decimals = 0,
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setValue(0);
      return;
    }

    let frame = 0;
    let start: number | null = null;

    const tick = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const next = target * eased;
      const factor = 10 ** decimals;
      setValue(Math.round(next * factor) / factor);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, duration, decimals]);

  return value;
}

export function formatCountUpValue(
  value: number,
  suffix = '',
  prefix = '',
  decimals = 0,
): string {
  const formatted =
    decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  return `${prefix}${formatted}${suffix}`;
}
