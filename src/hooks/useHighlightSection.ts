import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const HIGHLIGHT_DURATION_MS = 4000;
const POLL_INTERVAL_MS = 200;
const MAX_WAIT_MS = 10000;

/**
 * Reads ?highlight=sectionId from URL. Waits for the element to appear (data load),
 * scrolls to it, adds highlight class for 4 seconds, then clears the param.
 */
export function useHighlightSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const lastHighlightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!highlightId) return;
    if (lastHighlightRef.current === highlightId) return;
    lastHighlightRef.current = highlightId;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let highlightTimer: ReturnType<typeof setTimeout> | null = null;
    const startTime = Date.now();

    const applyHighlight = (el: HTMLElement) => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('voice-highlight');
      highlightTimer = setTimeout(() => {
        el.classList.remove('voice-highlight');
        lastHighlightRef.current = null;
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('highlight');
          return next;
        }, { replace: true });
      }, HIGHLIGHT_DURATION_MS);
    };

    const tryFindAndHighlight = () => {
      const el = document.getElementById(`section-${highlightId}`);
      if (el) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        applyHighlight(el);
        return true;
      }
      return false;
    };

    const run = () => {
      if (tryFindAndHighlight()) return;
      pollTimer = setInterval(() => {
        if (tryFindAndHighlight() || Date.now() - startTime > MAX_WAIT_MS) {
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
        }
      }, POLL_INTERVAL_MS);
    };

    const raf = requestAnimationFrame(() => {
      run();
    });

    return () => {
      cancelAnimationFrame(raf);
      if (pollTimer) clearInterval(pollTimer);
      if (highlightTimer) clearTimeout(highlightTimer);
    };
  }, [highlightId, setSearchParams]);
}
