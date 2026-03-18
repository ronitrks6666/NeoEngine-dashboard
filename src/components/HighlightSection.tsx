import { forwardRef } from 'react';

interface HighlightSectionProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps content with id="section-{id}" for voice navigation highlighting.
 * Add CSS for .voice-highlight (e.g. ring, pulse) in your global styles.
 */
export const HighlightSection = forwardRef<HTMLDivElement, HighlightSectionProps>(
  function HighlightSection({ id, children, className = '' }, ref) {
    return (
      <div
        ref={ref}
        id={`section-${id}`}
        className={className}
        data-section-id={id}
      >
        {children}
      </div>
    );
  }
);
