import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/** Fixed position for a dropdown panel portaled to document.body (avoids modal overflow clipping). */
export function useAnchoredDropdown(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelHeightEstimate = 300
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < panelHeightEstimate && rect.top > panelHeightEstimate;
      const top = openUp ? Math.max(8, rect.top - panelHeightEstimate - 6) : rect.bottom + 6;
      setStyle({
        position: 'fixed',
        left: Math.max(8, rect.left),
        width: Math.min(rect.width, window.innerWidth - 16),
        top,
        zIndex: 10000,
        visibility: 'visible',
      });
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef, panelHeightEstimate]);

  return style;
}
