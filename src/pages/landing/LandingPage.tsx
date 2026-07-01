import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { NeoEngineLogo } from '@/components/NeoEngineLogo';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { Hero } from '@/components/landing/Hero';
import { TrustMetrics } from '@/components/landing/TrustMetrics';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { OperationsCommandCenter } from '@/components/landing/OperationsCommandCenter';
import { WhyNeoEngine } from '@/components/landing/WhyNeoEngine';
import { CustomerSuccess } from '@/components/landing/CustomerSuccess';
import { PricingSection } from '@/components/landing/PricingSection';
import { WorkflowSection } from '@/components/landing/WorkflowSection';
import { DownloadAppSection } from '@/components/landing/DownloadAppSection';
import { ScrollToTopButton } from '@/components/landing/ScrollToTopButton';
// Uncomment to enable neon tubes cursor effect
// import { TubesCursor } from '@/components/ui/tube-cursor';
import { LEGAL_COMPANY_NAME } from '@/constants/legal';

const DEMO_VIDEO_EMBED_URL = 'https://www.youtube.com/embed/vMDQaVT1ZVg?autoplay=1&rel=0';

export function LandingPage() {
  const [showDemoVideo, setShowDemoVideo] = useState(false);

  useEffect(() => {
    if (!showDemoVideo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDemoVideo(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [showDemoVideo]);

  useEffect(() => {
    const openDemoFromHash = () => {
      if (window.location.hash === '#demo') {
        setShowDemoVideo(true);
      }
    };

    const onHashNavigate = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (id === 'demo') {
        setShowDemoVideo(true);
      }
    };

    openDemoFromHash();
    window.addEventListener('hashchange', openDemoFromHash);
    window.addEventListener('landing:hash-navigate', onHashNavigate as EventListener);
    return () => {
      window.removeEventListener('hashchange', openDemoFromHash);
      window.removeEventListener('landing:hash-navigate', onHashNavigate as EventListener);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-emerald-50">
      <LandingNavbar />

      <main className="relative z-10">
        <Hero onWatchDemo={() => setShowDemoVideo(true)} />

        <TrustMetrics />

        <FeaturesSection />

        <OperationsCommandCenter />

        <WhyNeoEngine />

        <CustomerSuccess />

        <PricingSection />

        <WorkflowSection />

        <DownloadAppSection />

        <footer id="contact" className="scroll-mt-[90px] border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-10 py-14">
            {/* Top row */}
            <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
              {/* Brand */}
              <div className="flex flex-col gap-3">
                <Link to="/" className="flex items-center gap-2.5 w-fit">
                  <NeoEngineLogo size={30} />
                  <span className="text-lg font-bold tracking-tight text-slate-900">NeoEngine</span>
                </Link>
                <p className="max-w-[260px] text-sm leading-relaxed text-slate-500">
                  One operating system for every restaurant outlet. Attendance, payroll, tasks and more, live.
                </p>
              </div>

              {/* Links */}
              <div className="grid grid-cols-2 gap-x-16 gap-y-2 sm:grid-cols-3">
                <div className="flex flex-col gap-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Product</p>
                  <a href="#product" className="text-sm text-slate-600 transition-colors hover:text-[#0F8F68]">Features</a>
                  <a href="#pricing" className="text-sm text-slate-600 transition-colors hover:text-[#0F8F68]">Pricing</a>
                  <a href="#download" className="text-sm text-slate-600 transition-colors hover:text-[#0F8F68]">Download App</a>
                </div>
                <div className="flex flex-col gap-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Company</p>
                  <Link to="/contact" className="text-sm text-slate-600 transition-colors hover:text-[#0F8F68]">Contact</Link>
                  <Link to="/privacy-policy" className="text-sm text-slate-600 transition-colors hover:text-[#0F8F68]">Privacy Policy</Link>
                  <Link to="/terms-of-service" className="text-sm text-slate-600 transition-colors hover:text-[#0F8F68]">Terms of Service</Link>
                </div>
                <div className="flex flex-col gap-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Support</p>
                  <Link to="/contact" className="text-sm text-slate-600 transition-colors hover:text-[#0F8F68]">Help & Contact</Link>
                  <Link to="/account-deletion" className="text-sm text-slate-600 transition-colors hover:text-[#0F8F68]">Delete Account</Link>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-8 sm:flex-row">
              <p className="text-sm text-slate-400">
                © {new Date().getFullYear()} {LEGAL_COMPANY_NAME}. All rights reserved.
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-[#0F8F68]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#0F8F68]" />
                </span>
                All systems operational
              </span>
            </div>
          </div>
        </footer>
      </main>

      {/* Scroll-to-top FAB */}
      <ScrollToTopButton />

      {showDemoVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="NeoEngine product demo video"
          onClick={() => setShowDemoVideo(false)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl bg-slate-900 p-2 sm:p-3 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowDemoVideo(false)}
              className="absolute -top-3 -right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
              aria-label="Close demo video"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                src={DEMO_VIDEO_EMBED_URL}
                title="YouTube video player"
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
