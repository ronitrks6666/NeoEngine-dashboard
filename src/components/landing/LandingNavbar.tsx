import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LandingNavbarBrand } from './LandingNavbarBrand';
import { LandingNavbarNavLink } from './LandingNavbarNavLink';
import { LandingNavbarMobileSheet } from './LandingNavbarMobileSheet';
import { LANDING_NAV_ITEMS } from './landing-navbar.config';
import {
  CALLBACK_SECTION_HASH,
  handleLandingHashClick,
} from './landing-scroll';

function landingDashboardPath(token: string | null, role: string | null): string {
  if (!token) return '/login';
  if (role === 'SUPER_ADMIN') return '/super-admin/dashboard';
  return '/owner/dashboard';
}

function useNavbarScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}

export function LandingNavbar() {
  const { token, role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useNavbarScrolled(20);
  const reducedMotion = useReducedMotion();
  const dashboardHref = landingDashboardPath(token, role);
  const isAuthenticated = Boolean(token);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`sticky top-0 z-50 h-[82px] border-b border-black/5 bg-white/[0.82] backdrop-blur-[18px] transition-shadow duration-300 ${
          scrolled ? 'shadow-[0_8px_30px_rgba(0,0,0,0.06)]' : ''
        }`}
      >
        <div className="mx-auto flex h-full max-w-[1760px] items-center justify-between gap-4 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-10">
          <LandingNavbarBrand />

          <nav className="hidden justify-center lg:flex" aria-label="Primary">
            <ul className="flex items-center gap-10">
              {LANDING_NAV_ITEMS.map((item) => (
                <li key={item.label}>
                  <LandingNavbarNavLink item={item} />
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center justify-end gap-4">
              <div className="hidden items-center gap-6 lg:flex">
                {isAuthenticated ? (
                  <Link
                    to={dashboardHref}
                    className="group inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-primary-dark px-6 text-[15px] font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-darker hover:shadow-emerald-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Go to Dashboard
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-[15px] font-medium text-gray-700 transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md px-1"
                    >
                      Login
                    </Link>
                    <a
                      href={CALLBACK_SECTION_HASH}
                      onClick={(event) =>
                        handleLandingHashClick(event, CALLBACK_SECTION_HASH, Boolean(reducedMotion))
                      }
                      className="group inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-primary-dark px-6 text-[15px] font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-darker hover:shadow-emerald-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      Book Demo
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </a>
                  </>
                )}
              </div>

              <button
                type="button"
                id="landing-mobile-nav-trigger"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-black/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
                aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileOpen}
                aria-controls="landing-mobile-nav"
                onClick={() => setMobileOpen((prev) => !prev)}
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
        </div>
      </motion.header>

      <LandingNavbarMobileSheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        dashboardHref={dashboardHref}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}
