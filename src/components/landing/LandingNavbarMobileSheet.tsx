import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import {
  CALLBACK_SECTION_HASH,
  handleLandingHashClick,
} from './landing-scroll';
import { LANDING_NAV_ITEMS } from './landing-navbar.config';

type LandingNavbarMobileSheetProps = {
  open: boolean;
  onClose: () => void;
  dashboardHref: string;
  isAuthenticated: boolean;
};

function isInternalRoute(href: string) {
  return href.startsWith('/') && !href.startsWith('//');
}

function SheetLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  if (isInternalRoute(href)) {
    return (
      <Link to={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (handleLandingHashClick(event, href)) {
      onClick();
      return;
    }
    onClick();
  };

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}

export function LandingNavbarMobileSheet({
  open,
  onClose,
  dashboardHref,
  isAuthenticated,
}: LandingNavbarMobileSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    focusable?.[0]?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px] lg:hidden"
            aria-label="Close navigation menu"
            onClick={onClose}
          />

          <motion.div
            ref={panelRef}
            id="landing-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-sm flex-col bg-white shadow-2xl lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
              <span className="text-lg font-semibold text-gray-900">Menu</span>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-6 py-6" aria-label="Mobile primary">
              <ul className="space-y-1">
                {LANDING_NAV_ITEMS.map((item) => (
                  <li key={item.label}>
                    <SheetLink
                      href={item.href ?? item.children?.[0]?.href ?? '#'}
                      className="flex w-full items-center rounded-lg px-3 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={onClose}
                    >
                      {item.label}
                    </SheetLink>
                    {item.children && item.children.length > 0 && (
                      <ul className="mb-2 ml-3 space-y-1 border-l border-emerald-100 pl-3">
                        {item.children.map((child) => (
                          <li key={child.label}>
                            <SheetLink
                              href={child.href}
                              className="block rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-emerald-50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              onClick={onClose}
                            >
                              {child.label}
                            </SheetLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <div className="border-t border-black/5 px-6 py-6">
              {isAuthenticated ? (
                <Link
                  to={dashboardHref}
                  onClick={onClose}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-primary-dark text-base font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-darker hover:shadow-emerald-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <div className="space-y-3">
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="flex h-12 w-full items-center justify-center rounded-lg text-base font-medium text-gray-700 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Login
                  </Link>
                  <a
                    href={CALLBACK_SECTION_HASH}
                    onClick={(event) => {
                      if (handleLandingHashClick(event, CALLBACK_SECTION_HASH, Boolean(reducedMotion))) {
                        onClose();
                      }
                    }}
                    className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-primary-dark text-base font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-darker hover:shadow-emerald-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Book Demo
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
