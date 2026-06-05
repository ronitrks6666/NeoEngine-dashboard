import { Link } from 'react-router-dom';
import { NeoEngineLogo } from '@/components/NeoEngineLogo';
import { useAuth } from '@/hooks/useAuth';
import { NEOENGINE_APK_ROUTE } from '@/constants/downloads';
import { LEGAL_COMPANY_NAME } from '@/constants/legal';
import { Download } from 'lucide-react';

function dashboardPath(token: string | null, role: string | null): string {
  if (!token) return '/login';
  if (role === 'SUPER_ADMIN') return '/super-admin/dashboard';
  return '/owner/dashboard';
}

interface LegalMarketingShellProps {
  title: string;
  children: React.ReactNode;
  /** Footer-style meta under H1. Omit for default legal line; pass string or false to override/hide. */
  metaLine?: string | false | null;
}

/**
 * Shell for public legal pages: matches landing emerald/stone theme and nav patterns.
 */
export function LegalMarketingShell({ title, children, metaLine }: LegalMarketingShellProps) {
  const { token, role } = useAuth();

  return (
    <div className="min-h-screen bg-emerald-50">
      <nav className="sticky top-0 z-50 border-b border-emerald-300/30 bg-emerald-50/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.55)]">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <NeoEngineLogo size={36} />
            <span className="font-bold text-xl text-slate-900">NeoEngine</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 text-sm sm:text-base flex-wrap justify-end">
            <Link
              to="/privacy-policy"
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms-of-service"
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Terms
            </Link>
            <Link
              to={dashboardPath(token, role)}
              className="px-3 sm:px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-colors whitespace-nowrap"
            >
              {token ? 'Dashboard' : 'Log in'}
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            {title}
          </h1>
          {metaLine !== false && metaLine !== null && (
            <p className="text-sm text-slate-500 mb-10">
              {typeof metaLine === 'string' ? (
                metaLine
              ) : (
                <>
                  Last updated: June 6, 2026. NeoEngine is operated by {LEGAL_COMPANY_NAME} (&quot;we&quot;,
                  &quot;us&quot;, &quot;our&quot;).
                </>
              )}
            </p>
          )}
          <div className="rounded-2xl border border-emerald-100 bg-white shadow-emerald p-6 sm:p-10 text-slate-700 space-y-8">
            {children}
          </div>
        </div>
      </main>

      <footer className="px-4 sm:px-6 py-10 border-t border-emerald-100 bg-white mt-auto">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <Link to="/" className="flex items-center gap-2">
            <NeoEngineLogo size={24} />
            <span className="font-semibold text-slate-900">NeoEngine</span>
          </Link>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/privacy-policy" className="hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
            <Link
              to={NEOENGINE_APK_ROUTE}
              className="inline-flex items-center gap-1 text-primary font-medium hover:text-primary-dark"
            >
              <Download className="h-4 w-4" />
              Android APK
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
