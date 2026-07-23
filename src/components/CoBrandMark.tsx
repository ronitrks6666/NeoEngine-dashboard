import { NeoEngineLogo } from '@/components/NeoEngineLogo';
import type { BrandProfile } from '@/api/owner';

type Props = {
  brand?: BrandProfile | null;
  className?: string;
  logoSize?: number;
  /** Sidebar (dark green) vs top bar (white). */
  variant?: 'sidebar' | 'header';
};

function resolveLogoSrc(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/api\/?$/, '');
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function NeoEngineWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`whitespace-nowrap font-extrabold tracking-tight ${className}`}>
      <span className="text-slate-900">neo</span>
      <span className="text-primary">Engine</span>
    </span>
  );
}

export function CoBrandMark({ brand, className = '', logoSize = 28, variant = 'sidebar' }: Props) {
  const partnerName = brand?.displayName?.trim() || null;
  const partnerLogo = resolveLogoSrc(brand?.logoUrl);
  const showPartner = Boolean(partnerName || partnerLogo);
  const isHeader = variant === 'header';

  if (isHeader) {
    return (
      <div className={`flex max-w-[min(100%,22rem)] items-center gap-1.5 sm:gap-2 ${className}`}>
        {/* Full wordmark whenever header brand is shown; NE only on very narrow */}
        <NeoEngineLogo size={logoSize} className="shrink-0 lg:hidden" />
        <NeoEngineWordmark className="hidden text-base lg:inline lg:text-lg" />
        {showPartner ? (
          <>
            <span className="shrink-0 font-bold text-slate-400">|</span>
            {partnerLogo ? (
              <img
                src={partnerLogo}
                alt=""
                className="h-7 w-7 shrink-0 rounded-md object-contain sm:h-8 sm:w-8"
              />
            ) : null}
            {partnerName ? (
              <span className="max-w-[7rem] truncate text-sm font-extrabold tracking-tight text-slate-900 sm:max-w-[9rem] lg:text-base">
                {partnerName}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <NeoEngineLogo size={logoSize} className="shrink-0" />
      <span className="truncate text-lg font-extrabold tracking-tight text-emerald-50">neoEngine</span>
      {showPartner ? (
        <>
          <span className="font-bold text-emerald-200/90">|</span>
          {partnerLogo ? (
            <img src={partnerLogo} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
          ) : null}
          {partnerName ? (
            <span className="truncate text-base font-extrabold tracking-tight text-white">{partnerName}</span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
